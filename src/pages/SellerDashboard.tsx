import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { updatePackCompletion } from '../lib/completion';
import { getPackShareUrl } from '../lib/siteUrl';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import { getGreeting } from '../lib/greeting';
import { QRCodeSVG } from 'qrcode.react';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    property: any;
    share: any;
    materialInfo: any;
    documents: any[];
    viewers: any[];
    viewerCount: number;
  }>({
    property: null,
    share: null,
    materialInfo: null,
    documents: [],
    viewers: [],
    viewerCount: 0,
  });

  const [stats, setStats] = useState({
    percentage: 0,
    sections: {
      property: { status: 'urgent', label: 'Action Required', desc: 'Address, type, tenure' },
      material: { status: 'urgent', label: 'Action Required', desc: 'Utilities, parking, history' },
      documents: { status: 'urgent', label: 'Action Required', desc: 'Title deeds, EPC' },
    },
  });

  const getStatusLabel = (status: string) => {
    if (status === 'complete') return 'Complete';
    if (status === 'in-progress') return 'In Progress';
    return 'Action Required';
  };

  const loadDashboardData = useCallback(
    async (silent = false) => {
      if (!user) return;

      if (!silent) setLoading(true);

      try {
        const publicUserId = await getPublicUserIdByAuthUserId(user.id);
        const { data: property, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', publicUserId)
          .maybeSingle();

        if (propError) throw propError;
        if (!property) {
          if (!silent) setLoading(false);
          return;
        }

        const { data: materialInfo } = await supabase
          .from('material_information')
          .select('*')
          .eq('property_id', property.id)
          .maybeSingle();

        const { data: documents } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', property.id);

        const { data: share } = await supabase
          .from('shares')
          .select('*')
          .eq('property_id', property.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const { data: viewers } = await supabase
          .from('pack_viewers')
          .select('*')
          .eq('property_id', property.id)
          .order('viewed_at', { ascending: false });

        const { count: viewerCount } = await supabase
          .from('pack_viewers')
          .select('*', { count: 'exact', head: true })
          .eq('property_id', property.id);

        const currentPercentage = await updatePackCompletion(property.id);
        const propertyWithPct = { ...property, pack_completion_percentage: currentPercentage };

        const pStatus = property.property_type && property.address_line1 && property.address_postcode ? 'complete' : 'urgent';
        const mStatus = materialInfo && materialInfo.water_supply ? 'complete' : 'urgent';

        let mandatoryCount = 1;
        if ((property.tenure || '').toLowerCase() === 'leasehold') mandatoryCount++;
        const hasEpc = !!(
          materialInfo?.epc_rating ||
          property.epc_rating ||
          documents?.find((d: any) => d.document_type === 'epc')
        );
        let dUploaded = hasEpc ? 1 : 0;
        if (documents?.find((d: any) => d.document_type === 'title_deeds')) dUploaded++;
        if (
          (property.tenure || '').toLowerCase() === 'leasehold' &&
          documents?.find((d: any) => d.document_type === 'leasehold')
        )
          dUploaded++;

        const dStatus =
          dUploaded > 0 ? (dUploaded >= mandatoryCount + 1 ? 'complete' : 'in-progress') : 'urgent';

        setStats({
          percentage: currentPercentage,
          sections: {
            property: { status: pStatus, label: getStatusLabel(pStatus), desc: 'Address, type, tenure' },
            material: { status: mStatus, label: getStatusLabel(mStatus), desc: 'Utilities, parking, history' },
            documents: { status: dStatus, label: getStatusLabel(dStatus), desc: 'Title deeds, EPC' },
          },
        });

        setData({
          property: propertyWithPct,
          share,
          materialInfo,
          documents: documents || [],
          viewers: viewers || [],
          viewerCount: viewerCount || 0,
        });
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [user]
  );

  useEffect(() => {
    loadDashboardData(false);
  }, [loadDashboardData]);

  useEffect(() => {
    const pid = data.property?.id;
    if (!pid) return;

    const channel = supabase
      .channel(`seller-dash-${pid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'material_information', filter: `property_id=eq.${pid}` },
        () => loadDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `property_id=eq.${pid}` },
        () => loadDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'properties', filter: `id=eq.${pid}` },
        () => loadDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shares', filter: `property_id=eq.${pid}` },
        () => loadDashboardData(true)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pack_viewers', filter: `property_id=eq.${pid}` },
        () => loadDashboardData(true)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [data.property?.id, loadDashboardData]);

  const getContinuePath = () => {
    if (stats.sections.property.status !== 'complete') return '/seller/property';
    if (stats.sections.material.status !== 'complete') return '/seller/property';
    if (stats.sections.documents.status !== 'complete') return '/seller/documents';
    return '/seller/declaration';
  };

  const [copying, setCopying] = useState(false);
  const [copyingRef, setCopyingRef] = useState(false);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(
    () => localStorage.getItem('hsr_seller_onboarding_dismissed') === 'true'
  );

  const handleDismissOnboarding = () => {
    localStorage.setItem('hsr_seller_onboarding_dismissed', 'true');
    setOnboardingDismissed(true);
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from('users')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setFirstName(data.full_name.split(' ')[0]);
      });
  }, [user]);

  const ensureShareLink = async () => {
    if (!data.property) return null;
    if (data.share) return data.share;

    const newToken = crypto.randomUUID();
    const { data: created, error } = await supabase
      .from('shares')
      .insert({
        property_id: data.property.id,
        token: newToken,
        active: true,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    setData((prev) => ({ ...prev, share: created }));
    return created;
  };

  const shareUrl = data.share?.token ? getPackShareUrl(data.share.token) : '';

  const handleCopyLink = async () => {
    try {
      const share = await ensureShareLink();
      if (!share?.token) return;
      const link = getPackShareUrl(share.token);
      await navigator.clipboard.writeText(link);
      setCopying(true);
      setTimeout(() => setCopying(false), 2000);
    } catch (err) {
      console.error('Error copying share link:', err);
    }
  };

  const handleCopyReference = async () => {
    const ref = data.property?.pack_reference;
    if (!ref) return;
    await navigator.clipboard.writeText(ref);
    setCopyingRef(true);
    setTimeout(() => setCopyingRef(false), 2000);
  };

  const handleDownloadQR = () => {
    const share = data.share;
    if (!share?.token) return;
    const svg = document.getElementById('hsr-qr-code');
    if (!svg) return;
    const serialiser = new XMLSerializer();
    const svgStr = serialiser.serializeToString(svg);
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 460;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 460);
      ctx.drawImage(img, 40, 40, 320, 320);
      ctx.fillStyle = '#0d4a4a';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('homesalesready.com/find', 200, 400);
      ctx.fillStyle = '#17afaf';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(data.property?.pack_reference || '', 200, 430);
      const link = document.createElement('a');
      link.download = `${data.property?.pack_reference || 'hsr-pack'}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
  };

  const toggleLinkStatus = async () => {
    const share = await ensureShareLink();
    if (!share) return;
    const newStatus = !share.active;
    const { error } = await supabase.from('shares').update({ active: newStatus }).eq('id', share.id);

    if (!error) {
      setData((prev) => ({
        ...prev,
        share: { ...prev.share, active: newStatus },
      }));
    }
  };

  const pct = stats.percentage;
  /** Teal when ≥70%; grey when &lt;70%. If a share exists and is toggled off, treat as not shareable. */
  const shareBlocked = data.share && data.share.active === false;
  const shareButtonActive = pct >= 70 && !shareBlocked;

  const handleShareMyPack = async () => {
    if (pct < 70) return;
    try {
      const share = await ensureShareLink();
      if (!share?.token || share.active === false) return;
      window.open(getPackShareUrl(share.token), '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data.property) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">home_work</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Let’s get started</h2>
          <p className="text-[var(--muted)]">
            You haven't added your property details yet. Complete your onboarding to build your property pack.
          </p>
          <Button variant="primary" onClick={() => navigate('/add-property')}>
            Add your property
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--page)] text-[var(--text)]">
      {!onboardingDismissed && (
        <div className="mx-4 md:mx-10 mt-8 border-l-4 border-[#17afaf] bg-[#f0fafa] rounded-r-2xl p-6 sm:p-8 relative">
          <button
            type="button"
            onClick={handleDismissOnboarding}
            className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full text-[var(--muted)] hover:text-[var(--teal-900)] hover:bg-[#17afaf]/10 transition-colors"
            aria-label="Dismiss"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>

          <div className="max-w-3xl space-y-6 pr-8">
            <h2 className="font-heading font-black text-xl sm:text-2xl text-[var(--teal-900)] leading-tight">
              Welcome to HomeSalesReady — here's how it works
            </h2>

            <div className="space-y-5 text-sm text-[var(--text)] leading-relaxed">
              <div className="space-y-1.5">
                <p className="font-bold text-[var(--teal-900)]">What this platform does</p>
                <p>HomeSalesReady lets you build a verified information pack for your property. Buyers, solicitors, and agents can access it instantly — reducing delays and queries during your sale.</p>
              </div>

              <div className="space-y-2">
                <p className="font-bold text-[var(--teal-900)]">What you'll need to prepare</p>
                <ul className="space-y-1.5 pl-1">
                  {[
                    'Proof of ownership (title deeds or Land Registry document)',
                    'An up-to-date EPC (you can get one online or commission a new one)',
                    'Details of any planning permissions or building works',
                    "A completed seller's declaration",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="material-symbols-outlined text-[#17afaf] text-base shrink-0 mt-0.5">check_circle</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1.5">
                <p className="font-bold text-[var(--teal-900)]">How long does it take?</p>
                <p>Most sellers complete their pack in under 30 minutes. You can save progress and return at any time.</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismissOnboarding}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#17afaf] text-white font-heading font-bold text-sm hover:bg-[var(--teal-900)] transition-colors"
            >
              Got it, let's get started
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {pct >= 70 && pct < 100 && (
        <div className="bg-[#d1fae5] border-b border-[#a7f3d0] text-[#065f46] px-6 py-4 text-center font-semibold text-sm">
          Your pack is nearly ready to share
        </div>
      )}
      {pct === 100 && (
        <div className="bg-gradient-to-r from-[#d1fae5] via-[var(--teal-050)] to-[#d1fae5] border-b border-[#a7f3d0] text-[#065f46] px-6 py-4 text-center font-heading font-bold text-base flex items-center justify-center gap-2 flex-wrap">
          <span className="material-symbols-outlined text-[#059669]" aria-hidden>
            celebration
          </span>
          <span>Your pack is complete — you’re ready to share with buyers and solicitors.</span>
        </div>
      )}

      <div className="px-4 md:px-10 pt-10 pb-2">
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
          {getGreeting(firstName)}
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">Here's where your property pack is today</p>
      </div>

      <div className="px-4 md:px-10 pt-6 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] border ${
                data.share?.active
                  ? 'bg-[var(--teal-050)] text-[var(--teal-900)] border-[var(--border)]'
                  : 'bg-[#fee2e2] text-[#dc2626] border-[#fecaca]'
              }`}
            >
              {data.share?.active ? 'Link Active' : 'Link Disabled'}
            </span>
            <span className="text-[var(--muted)] text-[10px] font-semibold uppercase tracking-widest">
              Link views: {data.share?.view_count ?? 0} · Registered: {data.viewerCount}
            </span>
            <button
              type="button"
              onClick={toggleLinkStatus}
              className="text-[10px] font-semibold uppercase text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors underline decoration-[var(--border)] underline-offset-4"
            >
              {data.share?.active ? 'Disable Link' : 'Enable Link'}
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-black font-heading tracking-tight leading-tight break-words">
            {data.property.address_line1}
          </h1>
          <p className="text-lg text-[var(--muted)] font-medium tracking-tight">
            {data.property.address_postcode} • Ready for market
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
          <div className="flex flex-1 min-w-0 flex-col gap-2">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              Shareable link
            </label>
            <div className="flex rounded-xl border border-[var(--border)] bg-white overflow-hidden shadow-soft">
              <input
                readOnly
                value={shareUrl || 'Generate a link with Copy below'}
                className="hsr-input-merge flex-1 min-w-0"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                disabled={data.share ? !data.share.active : false}
                className="shrink-0 px-4 py-3 bg-[var(--teal-600)] text-white text-sm font-bold font-heading hover:bg-[var(--teal-900)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {copying ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <Tooltip
            content={
              pct < 70
                ? 'Complete at least 70% of your pack to share'
                : shareBlocked
                  ? 'Enable the share link to open your pack'
                  : 'Open your public pack in a new tab'
            }
          >
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleShareMyPack}
                disabled={!shareButtonActive}
                className={`inline-flex items-center justify-center gap-2 h-[52px] px-8 rounded-xl font-heading font-bold text-base border transition-colors ${
                  shareButtonActive
                    ? 'bg-[var(--teal-600)] text-white border-[var(--teal-600)] hover:bg-[var(--teal-900)]'
                    : 'bg-[#e5e7eb] text-[#9ca3af] border-[#d1d5db] cursor-not-allowed'
                }`}
              >
                Share My Pack
                <span className="material-symbols-outlined text-xl">send</span>
              </button>
            </div>
          </Tooltip>
        </div>
      </div>

      {data.property && (
        <div className="px-4 md:px-10 pt-6 max-w-7xl mx-auto w-full">
          <Card className="p-6 sm:p-10 rounded-[24px] space-y-6">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-xl">
                <span className="material-symbols-outlined text-xl">qr_code_2</span>
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-[var(--muted)]">Pack reference &amp; sharing</p>
                <p className="text-lg font-black font-heading text-[var(--teal-900)]">{data.property.pack_reference || '—'}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyReference}
                className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors"
              >
                <span className="material-symbols-outlined text-base">{copyingRef ? 'check' : 'content_copy'}</span>
                {copyingRef ? 'Copied!' : 'Copy reference'}
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Direct pack link</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={data.share?.token ? getPackShareUrl(data.share.token) : ''}
                      className="w-full bg-[var(--page)] text-sm text-[var(--muted)] rounded-xl border border-[var(--border)] px-4 py-3"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!data.share?.token}
                      className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors disabled:opacity-40"
                    >
                      <span className="material-symbols-outlined text-base">{copying ? 'check' : 'content_copy'}</span>
                      {copying ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-[var(--muted)]">Share this link with buyers or your estate agent to give them access to your property pack.</p>
              </div>

              {data.share?.token && (
                <div className="flex flex-col items-center gap-4">
                  <div className="p-4 bg-white border border-[var(--border)] rounded-2xl">
                    <QRCodeSVG
                      id="hsr-qr-code"
                      value={getPackShareUrl(data.share.token)}
                      size={180}
                      level="H"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadQR}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-xs font-semibold text-[var(--teal-900)] hover:bg-[var(--teal-050)] transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">download</span>
                    Download QR
                  </button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      <div className="p-4 md:p-10 space-y-16 max-w-7xl mx-auto w-full pb-32">
        <Card className="p-6 sm:p-10 md:p-14 rounded-[28px] flex flex-col lg:flex-row items-center gap-8 sm:gap-14 relative overflow-hidden group">
          <div className="absolute top-0 right-0 size-[600px] bg-[var(--teal-050)] blur-[150px] rounded-full pointer-events-none" />

          <div className="relative size-40 sm:size-56 flex-shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke={pct === 100 ? '#10b981' : 'var(--teal-600)'}
                strokeWidth="10"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * pct) / 100}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-black text-4xl sm:text-6xl text-[var(--teal-900)] tracking-tighter">{pct}%</span>
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mt-1">Complete</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-8 relative z-10">
            <div className="space-y-3">
              <h3 className="text-2xl sm:text-3xl md:text-5xl font-black font-heading tracking-tight leading-tight text-[var(--teal-900)]">
                {pct === 100
                  ? 'Pack complete'
                  : pct >= 70
                    ? 'Almost there'
                    : 'Continue building your pack'}
              </h3>
              <p className="text-[var(--muted)] text-lg max-w-2xl leading-relaxed">
                {pct === 100
                  ? 'Your pack is complete — you are ready to share with buyers, solicitors and your estate agent.'
                  : pct >= 70
                    ? 'Your pack is nearly ready to share — complete the remaining sections to strengthen your position with buyers.'
                    : "You're just getting started. Completing your profile now will shave time off your legal process later."}
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => navigate(getContinuePath())}
              className="h-12 md:h-16 px-6 md:px-10 rounded-2xl flex items-center gap-3 font-heading text-base md:text-xl group w-full md:w-auto justify-center"
            >
              Continue where I left off
              <span className="material-symbols-outlined text-xl md:text-2xl group-hover:translate-x-2 transition-transform shrink-0">
                arrow_forward
              </span>
            </Button>
          </div>
        </Card>

        <div className="space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-2">
            <h4 className="font-heading font-black text-[var(--teal-900)] text-2xl tracking-tight">Information sections</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-[#10b981]" />
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">Complete</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-[#f59e0b]" />
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">In progress</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="size-2 rounded-full bg-[#ef4444]" />
                <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">Action required</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                id: 'property',
                label: 'Property details',
                status: stats.sections.property.status,
                text: stats.sections.property.label,
                icon: 'home_work',
                desc: stats.sections.property.desc,
              },
              {
                id: 'material',
                label: 'Material information',
                status: stats.sections.material.status,
                text: stats.sections.material.label,
                icon: 'info',
                desc: stats.sections.material.desc,
              },
              {
                id: 'documents',
                label: 'Documents',
                status: stats.sections.documents.status,
                text: stats.sections.documents.label,
                icon: 'description',
                desc: stats.sections.documents.desc,
              },
            ].map((section) => (
              <Card
                key={section.id}
                onClick={() =>
                  navigate(
                    section.id === 'property'
                      ? '/seller/property'
                      : section.id === 'material'
                        ? '/seller/property'
                        : '/seller/documents'
                  )
                }
                className="p-6 sm:p-8 transition-colors group flex flex-col justify-between min-h-[180px] sm:h-[240px] rounded-[24px] cursor-pointer hover:bg-[var(--teal-050)]"
              >
                <div className="space-y-4">
                  <div
                    className={`size-14 rounded-2xl flex items-center justify-center ${
                      section.status === 'complete'
                        ? 'bg-[#d1fae5] text-[#059669]'
                        : section.status === 'in-progress'
                          ? 'bg-[#fef3c7] text-[#d97706]'
                          : 'bg-[#fee2e2] text-[#dc2626]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-3xl">{section.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-[var(--teal-900)] text-xl font-heading tracking-tight group-hover:text-[var(--teal-600)] transition-colors">
                      {section.label}
                    </h5>
                    <p className="text-[var(--muted)] text-xs font-medium leading-relaxed">{section.desc}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-2 rounded-full ${
                        section.status === 'complete'
                          ? 'bg-[#10b981]'
                          : section.status === 'in-progress'
                            ? 'bg-[#f59e0b]'
                            : 'bg-[#ef4444]'
                      }`}
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                        section.status === 'complete'
                          ? 'text-[#059669]'
                          : section.status === 'in-progress'
                            ? 'text-[#d97706]'
                            : 'text-[#dc2626]'
                      }`}
                    >
                      {section.text}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--teal-900)] group-hover:translate-x-1 transition-all">
                    arrow_forward
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-heading font-black text-[var(--teal-900)] text-2xl tracking-tight">Who has viewed my pack</h4>
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-[var(--border)]">
              {data.viewers.length} activity logged
            </span>
          </div>

          <Card className="rounded-[24px] overflow-hidden">
            {data.viewers.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {data.viewers.map((viewer, idx) => (
                  <div
                    key={idx}
                    className="p-5 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-8 hover:bg-[var(--teal-050)] transition-colors group"
                  >
                    <div className="flex items-center gap-6">
                      <div className="size-16 rounded-3xl bg-white flex items-center justify-center text-[var(--teal-600)] border border-[var(--border)] group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-4xl">person_pin</span>
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-black text-[var(--teal-900)] text-lg sm:text-2xl font-heading tracking-tight">
                          {viewer.viewer_name}
                        </h5>
                        <div className="flex items-center gap-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                            {new Date(viewer.viewed_at).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">schedule</span>
                            {new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {viewer.is_selling ? (
                        <div className="px-5 py-3 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center gap-3">
                          <div className="size-2 rounded-full bg-[var(--teal-500)] animate-pulse" />
                          <span className="text-xs font-semibold text-[var(--teal-900)] uppercase tracking-widest">
                            Also selling: {viewer.selling_location}
                          </span>
                        </div>
                      ) : (
                        <div className="px-5 py-3 rounded-2xl bg-white border border-[var(--border)] flex items-center gap-3">
                          <span className="material-symbols-outlined text-[var(--teal-600)] text-sm">bolt</span>
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
                            Chain-free buyer
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 sm:p-24 text-center space-y-6">
                <div className="size-24 rounded-[32px] bg-white border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--muted)]">
                  <span className="material-symbols-outlined text-6xl">visibility_off</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[var(--teal-900)] font-black font-heading text-2xl tracking-tight">No views logged yet</p>
                  <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">
                    Share your property link with your agent or potential buyers to start tracking interest.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
