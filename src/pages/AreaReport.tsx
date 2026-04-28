/**
 * Area Report page — /area-report?address=...
 *
 * Calls the Home Notes API from the browser. If you see a CORS error in the
 * console, either:
 *   A) Add CORS headers to the Home Notes Next.js API route:
 *      res.setHeader('Access-Control-Allow-Origin', '*');
 *   B) Proxy the request through a Supabase Edge Function instead.
 *
 * Supabase migration required for lead capture:
 * ─────────────────────────────────────────────
 *   create table area_report_leads (
 *     id         uuid        primary key default gen_random_uuid(),
 *     name       text        not null,
 *     email      text        not null,
 *     address    text,
 *     source     text        not null default 'hsr-area-report',
 *     created_at timestamptz not null default now()
 *   );
 *   alter table area_report_leads enable row level security;
 *   create policy "allow_insert" on area_report_leads
 *     for insert with check (true);
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import Footer from '../components/Footer';

// ── Types ──────────────────────────────────────────────────────────────────

interface ListItem {
  name: string;
  type: string;
  distance: string;
}

interface School extends ListItem {
  ofstedRating: string;
}

interface AreaReportData {
  address: string;
  postcode: string;
  broadband: {
    providers: string[];
    maxSpeed: string;
    uploadSpeed: string;
    fiberAvailable: boolean;
    description: string;
  };
  shops: ListItem[];
  schools: School[];
  crime: { level: string; recentStats: string; commonTypes: string[] };
  transport: ListItem[];
  healthcare: ListItem[];
  gyms: ListItem[];
  floodRisk: { riskLevel: string; details: string };
  summary: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const HOME_NOTES_API = 'https://home-notes-khaki.vercel.app/api/report';

function ofstedClass(rating: string) {
  const r = rating.toLowerCase();
  if (r.includes('outstanding')) return 'bg-green-100 text-green-800 border-green-200';
  if (r.includes('good')) return 'bg-[var(--teal-050)] text-[var(--teal-900)] border-[var(--border)]';
  if (r.includes('requires')) return 'bg-amber-50 text-amber-800 border-amber-200';
  if (r.includes('inadequate')) return 'bg-red-50 text-red-800 border-red-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
}

function crimeClass(level: string) {
  const l = level.toLowerCase();
  if (l.includes('very low') || l.includes('low')) return 'bg-green-100 text-green-800';
  if (l.includes('high') || l.includes('elevated')) return 'bg-red-50 text-red-800';
  return 'bg-amber-50 text-amber-800';
}

function riskClass(level: string) {
  const l = level.toLowerCase();
  if (l.includes('low')) return 'bg-green-100 text-green-800';
  if (l.includes('very high') || l.includes('significant')) return 'bg-red-100 text-red-900';
  if (l.includes('high')) return 'bg-red-50 text-red-800';
  return 'bg-amber-50 text-amber-800';
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, iconBg, iconColor, title }: {
  icon: string; iconBg: string; iconColor: string; title: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className={`size-9 rounded-xl flex items-center justify-center ${iconBg}`}>
        <span className={`material-symbols-outlined ${iconColor}`}>{icon}</span>
      </span>
      <h3 className="font-black font-heading text-[var(--teal-900)]">{title}</h3>
    </div>
  );
}

function StatChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--teal-050)] border border-[var(--border)]">
      <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{label}</p>
      <p className="font-black font-heading text-[var(--teal-900)] text-base leading-snug mt-0.5">{value}</p>
    </div>
  );
}

function SimpleList({ items }: { items: ListItem[] }) {
  return (
    <div className="divide-y divide-[var(--border)]">
      {items.map((item, i) => (
        <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div>
            <p className="font-bold text-sm text-[var(--teal-900)]">{item.name}</p>
            <p className="text-[11px] text-[var(--muted)] capitalize">{item.type}</p>
          </div>
          <span className="shrink-0 text-xs font-bold text-[var(--muted)] whitespace-nowrap">{item.distance}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function AreaReport() {
  const { user } = useAuth();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const initialAddress = params.get('address') || '';

  const [addressInput, setAddressInput] = useState(initialAddress);
  const [report, setReport] = useState<AreaReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lead capture
  const [leadName, setLeadName] = useState('');
  const [leadEmail, setLeadEmail] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [reportUnlocked, setReportUnlocked] = useState(false);

  const fullReportVisible = !!user || reportUnlocked;

  const fetchReport = useCallback(async (address: string) => {
    if (!address.trim()) return;
    setLoading(true);
    setError(null);
    setReport(null);
    setReportUnlocked(false);
    try {
      const res = await fetch(HOME_NOTES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: address.trim() }),
      });
      if (!res.ok) throw new Error(`Report service returned ${res.status}. Please try again.`);
      const data: AreaReportData = await res.json();
      setReport(data);
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('failed to fetch') || err?.name === 'TypeError') {
        setError(
          'Unable to reach the area report service — this is likely a CORS issue. ' +
          'Add "Access-Control-Allow-Origin: *" to the Home Notes API response headers, ' +
          'or proxy the request through a Supabase Edge Function.'
        );
      } else {
        setError(msg || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-fetch when address is pre-filled from URL
  useEffect(() => {
    if (initialAddress) fetchReport(initialAddress);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReport(addressInput);
  };

  const handleLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingLead(true);
    try {
      await supabase.from('area_report_leads').insert({
        name: leadName,
        email: leadEmail,
        address: report?.address || addressInput,
        source: 'hsr-area-report',
      });
    } catch {
      // Fail silently — unlock the report regardless; DB insert is best-effort
    } finally {
      setSubmittingLead(false);
      setReportUnlocked(true);
    }
  };

  const backLink = user ? '/buyer/dashboard' : '/login';
  const backLabel = user ? '← Dashboard' : 'Sign in';

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">

      {/* Header */}
      <header className="bg-white border-b border-[var(--border)] sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-2xl text-[var(--teal-600)]">home_filled</span>
            <span className="font-heading font-black text-[var(--teal-900)] text-lg tracking-tight">HomeSalesReady</span>
          </Link>
          <Link to={backLink} className="text-sm font-bold text-[var(--teal-600)] hover:underline">{backLabel}</Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

          {/* Title + search */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--teal-050)] border border-[var(--border)] text-[10px] font-black text-[var(--teal-600)] uppercase tracking-widest">
              <span className="material-symbols-outlined text-[14px]">home_pin</span>
              Area Intelligence
            </div>
            <h1 className="text-3xl font-black font-heading text-[var(--teal-900)] tracking-tight leading-tight">
              Know the area before you move
            </h1>
            <p className="text-sm text-[var(--muted)] max-w-xl">
              Enter any UK address for an AI-generated report covering broadband, schools, crime, flood risk, transport, and more.
            </p>

            <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
              <input
                type="text"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                className="flex-1"
                placeholder="e.g. 14 Beach Road, Bournemouth, BH1 2AA"
              />
              <button
                type="submit"
                disabled={loading || !addressInput.trim()}
                className="shrink-0 px-6 py-2.5 rounded-xl bg-[#17afaf] text-white font-black text-sm hover:opacity-90 disabled:opacity-40 transition-opacity whitespace-nowrap"
              >
                {loading ? 'Searching…' : 'Get Report'}
              </button>
            </form>
          </div>

          {/* Loading */}
          {loading && (
            <Card className="p-12 flex flex-col items-center gap-4 text-center">
              <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
              <p className="text-sm text-[var(--muted)] font-medium">Generating your area report — this takes a few seconds…</p>
            </Card>
          )}

          {/* Error */}
          {error && !loading && (
            <Card className="p-5 flex items-start gap-3" style={{ borderColor: '#fecaca', background: '#fff5f5' }}>
              <span className="material-symbols-outlined text-red-500 shrink-0 mt-0.5">error_outline</span>
              <div>
                <p className="font-bold text-red-900 text-sm">Couldn't load report</p>
                <p className="text-xs text-red-700 mt-0.5 leading-relaxed">{error}</p>
              </div>
            </Card>
          )}

          {/* Empty state */}
          {!report && !loading && !error && (
            <Card className="p-16 flex flex-col items-center gap-4 text-center">
              <span className="material-symbols-outlined text-5xl text-[var(--border)]">map</span>
              <p className="text-sm text-[var(--muted)] font-medium">Enter an address above to generate your area report.</p>
            </Card>
          )}

          {/* Report */}
          {report && !loading && (
            <div className="space-y-6 animate-in fade-in duration-500">

              {/* Summary — always visible */}
              <Card className="p-6 border-l-4 border-l-[#17afaf]">
                <div className="flex items-start gap-3 mb-3">
                  <span className="material-symbols-outlined text-[#17afaf] text-2xl shrink-0 mt-0.5">summarize</span>
                  <div>
                    <p className="text-[10px] font-black text-[#17afaf] uppercase tracking-widest mb-1">AI Summary</p>
                    <h2 className="font-black font-heading text-[var(--teal-900)] text-base leading-snug">{report.address}</h2>
                  </div>
                </div>
                <p className="text-sm text-[var(--text)] leading-relaxed">{report.summary}</p>

                {/* Teaser chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border border-transparent ${crimeClass(report.crime.level)}`}>
                    <span className="material-symbols-outlined text-[13px]">security</span>
                    Crime: {report.crime.level}
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border border-transparent ${riskClass(report.floodRisk.riskLevel)}`}>
                    <span className="material-symbols-outlined text-[13px]">water</span>
                    Flood risk: {report.floodRisk.riskLevel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                    <span className="material-symbols-outlined text-[13px]">wifi</span>
                    {report.broadband.fiberAvailable ? 'Fibre available' : 'No fibre'} · {report.broadband.maxSpeed}
                  </span>
                </div>
              </Card>

              {/* Full report or gate */}
              {fullReportVisible ? (
                <div className="space-y-5 animate-in fade-in duration-500">

                  {/* Broadband */}
                  <Card className="p-6">
                    <SectionHeader icon="wifi" iconBg="bg-blue-50" iconColor="text-blue-600" title="Broadband" />
                    <p className="text-sm text-[var(--text)] leading-relaxed mb-4">{report.broadband.description}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      <StatChip label="Max download" value={report.broadband.maxSpeed} />
                      <StatChip label="Upload speed" value={report.broadband.uploadSpeed} />
                      <StatChip label="Fibre" value={report.broadband.fiberAvailable ? 'Available' : 'Not available'} />
                    </div>
                    {report.broadband.providers.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">Providers</p>
                        <div className="flex flex-wrap gap-2">
                          {report.broadband.providers.map((p, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-white border border-[var(--border)] text-xs font-semibold text-[var(--teal-900)]">{p}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Schools */}
                  <Card className="p-6">
                    <SectionHeader icon="school" iconBg="bg-green-50" iconColor="text-green-600" title="Nearby Schools" />
                    {report.schools.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No school data available for this area.</p>
                    ) : (
                      <div className="divide-y divide-[var(--border)]">
                        {report.schools.map((school, i) => (
                          <div key={i} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[var(--teal-900)] truncate">{school.name}</p>
                              <p className="text-[11px] text-[var(--muted)] capitalize">{school.type} · {school.distance}</p>
                            </div>
                            {school.ofstedRating && (
                              <span className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-black border ${ofstedClass(school.ofstedRating)}`}>
                                {school.ofstedRating}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>

                  {/* Crime */}
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="size-9 rounded-xl bg-amber-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600">security</span>
                      </span>
                      <h3 className="font-black font-heading text-[var(--teal-900)]">Crime</h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${crimeClass(report.crime.level)}`}>
                        {report.crime.level}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text)] leading-relaxed mb-3">{report.crime.recentStats}</p>
                    {report.crime.commonTypes.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-2">Common types</p>
                        <div className="flex flex-wrap gap-2">
                          {report.crime.commonTypes.map((t, i) => (
                            <span key={i} className="px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 capitalize">{t}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Flood Risk */}
                  <Card className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="size-9 rounded-xl bg-blue-50 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600">water</span>
                      </span>
                      <h3 className="font-black font-heading text-[var(--teal-900)]">Flood Risk</h3>
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${riskClass(report.floodRisk.riskLevel)}`}>
                        {report.floodRisk.riskLevel}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text)] leading-relaxed">{report.floodRisk.details}</p>
                  </Card>

                  {/* Transport */}
                  <Card className="p-6">
                    <SectionHeader icon="train" iconBg="bg-[var(--teal-050)]" iconColor="text-[var(--teal-600)]" title="Transport Links" />
                    {report.transport.length === 0 ? (
                      <p className="text-sm text-[var(--muted)]">No transport data available.</p>
                    ) : (
                      <SimpleList items={report.transport} />
                    )}
                  </Card>

                  {/* Healthcare */}
                  {report.healthcare.length > 0 && (
                    <Card className="p-6">
                      <SectionHeader icon="local_hospital" iconBg="bg-red-50" iconColor="text-red-500" title="Healthcare" />
                      <SimpleList items={report.healthcare} />
                    </Card>
                  )}

                  {/* Powered by + disclaimer */}
                  <div className="flex items-center justify-between pt-2">
                    <p className="text-xs text-[var(--muted)]">
                      Powered by{' '}
                      <a
                        href="https://home-notes-khaki.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#17afaf] hover:underline"
                      >
                        Home Notes
                      </a>
                      {' · by HSR'}
                    </p>
                  </div>
                  <Card className="p-4 bg-amber-50 border-amber-200">
                    <p className="text-xs text-amber-900 leading-relaxed">
                      <strong>Disclaimer:</strong> Reports are AI-generated and may not reflect current conditions.
                      Always verify independently before making any property decision.
                    </p>
                  </Card>

                </div>
              ) : (

                /* Lead capture gate */
                <Card className="p-8 sm:p-10 text-center space-y-6">
                  <div className="size-14 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center mx-auto">
                    <span className="material-symbols-outlined text-[#17afaf] text-3xl">lock_open</span>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-black font-heading text-[var(--teal-900)]">View the full area report</h3>
                    <p className="text-sm text-[var(--muted)] max-w-sm mx-auto">
                      Enter your details to unlock schools with Ofsted ratings, transport links, flood risk detail, and healthcare.
                    </p>
                  </div>

                  <form onSubmit={handleLeadCapture} className="space-y-4 text-left max-w-sm mx-auto">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Your name</label>
                      <input
                        type="text"
                        required
                        value={leadName}
                        onChange={(e) => setLeadName(e.target.value)}
                        className="w-full"
                        placeholder="Jane Smith"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Email address</label>
                      <input
                        type="email"
                        required
                        value={leadEmail}
                        onChange={(e) => setLeadEmail(e.target.value)}
                        className="w-full"
                        placeholder="you@example.com"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full h-12 rounded-xl bg-[#17afaf] text-white font-black text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
                    >
                      {submittingLead ? 'Unlocking…' : 'View Full Report'}
                    </button>
                    <p className="text-[10px] text-center text-[var(--muted)]">
                      No spam — just your report. By continuing you agree to our{' '}
                      <Link to="/privacy-policy" className="underline hover:text-[var(--teal-600)]">privacy policy</Link>.
                    </p>
                  </form>

                  <p className="text-xs text-[var(--muted)]">
                    Already have an account?{' '}
                    <Link to="/login" className="font-bold text-[#17afaf] hover:underline">Sign in for instant access</Link>
                  </p>
                </Card>
              )}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
}
