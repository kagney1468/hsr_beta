import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getGreeting } from '../lib/greeting';

const PACKS_PER_PAGE = 6;

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
  const colour =
    score === 100 ? '#059669' :
    score >= 60   ? '#d97706' :
                    '#dc2626';

  const label =
    score === 100 ? 'Complete' :
    score >= 60   ? 'In progress' :
                    'Early stage';

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: colour }}>
          {label}
        </span>
        <span className="text-[10px] font-bold text-[var(--muted)]">{score}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${score}%`, backgroundColor: colour }}
        />
      </div>
    </div>
  );
}

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyerFirstName, setBuyerFirstName] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setBuyerFirstName(data.full_name.split(' ')[0]);
      });
  }, [user]);

  useEffect(() => {
    async function loadPacks() {
      if (!user) return;
      setLoading(true);
      try {
        const { data: viewerRows, error: viewerErr } = await supabase
          .from('pack_viewers')
          .select('id, viewed_at, property_id, properties(id, address_line1, address_town, address_postcode, shareable_link_token, tenure)')
          .eq('auth_user_id', user.id)
          .order('viewed_at', { ascending: false });

        if (viewerErr) throw viewerErr;
        if (!viewerRows || viewerRows.length === 0) {
          setPacks([]);
          return;
        }

        const propertyIds = viewerRows
          .map((r: any) => r.properties?.id)
          .filter(Boolean);

        const [{ data: allDocs }, { data: allMi }] = await Promise.all([
          supabase
            .from('documents')
            .select('property_id, document_type')
            .in('property_id', propertyIds),
          supabase
            .from('material_information')
            .select('property_id, water_supply, electricity_supply, broadband_speed, mobile_signal, flood_risk, coastal_erosion, coalfield_area, disputes')
            .in('property_id', propertyIds),
        ]);

        const enriched = viewerRows.map((row: any) => {
          const prop = row.properties;
          const propId = prop?.id;
          const docs = (allDocs || []).filter((d: any) => d.property_id === propId);
          const mi = (allMi || []).find((m: any) => m.property_id === propId) ?? null;
          const completeness = propId ? calcCompleteness(docs, mi, prop?.tenure ?? '') : 0;
          return { ...row, completeness };
        });

        setPacks(enriched);
      } catch (err) {
        console.error('Error loading buyer packs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadPacks();
  }, [user]);

  const totalPages = Math.ceil(packs.length / PACKS_PER_PAGE);
  const paginated = packs.slice((page - 1) * PACKS_PER_PAGE, page * PACKS_PER_PAGE);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <div className="px-6 md:px-10 pt-10 pb-6 border-b border-[var(--border)] bg-white">
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
          {getGreeting(buyerFirstName)}
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Here are the property packs you have registered for.
        </p>
      </div>

      <main className="p-6 md:p-10">
        {packs.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl mx-auto">
              <span className="material-symbols-outlined text-3xl">search</span>
            </div>
            <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">No packs yet</h2>
            <p className="text-[var(--muted)] text-sm max-w-sm mx-auto">
              You have not registered for any property packs yet. Use the link provided by the seller or their estate agent to get started.
            </p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map((pack: any) => {
                const prop = pack.properties;
                const address = [prop?.address_line1, prop?.address_town].filter(Boolean).join(', ');
                const postcode = prop?.address_postcode || '';
                const token = prop?.shareable_link_token;
                const score: number = pack.completeness ?? 0;

                return (
                  <Card key={pack.id} className="p-6 space-y-4 flex flex-col">
                    <div className="space-y-1">
                      <h3 className="font-black font-heading text-[var(--teal-900)] text-lg leading-tight">
                        {address || 'Unknown Property'}
                      </h3>
                      {postcode && (
                        <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
                          {postcode}
                        </p>
                      )}
                    </div>

                    <p className="text-[11px] text-[var(--muted)] font-medium">
                      Registered on{' '}
                      {new Date(pack.viewed_at).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'long', year: 'numeric',
                      })}
                    </p>

                    <div className="pt-1">
                      <p className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mb-2">
                        Pack completeness
                      </p>
                      <CompletenessBar score={score} />
                    </div>

                    <div className="flex flex-col gap-2 pt-2 mt-auto">
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
                          onClick={() =>
                            window.open(
                              `https://home-notes-khaki.vercel.app/?address=${encodeURIComponent(postcode)}`,
                              '_blank',
                            )
                          }
                        >
                          <span className="material-symbols-outlined text-[16px] mr-1">map</span>
                          View Area Report
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  className="h-10 px-4 rounded-xl font-bold text-sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                  Previous
                </Button>
                <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-widest">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  className="h-10 px-4 rounded-xl font-bold text-sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                  <span className="material-symbols-outlined text-[16px]">chevron_right</span>
                </Button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
