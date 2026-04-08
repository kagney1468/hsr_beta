import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';

// ── Types ─────────────────────────────────────────────────────────────────────

interface IntelligenceData {
  id?: string;
  property_id?: string;
  flood_risk: { zone: string; risk: string } | null;
  broadband_max_speed: string | null;
  broadband_availability: { maxSpeed: number | null; technology: string | null } | null;
  crime_statistics: { total: number; categories: CrimeCategory[] } | null;
  recent_sales: SaleRecord[] | null;
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
        // Public pack: fetch via share-token RPC (bypasses RLS)
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
        // Seller dashboard: call edge function (fetches fresh / cached data)
        const { data: result, error: fnErr } = await supabase.functions.invoke(
          'property-intelligence',
          { body: { postcode, property_id: propertyId } }
        );
        if (fnErr) {
          // Try to extract the real error message from the response body
          let errMsg = fnErr.message ?? 'Failed to load property intelligence';
          try {
            const body = await (fnErr as any).context?.json?.();
            if (body?.error) errMsg = body.error;
          } catch { /* ignore parse errors */ }
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
  const schools = (data?.schools ?? []).slice(0, 3);
  const sales   = (Array.isArray(data?.recent_sales) ? data!.recent_sales : []).slice(0, 5);
  const lastUpdated = data?.last_updated;

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

      {/* Error state — quiet fallback, not a scary red banner */}
      {error && !loading && (
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

      {/* Cards grid — visible immediately (cards show spinners while loading) */}
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

        {/* ── Card 2: Nearby Schools ─────────────────────────────────────────── */}
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
                    {school.phase && (
                      <span>{school.phase}</span>
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

        {/* ── Card 3: Broadband ──────────────────────────────────────────────── */}
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

        {/* ── Card 4: Crime ──────────────────────────────────────────────────── */}
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

        {/* ── Card 5: Recent Sales ───────────────────────────────────────────── */}
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
                            month: 'short',
                            year: 'numeric',
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
