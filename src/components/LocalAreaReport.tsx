import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Card } from './ui/Card';

interface AreaReport {
  address: string; postcode: string;
  broadband: { providers: string[]; maxSpeed: string; uploadSpeed: string; fiberAvailable: boolean; description: string };
  shops: { name: string; type: string; distance: string }[];
  schools: { name: string; type: string; ofstedRating: string; distance: string }[];
  crime: { level: string; recentStats: string; commonTypes: string[] };
  transport: { name: string; type: string; distance: string }[];
  healthcare: { name: string; type: string; distance: string }[];
  gyms: { name: string; type: string; distance: string }[];
  floodRisk: { riskLevel: string; details: string };
  summary: string;
}

interface Props { propertyId: string; postcode: string; address?: string }

function floodColor(level: string) {
  const l = level.toLowerCase();
  if (l.includes('very low') || l.includes('low')) return 'text-[#059669] bg-[#d1fae5]';
  if (l.includes('medium')) return 'text-[#d97706] bg-[#fef3c7]';
  if (l.includes('high')) return 'text-[#dc2626] bg-[#fee2e2]';
  return 'text-[var(--teal-900)] bg-[var(--teal-050)]';
}

function crimeColor(level: string) {
  const l = level.toLowerCase();
  if (l.includes('low')) return 'text-[#059669] bg-[#d1fae5]';
  if (l.includes('medium')) return 'text-[#d97706] bg-[#fef3c7]';
  if (l.includes('high')) return 'text-[#dc2626] bg-[#fee2e2]';
  return 'text-[var(--teal-900)] bg-[var(--teal-050)]';
}

function ofstedColor(rating: string) {
  const r = rating.toLowerCase();
  if (r.includes('outstanding')) return 'text-[#059669] bg-[#d1fae5]';
  if (r.includes('good')) return 'text-[var(--teal-600)] bg-[var(--teal-050)]';
  if (r.includes('requires') || r.includes('improvement')) return 'text-[#d97706] bg-[#fef3c7]';
  if (r.includes('inadequate')) return 'text-[#dc2626] bg-[#fee2e2]';
  return 'text-[var(--muted)] bg-[var(--teal-050)]';
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>;
}

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{emoji}</span>
        <h4 className="font-heading font-black text-[var(--teal-900)] text-base">{title}</h4>
      </div>
      {children}
    </Card>
  );
}

function ListItem({ name, type, distance }: { name: string; type: string; distance: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
      <div>
        <p className="text-sm font-semibold text-[var(--teal-900)]">{name}</p>
        <p className="text-xs text-[var(--muted)]">{type}</p>
      </div>
      <span className="text-xs text-[var(--muted)] whitespace-nowrap mt-0.5">{distance}</span>
    </div>
  );
}

