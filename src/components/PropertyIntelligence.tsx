import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EpcData {
  rating: string;
  score: number | null;
  date: string | null;
  address: string | null;
  property_type: string | null;
}

interface OsMapData {
  zoom: number;
  tile_x: number;
  tile_y: number;
  pin_x_pct: number;
  pin_y_pct: number;
  image_base64: string;
}

interface ListedBuilding {
  name: string;
  type: string;
  distance_m: number;
}

interface ConservationData {
  conservation_area: boolean;
  listed_buildings: ListedBuilding[];
  feature_count: number;
}

interface GreenSpace {
  name: string;
  type: string;
  distance_m: number;
}

interface IntelligenceData {
  id?: string;
  property_id?: string;
  flood_risk: { zone: string; risk: string } | null;
  broadband_max_speed: string | null;
  broadband_availability: { maxSpeed: number | null; technology: string | null } | null;
  crime_statistics: { total: number; categories: CrimeCategory[] } | null;
  recent_sales: SaleRecord[] | null;
  epc: EpcData | null;
  os_map: OsMapData | null;
  conservation: ConservationData | null;
  green_spaces: GreenSpace[] | null;
  last_updated: string | null;
  schools: SchoolRecord[];
}

interface SchoolRecord {
  id?: string;
  school_name: string | null;
  school_type: string | null;
  ofsted_rating: string | null;
  ofsted_rating_label: string | null;
  distance_miles: number | null;
  phase: string | null;
}

interface SaleRecord {
  price: number | null;
  date: string | null;
  type: string | null;
}

interface CrimeCategory {
  name: string;
  count: number;
}

type BadgeColor = 'green' | 'amber' | 'red' | 'teal' | 'grey';

