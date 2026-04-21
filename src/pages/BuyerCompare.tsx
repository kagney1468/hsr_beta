import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const MANDATORY_DOCS = ['title_deeds', 'epc'];
const MI_FIELDS = [
  'water_supply', 'electricity_supply', 'broadband_speed',
  'mobile_signal', 'flood_risk', 'coastal_erosion', 'coalfield_area', 'disputes',
];

function calcCompleteness(docs: any[], mi: any, tenure: string): number {
  const mandatory = [...MANDATORY_DOCS];
  if ((tenure || '').toLowerCase() === 'leasehold') mandatory.push('leasehold');
  const docsUploaded = mandatory.filter(t => docs.some((d: any) => d.document_type === t)).length;
  const docsScore = Math.round((docsUploaded / mandatory.length) * 50);
  let miScore = 0;
  if (mi) {
    const answered = MI_FIELDS.filter(f => mi[f] && mi[f] !== '').length;
    miScore = Math.round((answered / MI_FIELDS.length) * 50);
  }
  return docsScore + miScore;
}

function CompletenessBar({ score }: { score: number }) {
  const colour = score === 100 ? '#059669' : score >= 60 ? '#d97706' : '#dc2626';
  const label = score === 100 ? 'Complete' : score >= 60 ? 'In progress' : 'Early stage';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: colour }}>{label}</span>
        <span className="text-[10px] font-bold text-[var(--muted)]">{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: colour }} />
      </div>
    </div>
  );
}

function EpcBadge({ rating }: { rating: string | null | undefined }) {
  const r = (rating || '').toUpperCase().trim().charAt(0);
  const colours: Record<string, string> = {
    A: '#22c55e', B: '#84cc16', C: '#eab308',
    D: '#f59e0b', E: '#f97316', F: '#ef4444', G: '#b91c1c',
  };
  const bg = colours[r] || '#94a3b8';
  return r ? (
    <span
      className="inline-flex items-center justify-center size-8 rounded-lg text-white font-black font-heading text-sm"
      style={{ backgroundColor: bg }}
    >
      {r}
    </span>
  ) : (
    <span className="text-[var(--muted)] text-sm">—</span>
  );
}

function CompareRow({ label, left, right }: { label: string; left: React.ReactNode; right: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[1fr_1fr] divide-x divide-[var(--border)] border-b border-[var(--border)] last:border-b-0">
      <div className="p-4 text-sm text-[var(--text)]">{left}</div>
      <div className="p-4 text-sm text-[var(--text)]">{right}</div>
    </div>
  );
}

function RowLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] px-4 py-2 bg-[var(--page)] border-b border-[var(--border)] col-span-2">
      {children}
    </p>
  );
}