export default function LocalAreaReport({ propertyId, postcode, address }: Props) {
  const [report, setReport] = useState<AreaReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // On mount — check Supabase for a cached report before calling the Edge Function
  useEffect(() => {
    async function loadCache() {
      if (!propertyId) return;
      try {
        const { data } = await supabase
          .from('properties')
          .select('local_area_report, local_area_report_cached_at')
          .eq('id', propertyId)
          .maybeSingle() as { data: { local_area_report: unknown; local_area_report_cached_at: string | null } | null };

        if (data?.local_area_report) {
          setReport(data.local_area_report as AreaReport);
          setCachedAt(data.local_area_report_cached_at);
          setFromCache(true);
          setFetched(true);
        }
      } catch {
        // silently fall through to full fetch
      }
    }
    loadCache();
  }, [propertyId]);

  const fetchReport = useCallback(async (forceRefresh = false) => {
    if (loading) return;
    setLoading(true); setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('local-area-report', {
        body: { postcode, address, propertyId, forceRefresh },
      });
      if (fnErr) throw new Error(fnErr.message || 'Failed to load area report');
      if (data?.error) throw new Error(data.error);
      setReport(data.report);
      setCachedAt(data.cachedAt ?? null);
      setFromCache(data.cached ?? false);
      setFetched(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load area report');
    } finally { setLoading(false); }
  }, [postcode, address, propertyId, loading]);

  if (loading) return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-2">
        <div className="size-8 rounded-lg bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--teal-600)]" />
        </div>
        <div>
          <p className="font-heading font-black text-[var(--teal-900)] text-sm">Generating local area report…</p>
          <p className="text-xs text-[var(--muted)]">This takes around 10–15 seconds</p>
        </div>
      </div>
      {[1,2,3,4].map(i => <div key={i} className="h-32 rounded-2xl bg-[var(--teal-050)] animate-pulse border border-[var(--border)]" />)}
    </div>
  );

  if (error) return (
    <Card className="p-6 text-center space-y-3">
      <span className="material-symbols-outlined text-3xl text-[#dc2626]">error_outline</span>
      <p className="text-sm text-[var(--muted)]">{error}</p>
      <button onClick={() => fetchReport(false)} className="text-sm font-semibold text-[var(--teal-600)] hover:text-[var(--teal-900)] transition-colors">Try again</button>
    </Card>
  );

  if (!report && !fetched) return (
    <Card className="p-6 text-center space-y-3">
      <span className="text-3xl">🏘️</span>
      <p className="text-sm font-semibold text-[var(--teal-900)]">No area report yet</p>
      <button onClick={() => fetchReport(false)} className="inline-flex items-center gap-2 bg-[var(--teal-600)] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[var(--teal-900)] transition-colors">
        <span className="material-symbols-outlined text-base">search</span>Generate Report
      </button>
    </Card>
  );

  if (!report) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-[var(--muted)]">{report.postcode}</p>
          {fromCache && cachedAt && (
            <span className="text-[10px] font-semibold text-[var(--muted)] bg-[var(--teal-050)] border border-[var(--border)] px-2 py-0.5 rounded-full">
              Cached · {new Date(cachedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
        <button
          onClick={() => fetchReport(true)}
          disabled={loading}
          className="flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors border border-[var(--border)] rounded-lg px-3 py-1.5 disabled:opacity-50"
        >
          <span className={`material-symbols-outlined text-sm ${loading ? 'animate-spin' : ''}`}>refresh</span>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <Card className="p-5 bg-[var(--teal-050)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📋</span>
          <h4 className="font-heading font-black text-[var(--teal-900)] text-base">Area Summary</h4>
        </div>
        <p className="text-sm text-[var(--teal-900)] leading-relaxed">{report.summary}</p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SectionCard emoji="🌊" title="Flood Risk">
          <Badge label={report.floodRisk.riskLevel} colorClass={floodColor(report.floodRisk.riskLevel)} />
          <p className="text-xs text-[var(--muted)] mt-2 leading-relaxed">{report.floodRisk.details}</p>
        </SectionCard>
        <SectionCard emoji="🔒" title="Crime">
          <Badge label={report.crime.level} colorClass={crimeColor(report.crime.level)} />
          <p className="text-xs text-[var(--muted)] mt-2">{report.crime.recentStats}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {report.crime.commonTypes.slice(0, 4).map((t, i) => (
              <span key={i} className="text-[10px] bg-[var(--teal-050)] text-[var(--muted)] px-2 py-0.5 rounded-full border border-[var(--border)]">{t}</span>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard emoji="📶" title="Broadband">
        <div className="flex flex-wrap items-end gap-4 mb-3">
          <div><p className="text-2xl font-black font-heading text-[var(--teal-600)]">{report.broadband.maxSpeed}</p><p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Download</p></div>
          <div><p className="text-2xl font-black font-heading text-[var(--teal-600)]">{report.broadband.uploadSpeed}</p><p className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Upload</p></div>
          <Badge label={report.broadband.fiberAvailable ? 'Fibre Available' : 'No Fibre'} colorClass={report.broadband.fiberAvailable ? 'text-[#059669] bg-[#d1fae5]' : 'text-[#d97706] bg-[#fef3c7]'} />
        </div>
        {report.broadband.providers.length > 0 && <p className="text-xs text-[var(--muted)]">Providers: {report.broadband.providers.join(', ')}</p>}
        <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{report.broadband.description}</p>
      </SectionCard>

      {report.schools.length > 0 && (
        <SectionCard emoji="🏫" title="Nearby Schools">
          {report.schools.slice(0, 4).map((s, i) => (
            <div key={i} className="flex items-start justify-between gap-3 py-2 border-b border-[var(--border)] last:border-0">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--teal-900)]">{s.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted)]">{s.type}</span>
                  {s.ofstedRating && <Badge label={s.ofstedRating} colorClass={ofstedColor(s.ofstedRating)} />}
                </div>
              </div>
              <span className="text-xs text-[var(--muted)] whitespace-nowrap mt-0.5">{s.distance}</span>
            </div>
          ))}
        </SectionCard>
      )}

      {report.transport.length > 0 && (
        <SectionCard emoji="🚉" title="Transport Links">
          {report.transport.slice(0, 5).map((t, i) => <ListItem key={i} name={t.name} type={t.type} distance={t.distance} />)}
        </SectionCard>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {report.shops.length > 0 && (
          <SectionCard emoji="🛒" title="Local Shops">
            {report.shops.slice(0, 4).map((s, i) => <ListItem key={i} name={s.name} type={s.type} distance={s.distance} />)}
          </SectionCard>
        )}
        {report.healthcare.length > 0 && (
          <SectionCard emoji="🏥" title="Healthcare">
            {report.healthcare.slice(0, 4).map((h, i) => <ListItem key={i} name={h.name} type={h.type} distance={h.distance} />)}
          </SectionCard>
        )}
      </div>

      {report.gyms.length > 0 && (
        <SectionCard emoji="🏋️" title="Gyms & Wellness">
          {report.gyms.slice(0, 4).map((g, i) => <ListItem key={i} name={g.name} type={g.type} distance={g.distance} />)}
        </SectionCard>
      )}

      <p className="text-[10px] text-[var(--muted)] text-center px-4 leading-relaxed">
        This report is AI-generated based on publicly available data and should be used as a guide only. Always verify important details independently before making property decisions.
      </p>
    </div>
  );
}
