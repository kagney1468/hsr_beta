import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Tooltip } from '../components/ui/Tooltip';
import { updatePackCompletion } from '../lib/completion';

export default function SellerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    property: any;
    materialInfo: any;
    documents: any[];
    viewers: any[];
  }>({
    property: null,
    materialInfo: null,
    documents: [],
    viewers: []
  });

  const [stats, setStats] = useState({
    percentage: 0,
    sections: {
      property: { status: 'urgent', label: 'Action Required', desc: 'Address, type, tenure' },
      material: { status: 'urgent', label: 'Action Required', desc: 'Utilities, parking, history' },
      documents: { status: 'urgent', label: 'Action Required', desc: 'Title deeds, EPC' }
    }
  });

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) return;

      try {
        // 1. Fetch Property
        const { data: property, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', user.id)
          .maybeSingle();

        if (propError) throw propError;
        if (!property) {
          setLoading(false);
          return;
        }

        // 2. Fetch Material Info
        const { data: materialInfo } = await supabase
          .from('material_information')
          .select('*')
          .eq('property_id', property.id)
          .maybeSingle();

        // 3. Fetch Documents
        const { data: documents } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', property.id);

        // 4. Fetch Viewers
        const { data: viewers } = await supabase
          .from('pack_viewers')
          .select('*')
          .eq('property_id', property.id)
          .order('viewed_at', { ascending: false });

        setData({
          property,
          materialInfo,
          documents: documents || [],
          viewers: viewers || []
        });

        // 5. Calculate Progress (Real-time DB sync check)
        const currentPercentage = await updatePackCompletion(property.id);
        
        // Let's determine basic section statuses based on data present for quick visual reference
        const pStatus = property.property_type && property.address ? 'complete' : 'urgent';
        const mStatus = materialInfo && materialInfo.water_supply ? 'complete' : 'urgent';
        
        let mandatoryCount = 1; // Title Deeds
        if (property.tenure === 'Leasehold') mandatoryCount++;
        const hasEpc = !!(materialInfo?.epc_rating || documents?.find(d => d.document_type === 'EPC Certificate'));
        let dUploaded = hasEpc ? 1 : 0;
        if (documents?.find(d => d.document_type === 'Title Deeds')) dUploaded++;
        if (property.tenure === 'Leasehold' && documents?.find(d => d.document_type === 'Leasehold Documents')) dUploaded++;
        
        const dStatus = dUploaded > 0 ? (dUploaded >= mandatoryCount + 1 ? 'complete' : 'in-progress') : 'urgent';
        
        setStats({
          percentage: currentPercentage,
          sections: {
            property: { status: pStatus, label: getStatusLabel(pStatus), desc: 'Address, type, tenure' },
            material: { status: mStatus, label: getStatusLabel(mStatus), desc: 'Utilities, parking, history' },
            documents: { status: dStatus, label: getStatusLabel(dStatus), desc: 'Title deeds, EPC' }
          }
        });

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);



  const getStatusLabel = (status: string) => {
    if (status === 'complete') return 'Complete';
    if (status === 'in-progress') return 'In Progress';
    return 'Action Required';
  };

  const getContinuePath = () => {
    if (stats.sections.property.status !== 'complete') return '/seller/onboarding';
    if (stats.sections.material.status !== 'complete') return '/seller/onboarding';
    if (stats.sections.documents.status !== 'complete') return '/seller/onboarding';
    return '/seller/dashboard';
  };

  const [copying, setCopying] = useState(false);

  const handleCopyLink = () => {
    const link = `${window.location.origin}/pack/${data.property.shareable_link_token}`;
    navigator.clipboard.writeText(link);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const toggleLinkStatus = async () => {
    const newStatus = !data.property.is_link_active;
    const { error } = await supabase
      .from('properties')
      .update({ is_link_active: newStatus })
      .eq('id', data.property.id);

    if (!error) {
      setData(prev => ({
        ...prev,
        property: { ...prev.property, is_link_active: newStatus }
      }));
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
      <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
    </div>
  );

  if (!data.property) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">home_work</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Let’s get started</h2>
          <p className="text-[var(--muted)]">You haven't added your property details yet. Complete your onboarding to build your property pack.</p>
          <Button variant="primary" onClick={() => navigate('/seller/onboarding')}>Start onboarding</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[var(--page)] text-[var(--text)]">
      {/* ── HEADER ── */}
      <div className="px-6 md:px-10 pt-12 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.2em] border ${
              data.property.is_link_active ? 'bg-[var(--teal-050)] text-[var(--teal-900)] border-[var(--border)]' : 'bg-[#fee2e2] text-[#dc2626] border-[#fecaca]'
            }`}>
              {data.property.is_link_active ? 'Link Active' : 'Link Disabled'}
            </span>
            <span className="text-[var(--muted)] text-[10px] font-semibold uppercase tracking-widest">
              Unique ID: {data.property.shareable_link_token.slice(0, 8)}...
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight leading-none">
            {data.property.address}
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-lg text-[var(--muted)] font-medium tracking-tight">
              {data.property.postcode} • Ready for market
            </p>
            <button 
              onClick={toggleLinkStatus}
              className="text-[10px] font-semibold uppercase text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors underline decoration-[var(--border)] underline-offset-4"
            >
              {data.property.is_link_active ? 'Disable Link' : 'Enable Link'}
            </button>
          </div>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="outline"
            onClick={handleCopyLink}
            disabled={!data.property.is_link_active}
            className="h-16 px-8 rounded-2xl flex items-center gap-3 font-heading text-lg"
          >
            {copying ? 'Link Copied!' : 'Copy Share Link'}
            <span className="material-symbols-outlined">{copying ? 'check' : 'content_copy'}</span>
          </Button>
          <Tooltip content={stats.percentage < 70 ? 'Complete more sections to unlock sharing' : 'Share your verified property pack'}>
            <div>
              <Button 
                variant="primary" 
                disabled={stats.percentage < 70 || !data.property.is_link_active}
                className={`h-16 px-10 rounded-2xl flex items-center gap-4 font-heading text-lg transition-all ${
                  stats.percentage < 70 || !data.property.is_link_active 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:brightness-95 active:translate-y-[0.5px]'
                }`}
              >
                Share My Pack
                <span className="material-symbols-outlined">send</span>
              </Button>
            </div>
          </Tooltip>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-16 max-w-7xl mx-auto w-full pb-32">
        {/* ── PROGRESS CARD ── */}
        <Card className="p-10 md:p-14 rounded-[28px] flex flex-col lg:flex-row items-center gap-14 relative overflow-hidden group">
          <div className="absolute top-0 right-0 size-[600px] bg-[var(--teal-050)] blur-[150px] rounded-full pointer-events-none" />
          
          <div className="relative size-56 flex-shrink-0">
            <svg className="size-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="44" fill="none" 
                stroke="var(--teal-600)" strokeWidth="10"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * stats.percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-1500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-black text-6xl text-[var(--teal-900)] tracking-tighter">{stats.percentage}%</span>
              <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest mt-1">Complete</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-8 relative z-10">
            <div className="space-y-3">
              <h3 className="text-3xl md:text-5xl font-black font-heading tracking-tight leading-tight text-[var(--teal-900)]">
                Continue Building Your Pack
              </h3>
              <p className="text-[var(--muted)] text-lg max-w-2xl leading-relaxed">
                {stats.percentage === 100 
                  ? "Your pack is complete — you are ready to share with buyers, solicitors and your estate agent"
                  : stats.percentage >= 70
                  ? "Your pack is nearly ready to share — complete the remaining sections to strengthen your position with buyers"
                  : "You're just getting started. Completing your profile now will shave 3-4 weeks off your legal process later."}
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate(getContinuePath())}
              className="h-16 px-10 rounded-2xl flex items-center gap-4 font-heading text-xl group"
            >
              Continue Where I Left Off
              <span className="material-symbols-outlined text-2xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </Button>
          </div>
        </Card>

        {/* ── SECTION GRID ── */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-heading font-black text-[var(--teal-900)] text-2xl tracking-tight">Information Sections</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#10b981]" /><span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">Complete</span></div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#f59e0b]" /><span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">In Progress</span></div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#ef4444]" /><span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest">Action Required</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { id: 'property', label: 'Property Details', status: stats.sections.property.status, text: stats.sections.property.label, icon: 'home_work', desc: stats.sections.property.desc },
              { id: 'material', label: 'Material Information', status: stats.sections.material.status, text: stats.sections.material.label, icon: 'info', desc: stats.sections.material.desc },
              { id: 'documents', label: 'Documents', status: stats.sections.documents.status, text: stats.sections.documents.label, icon: 'description', desc: stats.sections.documents.desc },
            ].map((section) => (
              <Card 
                key={section.id} 
                onClick={() => navigate('/seller/onboarding')}
                className="p-8 transition-colors group flex flex-col justify-between h-[240px] rounded-[24px] cursor-pointer hover:bg-[var(--teal-050)]"
              >
                <div className="space-y-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${
                    section.status === 'complete' ? 'bg-[#d1fae5] text-[#059669]' :
                    section.status === 'in-progress' ? 'bg-[#fef3c7] text-[#d97706]' : 'bg-[#fee2e2] text-[#dc2626]'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">{section.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-[var(--teal-900)] text-xl font-heading tracking-tight group-hover:text-[var(--teal-600)] transition-colors">{section.label}</h5>
                    <p className="text-[var(--muted)] text-xs font-medium leading-relaxed">{section.desc}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${
                      section.status === 'complete' ? 'bg-[#10b981]' :
                      section.status === 'in-progress' ? 'bg-[#f59e0b]' : 'bg-[#ef4444]'
                    }`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      section.status === 'complete' ? 'text-[#059669]' :
                      section.status === 'in-progress' ? 'text-[#d97706]' : 'text-[#dc2626]'
                    }`}>
                      {section.text}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--teal-900)] group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── VIEWER SECTION ── */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-heading font-black text-[var(--teal-900)] text-2xl tracking-tight">Who has viewed my pack</h4>
            <span className="text-[10px] font-semibold text-[var(--muted)] uppercase tracking-widest bg-white px-4 py-2 rounded-full border border-[var(--border)]">
              {data.viewers.length} Activity Logged
            </span>
          </div>
          
          <Card className="rounded-[24px] overflow-hidden">
            {data.viewers.length > 0 ? (
              <div className="divide-y divide-[var(--border)]">
                {data.viewers.map((viewer, idx) => (
                  <div key={idx} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-[var(--teal-050)] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="size-16 rounded-3xl bg-white flex items-center justify-center text-[var(--teal-600)] border border-[var(--border)] group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-4xl">person_pin</span>
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-black text-[var(--teal-900)] text-2xl font-heading tracking-tight">
                          {viewer.viewer_name}
                        </h5>
                        <div className="flex items-center gap-4 text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(viewer.viewed_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">schedule</span>{new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {viewer.is_selling ? (
                        <div className="px-5 py-3 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center gap-3">
                          <div className="size-2 rounded-full bg-[var(--teal-500)] animate-pulse" />
                          <span className="text-xs font-semibold text-[var(--teal-900)] uppercase tracking-widest">
                            Also Selling: {viewer.selling_location}
                          </span>
                        </div>
                      ) : (
                        <div className="px-5 py-3 rounded-2xl bg-white border border-[var(--border)] flex items-center gap-3">
                          <span className="material-symbols-outlined text-[var(--teal-600)] text-sm">bolt</span>
                          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">Chain-free buyer</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-24 text-center space-y-6">
                <div className="size-24 rounded-[32px] bg-white border border-[var(--border)] flex items-center justify-center mx-auto text-[var(--muted)]">
                  <span className="material-symbols-outlined text-6xl">visibility_off</span>
                </div>
                <div className="space-y-2">
                  <p className="text-[var(--teal-900)] font-black font-heading text-2xl tracking-tight">No views logged yet</p>
                  <p className="text-[var(--muted)] text-sm max-w-xs mx-auto">Share your property link with your agent or potential buyers to start tracking interest.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