export default function BuyerCompare() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allPacks, setAllPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const { data: viewerRows, error } = await supabase
          .from('pack_viewers')
          .select('id, viewed_at, properties(id, address_line1, address_line2, address_town, address_postcode, shareable_link_token, tenure, property_type, bedrooms, bathrooms, council_tax_band)')
          .eq('auth_user_id', user.id)
          .order('viewed_at', { ascending: false });

        if (error) throw error;
        if (!viewerRows || viewerRows.length < 2) {
          navigate('/buyer/dashboard');
          return;
        }

        const propertyIds = viewerRows.map((r: any) => r.properties?.id).filter(Boolean);

        const [{ data: allDocs }, { data: allMi }, { data: allDocFiles }] = await Promise.all([
          supabase.from('documents').select('property_id, document_type').in('property_id', propertyIds),
          supabase.from('material_information').select('property_id, water_supply, electricity_supply, broadband_speed, mobile_signal, flood_risk, coastal_erosion, coalfield_area, disputes, epc_rating').in('property_id', propertyIds),
          supabase.from('documents').select('property_id, name, document_type').in('property_id', propertyIds),
        ]);

        const enriched = viewerRows.map((row: any) => {
          const prop = row.properties;
          const propId = prop?.id;
          const docs = (allDocs || []).filter((d: any) => d.property_id === propId);
          const docFiles = (allDocFiles || []).filter((d: any) => d.property_id === propId);
          const mi = (allMi || []).find((m: any) => m.property_id === propId) ?? null;
          const completeness = propId ? calcCompleteness(docs, mi, prop?.tenure ?? '') : 0;
          return { ...row, completeness, mi, docFiles };
        });

        setAllPacks(enriched);
        setLeftId(enriched[0]?.id ?? '');
        setRightId(enriched[1]?.id ?? '');
      } catch (err) {
        console.error('Error loading compare data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const leftPack = allPacks.find(p => p.id === leftId);
  const rightPack = allPacks.find(p => p.id === rightId);

  const packLabel = (pack: any) => {
    const prop = pack?.properties;
    return [prop?.address_line1, prop?.address_town].filter(Boolean).join(', ') || 'Unknown property';
  };

  const val = (v: any) => (v && v !== '' ? v : '—');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 pb-6 border-b border-[var(--border)] bg-white">
        <button
          type="button"
          onClick={() => navigate('/buyer/dashboard')}
          className="flex items-center gap-2 text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors text-xs font-semibold uppercase tracking-widest mb-4"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to dashboard
        </button>
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
          Compare packs
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Select two properties to view side by side.
        </p>
      </div>

      <main className="p-6 md:p-10 space-y-6">

        {/* Property selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Property A
            </label>
            <select
              value={leftId}
              onChange={e => setLeftId(e.target.value)}
              className="w-full"
            >
              {allPacks.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === rightId}>
                  {packLabel(p)}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Property B
            </label>
            <select
              value={rightId}
              onChange={e => setRightId(e.target.value)}
              className="w-full"
            >
              {allPacks.map(p => (
                <option key={p.id} value={p.id} disabled={p.id === leftId}>
                  {packLabel(p)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {leftPack && rightPack && (
          <Card className="overflow-hidden">

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_1fr] divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--teal-900)]">
              {[leftPack, rightPack].map((pack, i) => {
                const prop = pack.properties;
                const address = [prop?.address_line1, prop?.address_town].filter(Boolean).join(', ');
                const postcode = prop?.address_postcode || '';
                return (
                  <div key={i} className="p-5 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white/60">
                      Property {i === 0 ? 'A' : 'B'}
                    </p>
                    <p className="font-black font-heading text-white text-base leading-snug">
                      {address || 'Unknown property'}
                    </p>
                    {postcode && (
                      <p className="text-xs font-semibold text-white/70 uppercase tracking-widest">
                        {postcode}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pack completeness */}
            <div className="grid grid-cols-[1fr_1fr] divide-x divide-[var(--border)] border-b border-[var(--border)] bg-[var(--teal-050)]">
              {[leftPack, rightPack].map((pack, i) => (
                <div key={i} className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">
                    Pack completeness
                  </p>
                  <CompletenessBar score={pack.completeness ?? 0} />
                </div>
              ))}
            </div>

            {/* Section: Property details */}
            <div className="grid grid-cols-[1fr_1fr]">
              <RowLabel>Property details</RowLabel>

              <CompareRow
                label="Type"
                left={<span className="font-semibold text-[var(--teal-900)]">{val(leftPack.properties?.property_type)}</span>}
                right={<span className="font-semibold text-[var(--teal-900)]">{val(rightPack.properties?.property_type)}</span>}
              />
              <CompareRow
                label="Bedrooms"
                left={<span className="font-semibold text-[var(--teal-900)]">{val(leftPack.properties?.bedrooms)}</span>}
                right={<span className="font-semibold text-[var(--teal-900)]">{val(rightPack.properties?.bedrooms)}</span>}
              />
              <CompareRow
                label="Bathrooms"
                left={<span className="font-semibold text-[var(--teal-900)]">{val(leftPack.properties?.bathrooms)}</span>}
                right={<span className="font-semibold text-[var(--teal-900)]">{val(rightPack.properties?.bathrooms)}</span>}
              />
              <CompareRow
                label="Tenure"
                left={<span className="font-semibold text-[var(--teal-900)]">{val(leftPack.properties?.tenure)}</span>}
                right={<span className="font-semibold text-[var(--teal-900)]">{val(rightPack.properties?.tenure)}</span>}
              />
              <CompareRow
                label="Council tax band"
                left={<span className="font-semibold text-[var(--teal-900)]">{leftPack.properties?.council_tax_band ? `Band ${leftPack.properties.council_tax_band}` : '—'}</span>}
                right={<span className="font-semibold text-[var(--teal-900)]">{rightPack.properties?.council_tax_band ? `Band ${rightPack.properties.council_tax_band}` : '—'}</span>}
              />
              <CompareRow
                label="EPC rating"
                left={<EpcBadge rating={leftPack.mi?.epc_rating} />}
                right={<EpcBadge rating={rightPack.mi?.epc_rating} />}
              />

              <RowLabel>Utilities &amp; services</RowLabel>

              <CompareRow
                label="Water supply"
                left={val(leftPack.mi?.water_supply)}
                right={val(rightPack.mi?.water_supply)}
              />
              <CompareRow
                label="Electricity"
                left={val(leftPack.mi?.electricity_supply)}
                right={val(rightPack.mi?.electricity_supply)}
              />
              <CompareRow
                label="Broadband"
                left={val(leftPack.mi?.broadband_speed)}
                right={val(rightPack.mi?.broadband_speed)}
              />
              <CompareRow
                label="Mobile signal"
                left={val(leftPack.mi?.mobile_signal)}
                right={val(rightPack.mi?.mobile_signal)}
              />

              <RowLabel>Risks &amp; legal</RowLabel>

              <CompareRow
                label="Flood risk"
                left={val(leftPack.mi?.flood_risk)}
                right={val(rightPack.mi?.flood_risk)}
              />
              <CompareRow
                label="Coastal erosion"
                left={val(leftPack.mi?.coastal_erosion)}
                right={val(rightPack.mi?.coastal_erosion)}
              />
              <CompareRow
                label="Coalfield area"
                left={val(leftPack.mi?.coalfield_area)}
                right={val(rightPack.mi?.coalfield_area)}
              />
              <CompareRow
                label="Disputes"
                left={val(leftPack.mi?.disputes)}
                right={val(rightPack.mi?.disputes)}
              />

              <RowLabel>Documents</RowLabel>

              <CompareRow
                label="Documents"
                left={
                  leftPack.docFiles?.length > 0 ? (
                    <ul className="space-y-1">
                      {leftPack.docFiles.map((d: any, i: number) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-[var(--teal-900)]">
                          <span className="material-symbols-outlined text-[14px] text-[var(--teal-600)]">description</span>
                          {d.name || d.document_type}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--muted)] text-xs">No documents uploaded yet</span>
                  )
                }
                right={
                  rightPack.docFiles?.length > 0 ? (
                    <ul className="space-y-1">
                      {rightPack.docFiles.map((d: any, i: number) => (
                        <li key={i} className="flex items-center gap-1.5 text-xs text-[var(--teal-900)]">
                          <span className="material-symbols-outlined text-[14px] text-[var(--teal-600)]">description</span>
                          {d.name || d.document_type}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-[var(--muted)] text-xs">No documents uploaded yet</span>
                  )
                }
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-[1fr_1fr] divide-x divide-[var(--border)] border-t border-[var(--border)] bg-[var(--page)]">
              {[leftPack, rightPack].map((pack, i) => {
                const token = pack.properties?.shareable_link_token;
                const postcode = pack.properties?.address_postcode;
                return (
                  <div key={i} className="p-4 flex flex-col gap-2">
                    {token && (
                      <Button
                        variant="primary"
                        className="w-full h-10 rounded-xl font-bold text-sm"
                        onClick={() => window.open(`/pack/${token}`, '_blank')}
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">folder_open</span>
                        View Pack
                      </Button>
                    )}
                    {postcode && (
                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-xl font-bold text-sm"
                        onClick={() => window.open(`https://home-notes-khaki.vercel.app/?address=${encodeURIComponent(postcode)}`, '_blank')}
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">map</span>
                        Area Report
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>

          </Card>
        )}
      </main>
    </div>
  );
}