interface Props {
  /** Seller dashboard: provide propertyId + postcode to call edge function */
  propertyId?: string;
  postcode?: string;
  /** Public pack: provide token to call RPC */
  token?: string;
  isPublic?: boolean;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Badge({ label, color }: { label: string; color: BadgeColor }) {
  const cls: Record<BadgeColor, string> = {
    green: 'bg-[#d1fae5] text-[#065f46] border-[#a7f3d0]',
    amber: 'bg-[#fef3c7] text-[#92400e] border-[#fde68a]',
    red:   'bg-[#fee2e2] text-[#991b1b] border-[#fecaca]',
    teal:  'bg-[var(--teal-050)] text-[var(--teal-900)] border-[var(--border)]',
    grey:  'bg-[#f3f4f6] text-[#6b7280] border-[#e5e7eb]',
  };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cls[color]}`}>
      {label}
    </span>
  );
}

function IntelligenceCard({
  emoji,
  title,
  source,
  loading,
  children,
}: {
  emoji: string;
  title: string;
  source: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden="true">{emoji}</span>
        <h3 className="font-black font-heading text-[var(--teal-900)] text-lg leading-tight">{title}</h3>
      </div>

      <div className="flex-1 min-h-[80px]">
        {loading ? (
          <div className="flex items-center gap-3 text-[var(--muted)]">
            <div className="animate-spin size-5 border-2 border-[var(--teal-600)] border-t-transparent rounded-full shrink-0" />
            <span className="text-sm">Loading…</span>
          </div>
        ) : (
          children
        )}
      </div>

      <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest border-t border-[var(--border)] pt-3 mt-auto">
        Source: {source}
      </p>
    </Card>
  );
}

// ── Colour helpers ────────────────────────────────────────────────────────────

function floodColor(risk: string | null): BadgeColor {
  if (!risk) return 'grey';
  const r = risk.toLowerCase();
  if (r.includes('high'))   return 'red';
  if (r.includes('medium')) return 'amber';
  return 'green';
}

function crimeColor(n: number | null): BadgeColor {
  if (n === null) return 'grey';
  if (n < 50)  return 'green';
  if (n < 150) return 'amber';
  return 'red';
}

function broadbandColor(n: number | null): BadgeColor {
  if (n === null) return 'grey';
  if (n >= 100) return 'green';
  if (n >= 30)  return 'amber';
  return 'red';
}

function epcColor(rating: string | null): BadgeColor {
  if (!rating) return 'grey';
  const r = rating.toUpperCase();
  if (r === 'A' || r === 'B') return 'green';
  if (r === 'C' || r === 'D') return 'amber';
  return 'red';
}

function ofstedColor(rating: string | null): BadgeColor {
  if (!rating) return 'grey';
  if (rating === '1') return 'green';
  if (rating === '2') return 'teal';
  if (rating === '3') return 'amber';
  if (rating === '4') return 'red';
  return 'grey';
}

const OFSTED_LABELS: Record<string, string> = {
  '1': 'Outstanding',
  '2': 'Good',
  '3': 'Requires Improvement',
  '4': 'Inadequate',
};

function ofstedLabel(rating: string | null, label: string | null): string {
  if (label) return label;
  return rating ? (OFSTED_LABELS[rating] ?? rating) : '—';
}

const EPC_DESCRIPTIONS: Record<string, string> = {
  A: 'Highly energy efficient — very low running costs.',
  B: 'Very energy efficient — low running costs.',
  C: 'Good energy efficiency — average running costs.',
  D: 'Fair energy efficiency — moderate running costs.',
  E: 'Below average energy efficiency — higher running costs.',
  F: 'Poor energy efficiency — high running costs.',
  G: 'Very poor energy efficiency — very high running costs.',
};

const BIG_NUM_CLASSES: Record<BadgeColor, string> = {
  green: 'text-[#059669]',
  amber: 'text-[#d97706]',
  red:   'text-[#dc2626]',
  teal:  'text-[var(--teal-600)]',
  grey:  'text-[var(--muted)]',
};

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyIntelligence({ propertyId, postcode, token, isPublic = false }: Props) {
  const [data, setData]       = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (isPublic && token) {
        const { data: result, error: rpcErr } = await supabase.rpc(
          'get_property_intelligence_by_token',
          { p_token: token }
        );
        if (rpcErr) throw rpcErr;
        if (result?.intelligence) {
          setData({ ...result.intelligence, schools: result.schools ?? [] });
        } else {
          setData(null);
        }
      } else if (propertyId && postcode) {
        // Explicitly fetch session so the token is always sent, even if the
        // Supabase client hasn't hydrated it yet on first mount.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('No active session — please sign in again.');

        const { data: result, error: fnErr } = await supabase.functions.invoke(
          'property-intelligence',
          {
            body: { postcode, property_id: propertyId },
            headers: { Authorization: `Bearer ${session.access_token}` },
          }
        );
        if (fnErr) {
          let errMsg = fnErr.message ?? 'Failed to load property intelligence';
          try {
            const body = await (fnErr as any).context?.json?.();
            if (body?.error) errMsg = body.error;
          } catch { /* ignore */ }
          throw new Error(errMsg);
        }
        setData(result as IntelligenceData);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load property intelligence';
      console.error('[PropertyIntelligence]', msg);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [propertyId, postcode, token, isPublic]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──────────────────────────────────────────────────────────

  const crimeTotal: number | null = data?.crime_statistics?.total ?? null;
  const crimeCategories: CrimeCategory[] = data?.crime_statistics?.categories ?? [];
  const mbps: number | null = data?.broadband_availability?.maxSpeed ?? null;
  const schools  = (data?.schools ?? []).slice(0, 3);
  const sales    = (Array.isArray(data?.recent_sales) ? data!.recent_sales : []).slice(0, 5);
  const lastUpdated = data?.last_updated;

  // Only show error banner if we have no data at all
  const hasAnyData = !!(
    data?.flood_risk ||
    data?.crime_statistics ||
    (data?.recent_sales && data.recent_sales.length > 0) ||
    data?.epc ||
    (data?.schools && data.schools.length > 0) ||
    data?.os_map ||
    data?.conservation ||
    (data?.green_spaces && data.green_spaces.length > 0)
  );
  const showErrorBanner = error && !loading && !hasAnyData;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {/* Section header */}
      <div className="flex items-center justify-between flex-wrap gap-4 px-2">
        <div className="space-y-1">
          <h4 className="font-heading font-black text-[var(--teal-900)] text-2xl tracking-tight">
            Property Intelligence
          </h4>
          {lastUpdated && (
            <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">
              Last updated{' '}
              {new Date(lastUpdated).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          )}
        </div>

        {!isPublic && (
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal-900)] hover:border-[var(--teal-600)] transition-colors disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>
              refresh
            </span>
            {loading ? 'Gathering intelligence…' : 'Refresh Data'}
          </button>
        )}
      </div>

      {/* Error banner — only shown when ALL cards have failed */}
      {showErrorBanner && (
        <div className="p-6 bg-white border border-[var(--border)] rounded-2xl flex items-center gap-4 text-sm text-[var(--muted)]">
          <span className="material-symbols-outlined text-2xl text-[var(--muted)] shrink-0">cloud_off</span>
          <div>
            <p className="font-semibold text-[var(--teal-900)]">Property intelligence unavailable</p>
            <p className="text-xs mt-0.5">We couldn't load your local data right now. Try refreshing — if it keeps happening, please get in touch.</p>
          </div>
          <button
            onClick={fetchData}
            className="ml-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-semibold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Retry
          </button>
        </div>
      )}

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* ── Card 1: Flood Risk ─────────────────────────────────────────────── */}
        <IntelligenceCard emoji="🌊" title="Flood Risk" source="Environment Agency" loading={loading}>
          {!data?.flood_risk?.risk ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-3">
              <Badge label={data.flood_risk.risk} color={floodColor(data.flood_risk.risk)} />
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {floodColor(data.flood_risk.risk) === 'red'
                  ? 'This area has a high risk of flooding. Speak to your insurer before proceeding.'
                  : floodColor(data.flood_risk.risk) === 'amber'
                    ? 'This area has a medium flood risk. Flood insurance is strongly recommended.'
                    : 'This area has a low or very low risk of flooding from rivers or the sea.'}
              </p>
              {data.flood_risk.zone && (
                <p className="text-xs text-[var(--muted)]">Flood {data.flood_risk.zone}</p>
              )}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 2: EPC ───────────────────────────────────────────────────── */}
        <IntelligenceCard emoji="⚡" title="Energy Performance" source="EPC Register" loading={loading}>
          {!data?.epc?.rating ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`font-heading font-black text-5xl leading-none ${BIG_NUM_CLASSES[epcColor(data.epc.rating)]}`}>
                  {data.epc.rating}
                </span>
                {data.epc.score != null && (
                  <div>
                    <p className="text-xs text-[var(--muted)] font-semibold uppercase tracking-widest">Score</p>
                    <p className="font-bold text-[var(--teal-900)] text-lg">{data.epc.score}</p>
                  </div>
                )}
              </div>
              <Badge label={`Rating ${data.epc.rating}`} color={epcColor(data.epc.rating)} />
              <p className="text-sm text-[var(--muted)] leading-relaxed">
                {EPC_DESCRIPTIONS[data.epc.rating.toUpperCase()] ?? ''}
              </p>
              {data.epc.date && (
                <p className="text-xs text-[var(--muted)]">
                  Lodged {new Date(data.epc.date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 3: Nearby Schools ─────────────────────────────────────────── */}
        <IntelligenceCard emoji="🏫" title="Nearby Schools" source="Get Information About Schools" loading={loading}>
          {schools.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-4">
              {schools.map((school, i) => (
                <div key={school.id ?? i} className="space-y-1">
                  <p className="text-sm font-bold text-[var(--teal-900)] leading-tight">
                    {school.school_name ?? 'Unknown school'}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                    {school.phase && <span>{school.phase}</span>}
                    {school.ofsted_rating && (
                      <Badge
                        label={ofstedLabel(school.ofsted_rating, school.ofsted_rating_label)}
                        color={ofstedColor(school.ofsted_rating)}
                      />
                    )}
                    {school.distance_miles != null && (
                      <span>{Number(school.distance_miles).toFixed(1)} mi away</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 4: Broadband ──────────────────────────────────────────────── */}
        <IntelligenceCard emoji="📡" title="Broadband Speeds" source="Ofcom" loading={loading}>
          {mbps === null ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-heading font-black text-4xl leading-none ${BIG_NUM_CLASSES[broadbandColor(mbps)]}`}>
                  {mbps}
                </span>
                <span className="text-[var(--muted)] text-sm font-semibold">Mbps</span>
              </div>
              {data?.broadband_availability?.technology && (
                <Badge
                  label={data.broadband_availability.technology}
                  color={broadbandColor(mbps) === 'grey' ? 'teal' : broadbandColor(mbps)}
                />
              )}
              <p className="text-xs text-[var(--muted)]">
                {mbps >= 100
                  ? 'Full fibre speeds — suitable for streaming, gaming and working from home.'
                  : mbps >= 30
                    ? 'Good broadband speeds suitable for most households.'
                    : 'Basic broadband speeds. Check fibre availability with your provider.'}
              </p>
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 5: Crime ──────────────────────────────────────────────────── */}
        <IntelligenceCard emoji="🚔" title="Local Crime" source="Police UK" loading={loading}>
          {crimeTotal === null ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-baseline gap-1.5">
                <span className={`font-heading font-black text-4xl leading-none ${BIG_NUM_CLASSES[crimeColor(crimeTotal)]}`}>
                  {crimeTotal}
                </span>
                <span className="text-[var(--muted)] text-sm font-semibold">crimes last month</span>
              </div>
              {crimeCategories.length > 0 && (
                <div className="space-y-2 pt-1 border-t border-[var(--border)]">
                  {crimeCategories.map((cat, i) => (
                    <div key={i} className="flex items-center justify-between text-sm gap-2">
                      <span className="text-[var(--muted)] capitalize leading-tight">{cat.name}</span>
                      <span className="font-bold text-[var(--teal-900)] shrink-0">{cat.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 6: Recent Sales ───────────────────────────────────────────── */}
        <IntelligenceCard emoji="🏠" title="Recent Sales Nearby" source="Land Registry" loading={loading}>
          {sales.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-3">
              {sales.map((sale, i) => (
                <div key={i} className="flex items-start justify-between gap-2 text-sm">
                  <div>
                    <p className="font-bold text-[var(--teal-900)]">
                      {sale.price != null
                        ? `£${Number(sale.price).toLocaleString('en-GB')}`
                        : '—'}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {sale.date
                        ? new Date(sale.date).toLocaleDateString('en-GB', {
                            month: 'short', year: 'numeric',
                          })
                        : ''}
                      {sale.type ? ` · ${sale.type}` : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 7: Property Map ───────────────────────────────────────────── */}
        <IntelligenceCard emoji="🗺️" title="Property Map" source="Ordnance Survey" loading={loading}>
          {!data?.os_map?.image_base64 ? (
            <p className="text-sm text-[var(--muted)]">No map data available</p>
          ) : (
            <div className="space-y-3">
              <div className="relative w-full overflow-hidden rounded-xl border border-[var(--border)]" style={{ aspectRatio: '1/1' }}>
                <img
                  src={`data:image/png;base64,${data.os_map.image_base64}`}
                  alt="Ordnance Survey map centred on property"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
                {/* Map pin overlay */}
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${data.os_map.pin_x_pct}%`,
                    top:  `${data.os_map.pin_y_pct}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <div className="flex flex-col items-center">
                    <div className="w-5 h-5 rounded-full bg-[var(--teal-600)] border-2 border-white shadow-lg" />
                    <div className="w-0.5 h-2 bg-[var(--teal-600)]" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">Outdoor map at zoom level {data.os_map.zoom}</p>
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 8: Conservation & Listed Buildings ────────────────────────── */}
        <IntelligenceCard emoji="🏛️" title="Conservation & Listed Buildings" source="Ordnance Survey" loading={loading}>
          {!data?.conservation ? (
            <p className="text-sm text-[var(--muted)]">No data available</p>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge
                  label={data.conservation.conservation_area ? 'Conservation Area' : 'Not in Conservation Area'}
                  color={data.conservation.conservation_area ? 'amber' : 'green'}
                />
              </div>

              {data.conservation.conservation_area && (
                <p className="text-sm text-[var(--muted)] leading-relaxed">
                  This property is within or near a designated conservation area. Additional planning restrictions may apply.
                </p>
              )}

              {data.conservation.listed_buildings.length > 0 ? (
                <div className="space-y-3 pt-1 border-t border-[var(--border)]">
                  <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Nearby Listed Buildings
                  </p>
                  {data.conservation.listed_buildings.slice(0, 5).map((b, i) => (
                    <div key={i} className="space-y-0.5">
                      <p className="text-sm font-semibold text-[var(--teal-900)] leading-tight">{b.name}</p>
                      <p className="text-xs text-[var(--muted)]">
                        {b.type}{b.distance_m != null ? ` · ${b.distance_m}m away` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[var(--muted)]">No listed buildings identified nearby.</p>
              )}
            </div>
          )}
        </IntelligenceCard>

        {/* ── Card 9: Green Spaces Nearby ────────────────────────────────────── */}
        <IntelligenceCard emoji="🌳" title="Green Spaces Nearby" source="Ordnance Survey" loading={loading}>
          {!data?.green_spaces || data.green_spaces.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No green spaces found within 800m</p>
          ) : (
            <div className="space-y-3">
              {data.green_spaces.slice(0, 5).map((gs, i) => (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5 flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[var(--teal-900)] leading-tight truncate">{gs.name}</p>
                    {gs.type && gs.type.toLowerCase() !== gs.name.toLowerCase() && (
                      <p className="text-xs text-[var(--muted)]">{gs.type}</p>
                    )}
                  </div>
                  <span className="text-xs font-bold text-[var(--teal-600)] shrink-0 pt-0.5">
                    {gs.distance_m < 1000
                      ? `${gs.distance_m}m`
                      : `${(gs.distance_m / 1000).toFixed(1)}km`}
                  </span>
                </div>
              ))}
            </div>
          )}
        </IntelligenceCard>

      </div>

      {/* Public pack disclaimer */}
      {isPublic && (
        <p className="text-xs text-[var(--muted)] text-center pt-2 leading-relaxed max-w-2xl mx-auto">
          Data is sourced from publicly available government APIs and is provided for information
          purposes only.
        </p>
      )}
    </div>
  );
}
