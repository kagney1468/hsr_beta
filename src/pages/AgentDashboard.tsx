/*
 * MIGRATION — run in Supabase SQL editor before deploying this release:
 *
 * ALTER TABLE agencies ADD COLUMN IF NOT EXISTS referral_token TEXT UNIQUE;
 * UPDATE agencies SET referral_token = substr(md5(random()::text), 1, 8) WHERE referral_token IS NULL;
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getGreeting } from '../lib/greeting';

type Tab = 'pipeline' | 'leads' | 'invite';

export default function AgentDashboard() {
  const { user } = useAuth();
  const getInitialTab = (): Tab => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'leads' || hash === 'invite') return hash;
    return 'pipeline';
  };
  const [tab, setTab] = useState<Tab>(getInitialTab);
  const location = useLocation();
  useEffect(() => {
    const hash = location.hash.replace('#', '');
    if (hash === 'leads' || hash === 'invite') setTab(hash);
    else if (hash === '' || hash === 'pipeline') setTab('pipeline');
  }, [location.hash]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [packViewsThisMonth, setPackViewsThisMonth] = useState(0);
  const [publicUserId, setPublicUserId] = useState<string | null>(null);
  const publicUserIdRef = useRef<string | null>(null);
  const [agentFirstName, setAgentFirstName] = useState<string | null>(null);
  const [agencyId, setAgencyId] = useState<string | null>(null);
  const [referralToken, setReferralToken] = useState<string | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);
  const [generatingToken, setGeneratingToken] = useState(false);

  // Invite state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDashboardData = useCallback(async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    else setIsRefreshing(true);

    try {
      const pubId = publicUserIdRef.current ?? await getPublicUserIdByAuthUserId(user.id);
      if (!publicUserIdRef.current) {
        publicUserIdRef.current = pubId;
        setPublicUserId(pubId);
      }

      // Get this agent's agency
      const { data: agencyData } = await supabase
        .from('agencies')
        .select('id, agency_name, referral_token')
        .eq('agent_user_id', pubId)
        .maybeSingle();

      if (!agencyData) {
        // Agent has no agency yet — send them to complete onboarding
        if (!silent) {
          window.location.replace('/agent/onboarding');
        }
        setProperties([]);
        setLeads([]);
        return;
      }

      setAgencyId(prev => (prev !== agencyData.id ? agencyData.id : prev));

      // Get sellers linked to this agency
      const { data: sellersData } = await supabase
        .from('users')
        .select('id, full_name, email, phone')
        .eq('agency_id', agencyData.id);

      const sellerIds = (sellersData || []).map((s: any) => s.id);
      const sellersById = new Map((sellersData || []).map((s: any) => [s.id, s]));

      if (sellerIds.length === 0) {
        setProperties([]);
        setLeads([]);
        return;
      }

      // Get properties for these sellers
      const { data: propsData } = await supabase
        .from('properties')
        .select('*')
        .in('seller_user_id', sellerIds);

      const propIds = (propsData || []).map((p: any) => p.id);

      if (propIds.length === 0) {
        setProperties([]);
        setLeads([]);
        return;
      }

      // Fetch documents, declarations, and viewers in parallel
      // Viewers join pack_viewers → properties via agency_id so leads are never missed
      const [{ data: docsData }, { data: declData }, { data: viewersData }] = await Promise.all([
        supabase.from('documents').select('property_id, document_type').in('property_id', propIds),
        supabase.from('seller_declarations').select('property_id, confirms_accuracy').in('property_id', propIds),
        supabase
          .from('pack_viewers')
          .select('*, users(full_name, profession_type, regulatory_body, regulatory_number, firms(firm_name, company_number)), properties!inner(id, address_line1, address_postcode)')
          .eq('properties.agency_id', agencyData.id)
          .order('viewed_at', { ascending: false }),
      ]);

      // Views this month
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const viewsThisMonth = (viewersData || []).filter(
        (v: any) => new Date(v.viewed_at) >= monthStart
      ).length;
      setPackViewsThisMonth(viewsThisMonth);

      // Enrich properties
      const enriched = (propsData || []).map((prop: any) => {
        const propDocs = (docsData || []).filter((d: any) => d.property_id === prop.id);
        const propDecl = (declData || []).find((d: any) => d.property_id === prop.id);
        const propViews = (viewersData || []).filter((v: any) => v.property_id === prop.id).length;
        const seller = sellersById.get(prop.seller_user_id);

        let score = prop.pack_completion_percentage || 0;
        if (score === 0) {
          if (prop.address_line1 && prop.property_type) score += 20;
          if (propDocs.length >= 1) score += 20;
          if (propDocs.some((d: any) => d.document_type === 'title_deeds')) score += 20;
          if (propDocs.length >= 4) score += 20;
          if (propDecl?.confirms_accuracy) score += 20;
        }

        let status: 'Action Required' | 'In Progress' | 'Pack Complete' = 'In Progress';
        if (score >= 100) status = 'Pack Complete';
        else if (score < 30) status = 'Action Required';

        return {
          ...prop,
          sellerName: seller?.full_name || 'Pending Onboarding',
          score,
          status,
          viewCount: propViews,
        };
      });

      setProperties(enriched);

      setLeads(
        (viewersData || []).map((v: any) => {
          const verifiedUser = v.users;
          const verifiedFirm = verifiedUser?.firms;
          const nestedProp = v.properties;
          return {
            ...v,
            propertyAddress: nestedProp ? [nestedProp.address_line1, nestedProp.address_postcode].filter(Boolean).join(', ') : 'Unknown Property',
            // Verified data from accounts — takes precedence over registration-time data
            verified_firm_name: verifiedFirm?.firm_name || null,
            verified_company_number: verifiedFirm?.company_number || null,
            verified_profession_type: verifiedUser?.profession_type || null,
            verified_regulatory_body: verifiedUser?.regulatory_body || null,
            verified_regulatory_number: verifiedUser?.regulatory_number || null,
            is_verified_professional: !!verifiedUser && verifiedUser.profession_type != null,
          };
        })
      );
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setAgentFirstName(data.full_name.split(' ')[0]);
      });
  }, [user?.id]);

  // Fetch referral token once when agencyId is first resolved — separate from loadDashboardData
  // to avoid re-render loops from unconditional setState on every dashboard refresh.
  useEffect(() => {
    if (!agencyId) return;
    supabase
      .from('agencies')
      .select('referral_token')
      .eq('id', agencyId)
      .maybeSingle()
      .then(({ data }) => {
        const next = data?.referral_token ?? null;
        setReferralToken(prev => (prev !== next ? next : prev));
      });
  }, [agencyId]);

  useEffect(() => {
    loadDashboardData();

    const sub = supabase
      .channel('agent_dashboard_rt')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'properties' }, () => loadDashboardData(true))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'documents' }, () => loadDashboardData(true))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'pack_viewers' }, () => loadDashboardData(true))
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'seller_declarations' }, () => loadDashboardData(true))
      .subscribe();

    return () => { supabase.removeChannel(sub); };
  }, [loadDashboardData]);

  // KPIs
  const packsComplete = properties.filter(p => p.status === 'Pack Complete').length;
  const awaitingAction = properties.filter(p => p.status === 'Action Required').length;

  const kpis = [
    { label: 'Total Properties', value: properties.length, icon: 'home_work', color: 'text-[var(--teal-600)]' },
    { label: 'Packs Complete', value: packsComplete, icon: 'verified', color: 'text-[var(--teal-600)]' },
    { label: 'Awaiting Seller Action', value: awaitingAction, icon: 'error_outline', color: 'text-red-500' },
    { label: 'Pack Views This Month', value: packViewsThisMonth, icon: 'visibility', color: 'text-blue-500' },
  ];

  // Invite seller — sends branded email via send-invite Edge Function
  const handleInviteSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName) return;
    if (!publicUserId) {
      setInviteResult({ type: 'error', text: 'Your account is still loading. Please wait a moment and try again.' });
      return;
    }
    setInviting(true);
    setInviteResult(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke('send-invite', {
        body: { seller_name: inviteName.trim(), seller_email: inviteEmail.trim(), agent_ref: publicUserId },
      });
      if (fnError) throw new Error((fnError as any)?.message || 'Failed to send invitation.');
      if (result?.error) throw new Error(result.error);

      setInviteResult({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
      setInviteName('');
      setInviteEmail('');
    } catch (err: any) {
      setInviteResult({ type: 'error', text: err.message || 'Failed to send invitation.' });
    } finally {
      setInviting(false);
    }
  };

  const generateReferralToken = async () => {
    if (!agencyId) return;
    setGeneratingToken(true);
    try {
      const token = Math.random().toString(36).substring(2, 10);
      const { error } = await supabase
        .from('agencies')
        .update({ referral_token: token })
        .eq('id', agencyId);
      if (!error) setReferralToken(token);
    } catch (err) {
      console.error('Failed to generate referral token:', err);
    } finally {
      setGeneratingToken(false);
    }
  };

  const handleCopyReferral = async () => {
    if (!referralToken) return;
    await navigator.clipboard.writeText(
      `https://www.homesalesready.com/signup/seller?ref=${referralToken}`
    );
    setReferralCopied(true);
    setTimeout(() => setReferralCopied(false), 2000);
  };

  // CSV export
  const handleExportLeads = () => {
    const headers = ['Name', 'Email', 'Phone', 'Type', 'Firm Name', 'Company Number', 'Profession', 'Reg Body', 'Reg Number', 'Property', 'Date', 'Is Selling', 'Selling Location'];
    const rows = leads.map((l: any) => [
      l.viewer_name || '',
      l.viewer_email || '',
      l.viewer_phone || '',
      l.viewer_type || 'buyer',
      l.verified_firm_name || l.company_name || '',
      l.verified_company_number || '',
      l.verified_profession_type ? l.verified_profession_type.replace('_', ' ') : '',
      l.verified_regulatory_body || '',
      l.verified_regulatory_number || '',
      l.propertyAddress || '',
      new Date(l.viewed_at).toLocaleDateString('en-GB'),
      l.is_selling ? 'Yes' : 'No',
      l.selling_location || '',
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leads-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: 'pipeline', label: 'Pipeline', icon: 'home_work' },
    { id: 'leads', label: `Leads (${leads.length})`, icon: 'group' },
    { id: 'invite', label: 'Invite Seller', icon: 'person_add' },
  ];

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 pb-0 border-b border-[var(--border)] bg-white">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
          <div>
            <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
              {getGreeting(agentFirstName)}
            </h1>
            <p className="text-[var(--muted)] mt-1 flex items-center gap-2 text-sm">
              Here's your property pipeline
              {isRefreshing && <span className="size-1.5 rounded-full bg-[var(--teal-500)] animate-pulse" />}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 sm:px-5 py-3 text-xs sm:text-sm font-bold transition-all border-b-2 -mb-px whitespace-nowrap ${
                tab === t.id
                  ? 'border-[var(--teal-600)] text-[var(--teal-900)]'
                  : 'border-transparent text-[var(--muted)] hover:text-[var(--teal-900)]'
              }`}
            >
              <span className="material-symbols-outlined text-[16px] sm:text-[18px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <main className="p-6 md:p-10 space-y-8">

        {/* ── PIPELINE TAB ── */}
        {tab === 'pipeline' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {kpis.map((kpi, i) => (
                <Card key={i} className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">{kpi.label}</span>
                    <span className={`material-symbols-outlined ${kpi.color} opacity-60`}>{kpi.icon}</span>
                  </div>
                  <div className="text-4xl font-black font-heading tracking-tight text-[var(--teal-900)]">{kpi.value}</div>
                </Card>
              ))}
            </div>

            {/* Referral Link */}
            <Card className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="size-10 shrink-0 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)]">
                <span className="material-symbols-outlined text-xl">link</span>
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Seller Referral Link</p>
                {referralToken ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs font-mono text-[var(--teal-900)] bg-[var(--teal-050)] px-3 py-1.5 rounded-lg border border-[var(--border)] truncate max-w-full sm:max-w-[420px]">
                      https://www.homesalesready.com/signup/seller?ref={referralToken}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyReferral}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-bold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors"
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {referralCopied ? 'check' : 'content_copy'}
                      </span>
                      {referralCopied ? 'Copied!' : 'Copy link'}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={generateReferralToken}
                    disabled={generatingToken}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--teal-600)] text-white text-xs font-bold hover:bg-[var(--teal-900)] disabled:opacity-50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_link</span>
                    {generatingToken ? 'Generating…' : 'Generate link'}
                  </button>
                )}
                <p className="text-xs text-[var(--muted)]">
                  Share this link with sellers — they'll be automatically connected to your agency when they sign up.
                </p>
              </div>
            </Card>

            {/* Property Pipeline — mobile cards */}
            <Card className="overflow-hidden">
              <div className="px-4 sm:px-6 py-5 border-b border-[var(--border)] bg-[var(--teal-050)]/40">
                <h2 className="font-black font-heading text-[var(--teal-900)]">Property Pipeline</h2>
              </div>

              {/* Mobile card list (hidden on sm+) */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {properties.length === 0 ? (
                  <div className="p-10 text-center flex flex-col items-center gap-3 text-[var(--muted)]">
                    <span className="material-symbols-outlined text-4xl text-[var(--border)]">inventory_2</span>
                    <p className="font-medium italic text-sm">No properties yet. Invite sellers to get started.</p>
                    <button onClick={() => setTab('invite')} className="mt-2 text-[var(--teal-600)] font-bold text-sm hover:underline">Invite a seller →</button>
                  </div>
                ) : properties.map(prop => (
                  <Link key={prop.id} to={`/agent/property/${prop.id}`} className="block p-4 hover:bg-[var(--teal-050)] transition-colors">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="font-bold text-[var(--teal-900)] text-sm">{prop.address_line1}</div>
                        <div className="text-[10px] text-[var(--muted)] uppercase tracking-wider">{prop.address_postcode}</div>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        prop.status === 'Pack Complete' ? 'bg-[var(--teal-050)] text-[var(--teal-600)] border-[var(--teal-050)]'
                        : prop.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100'
                        : 'bg-red-50 text-red-500 border-red-100'
                      }`}>
                        <span className={`size-1.5 rounded-full ${prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' : prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'}`} />
                        {prop.status}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-1.5 w-full bg-[var(--teal-050)] border border-[var(--border)] rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' : prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${prop.score}%` }} />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-semibold text-[var(--muted)]">
                        <span>{prop.score}% complete</span>
                        <span>{prop.sellerName}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Desktop table (hidden on mobile) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--teal-050)]">
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Address</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Seller</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em] w-48">Progress</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Views</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Updated</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {properties.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-[var(--muted)]">
                            <span className="material-symbols-outlined text-4xl text-[var(--border)]">inventory_2</span>
                            <p className="font-medium italic text-sm">No properties yet. Invite sellers to get started.</p>
                            <button onClick={() => setTab('invite')} className="mt-2 text-[var(--teal-600)] font-bold text-sm hover:underline">Invite a seller →</button>
                          </div>
                        </td>
                      </tr>
                    ) : properties.map(prop => (
                      <tr key={prop.id} className="hover:bg-[var(--teal-050)]/50 transition-colors group cursor-pointer">
                        <td className="px-6 py-5">
                          <Link to={`/agent/property/${prop.id}`} className="block">
                            <div className="font-bold text-[var(--teal-900)] group-hover:text-[var(--teal-600)] transition-colors">{prop.address_line1}</div>
                            <div className="text-[11px] text-[var(--muted)] mt-0.5 uppercase tracking-wider">{prop.address_postcode}</div>
                          </Link>
                        </td>
                        <td className="px-6 py-5 text-sm text-[var(--text)] font-medium">{prop.sellerName}</td>
                        <td className="px-6 py-5">
                          <div className="space-y-1.5">
                            <div className="h-1.5 w-full bg-[var(--teal-050)] border border-[var(--border)] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-700 ${
                                  prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' :
                                  prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${prop.score}%` }}
                              />
                            </div>
                            <div className="text-[10px] font-black text-[var(--muted)]">{prop.score}% COMPLETE</div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            prop.status === 'Pack Complete' ? 'bg-[var(--teal-050)] text-[var(--teal-600)] border-[var(--teal-050)]'
                            : prop.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border-amber-100'
                            : 'bg-red-50 text-red-500 border-red-100'
                          }`}>
                            <span className={`size-1.5 rounded-full ${prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' : prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'}`} />
                            {prop.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-sm font-bold text-[var(--teal-900)]">{prop.viewCount}</td>
                        <td className="px-6 py-5 text-[11px] font-bold text-[var(--muted)] uppercase tracking-wider">
                          {prop.updated_at || prop.created_at
                            ? new Date(prop.updated_at || prop.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                            : '—'}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <Link to={`/agent/property/${prop.id}`} className="p-2 hover:bg-[var(--teal-050)] rounded-lg transition-colors inline-block">
                            <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--teal-600)] transition-colors">chevron_right</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        )}

        {/* ── LEADS TAB ── */}
        {tab === 'leads' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">All Viewer Registrations</h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Viewers who registered to access property packs across your portfolio.
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--teal-050)] text-[var(--teal-600)] text-[10px] font-black uppercase tracking-wider border border-[var(--border)]">
                    <span className="size-1.5 rounded-full bg-[var(--teal-500)] animate-pulse" />
                    Priority leads highlighted
                  </span>
                </p>
              </div>
              {leads.length > 0 && (
                <Button variant="outline" onClick={handleExportLeads} className="h-10 px-4 rounded-xl flex items-center gap-2 text-sm font-bold">
                  <span className="material-symbols-outlined text-[18px]">download</span>
                  Export CSV
                </Button>
              )}
            </div>

            <Card className="overflow-hidden">
              {/* Mobile card list */}
              <div className="sm:hidden divide-y divide-[var(--border)]">
                {leads.length === 0 ? (
                  <p className="px-6 py-12 text-center text-[var(--muted)] italic text-sm">No viewer registrations yet.</p>
                ) : leads.map((lead: any) => (
                  <div key={lead.id} className={`p-4 space-y-2 ${lead.viewer_type === 'professional' ? 'bg-blue-50/60' : lead.is_selling ? 'bg-[var(--teal-050)]/60' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {lead.is_selling && lead.viewer_type !== 'professional' && <div className="size-2 rounded-full bg-[var(--teal-500)] animate-pulse shrink-0 mt-1" />}
                        <div className="min-w-0">
                          <div className={`font-bold text-sm truncate ${lead.viewer_type === 'professional' ? 'text-blue-900' : lead.is_selling ? 'text-[var(--teal-900)]' : 'text-[var(--text)]'}`}>{lead.viewer_name || '—'}</div>
                          <div className="text-[10px] text-[var(--muted)] font-mono truncate">{lead.viewer_email || '—'}</div>
                        </div>
                      </div>
                      {lead.viewer_type === 'professional' ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200">Pro</span>
                      ) : lead.is_selling ? (
                        <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--teal-050)] text-[var(--teal-600)] text-[9px] font-black uppercase tracking-wider border border-[var(--border)]">Priority</span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-medium text-[var(--muted)]">Buyer</span>
                      )}
                    </div>
                    {lead.viewer_type === 'professional' && (
                      <div className="space-y-1">
                        {lead.is_verified_professional ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200">
                              <span className="material-symbols-outlined text-[10px]">verified</span>
                              Verified account
                            </span>
                            <div className="font-bold text-[10px] text-blue-900">{lead.verified_firm_name}</div>
                            {lead.verified_profession_type && (
                              <div className="text-[10px] text-blue-700 capitalize">
                                {lead.verified_profession_type.replace('_', ' ')}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider border border-amber-200">
                              <span className="material-symbols-outlined text-[10px]">help</span>
                              Unverified
                            </span>
                            {lead.company_name && (
                              <div className="text-[10px] text-[var(--muted)] font-medium">{lead.company_name}</div>
                            )}
                            <div className="text-[10px] text-[var(--muted)]">No HSR account</div>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[10px] text-[var(--muted)] font-medium">
                      <span>{lead.propertyAddress}</span>
                      <span>{new Date(lead.viewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                    </div>
                    {lead.viewer_phone && <div className="text-[10px] text-[var(--muted)]">{lead.viewer_phone}</div>}
                    {lead.viewer_type !== 'professional' && lead.is_selling && lead.selling_location && (
                      <div className="text-[10px] text-[var(--teal-600)] font-semibold">Selling in {lead.selling_location}</div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--teal-050)]">
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Viewer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Type</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Phone</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Property Viewed</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-[var(--muted)] uppercase tracking-[0.15em]">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-[var(--muted)] italic text-sm">
                          No viewer registrations yet. Share property packs to generate leads.
                        </td>
                      </tr>
                    ) : leads.map((lead: any) => (
                      <tr key={lead.id} className={`transition-colors ${lead.viewer_type === 'professional' ? 'bg-blue-50/40 hover:bg-blue-50' : lead.is_selling ? 'bg-[var(--teal-050)]/60 hover:bg-[var(--teal-050)]' : 'hover:bg-gray-50'}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {lead.is_selling && lead.viewer_type !== 'professional' && <div className="size-2 rounded-full bg-[var(--teal-500)] animate-pulse shrink-0" />}
                            <div>
                              <div className={`font-bold text-sm ${lead.viewer_type === 'professional' ? 'text-blue-900' : lead.is_selling ? 'text-[var(--teal-900)]' : 'text-[var(--text)]'}`}>{lead.viewer_name || '—'}</div>
                              <div className="text-[10px] text-[var(--muted)] font-mono">{lead.viewer_email || '—'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {lead.viewer_type === 'professional' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-wider border border-blue-200">
                              <span className="material-symbols-outlined text-[12px]">badge</span>
                              Professional
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--teal-050)] text-[var(--teal-600)] text-[10px] font-black uppercase tracking-wider border border-[var(--border)]">
                              <span className="material-symbols-outlined text-[12px]">home</span>
                              Buyer
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-[var(--muted)]">{lead.viewer_phone || '—'}</td>
                        <td className="px-6 py-4 text-sm text-[var(--text)] font-medium">{lead.propertyAddress}</td>
                        <td className="px-6 py-4 text-[11px] text-[var(--muted)] font-medium">
                          {new Date(lead.viewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          {lead.viewer_type === 'professional' ? (
                            <div className="space-y-1">
                              {lead.is_verified_professional ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider border border-blue-200">
                                      <span className="material-symbols-outlined text-[10px]">verified</span>
                                      Verified account
                                    </span>
                                  </div>
                                  <div className="font-bold text-sm text-blue-900">{lead.verified_firm_name}</div>
                                  {lead.verified_profession_type && (
                                    <div className="text-[10px] text-blue-700 font-semibold capitalize">
                                      {lead.verified_profession_type.replace('_', ' ')}
                                    </div>
                                  )}
                                  {lead.verified_regulatory_body && lead.verified_regulatory_number && (
                                    <div className="text-[10px] text-[var(--muted)]">
                                      {lead.verified_regulatory_body}: {lead.verified_regulatory_number}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-black uppercase tracking-wider border border-amber-200">
                                    <span className="material-symbols-outlined text-[10px]">help</span>
                                    Unverified
                                  </span>
                                  {lead.company_name && (
                                    <div className="text-sm text-[var(--muted)] font-medium">{lead.company_name}</div>
                                  )}
                                  <div className="text-[10px] text-[var(--muted)]">No HSR account — self-declared details only</div>
                                </div>
                              )}
                            </div>
                          ) : lead.is_selling ? (
                            <div className="space-y-0.5">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--teal-050)] text-[var(--teal-600)] text-[10px] font-black uppercase tracking-wider border border-[var(--border)]">Priority Lead</span>
                              {lead.selling_location && <div className="text-[10px] text-[var(--muted)] pl-1">Selling in {lead.selling_location}</div>}
                            </div>
                          ) : (
                            <span className="text-[11px] font-medium text-[var(--muted)]">Chain-free buyer</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── INVITE SELLER TAB ── */}
        {tab === 'invite' && (
          <div className="max-w-2xl space-y-8">
            <div>
              <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">Invite a Seller</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Two ways to link sellers to your agency account.</p>
            </div>

            {/* Method 1 */}
            <Card className="p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[var(--teal-600)] text-white flex items-center justify-center font-black font-heading text-sm shrink-0">1</div>
                <div>
                  <h3 className="font-black font-heading text-[var(--teal-900)]">Send email invitation</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">The seller receives a magic link that automatically links their account to your agency.</p>
                </div>
              </div>

              {inviteResult && (
                <div className={`p-4 rounded-xl border font-semibold text-sm animate-in fade-in duration-300 ${
                  inviteResult.type === 'success'
                    ? 'bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]'
                    : 'bg-[#fee2e2] border-[#fecaca] text-[#b91c1c]'
                }`}>
                  {inviteResult.text}
                </div>
              )}

              <form onSubmit={handleInviteSeller} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Seller's Full Name</label>
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={e => setInviteName(e.target.value)}
                    className="w-full"
                    placeholder="Jane Smith"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Seller Email Address</label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={e => setInviteEmail(e.target.value)}
                    className="w-full"
                    placeholder="seller@example.com"
                  />
                </div>
                <Button type="submit" variant="primary" disabled={inviting || !inviteEmail || !inviteName} className="h-12 px-8 rounded-xl font-bold">
                  {inviting ? 'Sending…' : 'Send Invitation Email'}
                </Button>
              </form>
            </Card>

            {/* Method 2 */}
            <Card className="p-8 space-y-4 border-dashed">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-600)] flex items-center justify-center font-black font-heading text-sm shrink-0">2</div>
                <div>
                  <h3 className="font-black font-heading text-[var(--teal-900)]">Seller self-refers</h3>
                  <p className="text-xs text-[var(--muted)] mt-0.5">Sellers can enter your agency name during signup — accounts are linked automatically.</p>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)]">
                <p className="text-xs text-[var(--teal-900)]">
                  On the seller signup page, there is a field: <strong>"Were you referred by an estate agent? Enter their agency name"</strong>.
                  If the name matches your agency exactly, their account will be linked to yours on first login.
                </p>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
