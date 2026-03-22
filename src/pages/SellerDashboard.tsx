import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

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
      property: { status: 'urgent', label: 'Action Required', desc: 'Address, type, tenure, bedrooms' },
      material: { status: 'urgent', label: 'Action Required', desc: 'Utilities, parking, flooding risk' },
      documents: { status: 'urgent', label: 'Action Required', desc: 'Title deeds, EPC certificates' }
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

        // 5. Calculate Progress
        calculateProgress(property, materialInfo, documents || []);

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  const calculateProgress = (prop: any, mat: any, docs: any[]) => {
    let earnedWeight = 0;

    // Property Details (Weight 30)
    const propFields = ['address', 'postcode', 'property_type', 'tenure', 'bedrooms', 'council_tax_band', 'epc_rating'];
    const filledPropFields = propFields.filter(f => !!prop[f]).length;
    earnedWeight += (filledPropFields / propFields.length) * 30;
    
    const propStatus = filledPropFields === propFields.length ? 'complete' : filledPropFields > 0 ? 'in-progress' : 'urgent';

    // Material Info (Weight 40)
    const matFields = ['utilities', 'parking', 'flooding_risk', 'building_safety', 'planning_history', 'disputes_notices', 'building_reg_works'];
    let filledMatFields = 0;
    if (mat) {
      filledMatFields = matFields.filter(f => !!mat[f]).length;
    }
    earnedWeight += (filledMatFields / matFields.length) * 40;
    
    const matStatus = filledMatFields === matFields.length ? 'complete' : filledMatFields > 0 ? 'in-progress' : 'urgent';

    // Documents (Weight 30)
    const docCount = Math.min(docs.length, 5);
    earnedWeight += (docCount / 5) * 30;
    
    const docStatus = docCount >= 3 ? 'complete' : docCount > 0 ? 'in-progress' : 'urgent';

    setStats({
      percentage: Math.round(earnedWeight),
      sections: {
        property: { status: propStatus, label: getStatusLabel(propStatus), desc: 'Address, type, tenure, bedrooms' },
        material: { status: matStatus, label: getStatusLabel(matStatus), desc: 'Utilities, parking, flooding risk' },
        documents: { status: docStatus, label: getStatusLabel(docStatus), desc: 'Title deeds, EPC certificates' }
      }
    });
  };

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
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin size-10 border-4 border-[#00e5a0] border-t-transparent rounded-full" />
    </div>
  );

  if (!data.property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-6">
          <div className="size-20 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">home_work</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-white">Let's Get Started</h2>
          <p className="text-zinc-400">You haven't added your property details yet. Complete your onboarding to build your property pack.</p>
          <Button variant="primary" className="shadow-lg shadow-[#00e5a0]/20" onClick={() => navigate('/seller/onboarding')}>Start Onboarding</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-[#00e5a0]/30">
      {/* ── HEADER ── */}
      <div className="px-6 md:px-10 pt-12 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${
              data.property.is_link_active ? 'bg-[#00e5a0]/10 text-[#00e5a0] border-[#00e5a0]/20' : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
              {data.property.is_link_active ? 'Link Active' : 'Link Disabled'}
            </span>
            <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
              Unique ID: {data.property.shareable_link_token.slice(0, 8)}...
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight leading-none">
            {data.property.address}
          </h1>
          <div className="flex items-center gap-4">
            <p className="text-lg text-zinc-500 font-medium tracking-tight">
              {data.property.postcode} • Ready for market
            </p>
            <button 
              onClick={toggleLinkStatus}
              className="text-[10px] font-black uppercase text-zinc-600 hover:text-white transition-colors underline decoration-zinc-800 underline-offset-4"
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
            className="h-16 px-8 rounded-2xl flex items-center gap-3 font-black font-heading text-lg border-white/10 hover:bg-white/5 active:scale-95 disabled:opacity-50"
          >
            {copying ? 'Link Copied!' : 'Copy Share Link'}
            <span className="material-symbols-outlined">{copying ? 'check' : 'content_copy'}</span>
          </Button>
          <Button 
            variant="primary" 
            disabled={stats.percentage < 70 || !data.property.is_link_active}
            className={`h-16 px-10 rounded-2xl flex items-center gap-4 font-black font-heading text-lg transition-all shadow-2xl ${stats.percentage < 70 || !data.property.is_link_active ? 'opacity-50 grayscale cursor-not-allowed shadow-none' : 'shadow-[#00e5a0]/30 hover:scale-105 active:scale-95'}`}
          >
            Share My Pack
            <span className="material-symbols-outlined">send</span>
          </Button>
        </div>
      </div>

      <div className="p-6 md:p-10 space-y-16 max-w-7xl mx-auto w-full pb-32">
        {/* ── PROGRESS CARD ── */}
        <Card className="p-10 md:p-14 border-white/5 bg-zinc-900/40 backdrop-blur-3xl rounded-[48px] flex flex-col lg:flex-row items-center gap-14 relative overflow-hidden group shadow-2xl">
          <div className="absolute top-0 right-0 size-[600px] bg-[#00e5a0]/5 blur-[150px] rounded-full pointer-events-none" />
          
          <div className="relative size-56 flex-shrink-0">
            <svg className="size-full -rotate-90 filter drop-shadow-[0_0_20px_rgba(0,229,160,0.3)]" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="44" fill="none" 
                stroke="#00e5a0" strokeWidth="10"
                strokeDasharray="276.46"
                strokeDashoffset={276.46 - (276.46 * stats.percentage) / 100}
                strokeLinecap="round"
                className="transition-all duration-1500 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-heading font-black text-6xl text-white tracking-tighter">{stats.percentage}%</span>
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-1">Complete</span>
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left space-y-8 relative z-10">
            <div className="space-y-3">
              <h3 className="text-3xl md:text-5xl font-black text-white font-heading tracking-tight leading-tight">
                Continue Building Your Pack
              </h3>
              <p className="text-zinc-400 text-lg max-w-2xl leading-relaxed">
                {stats.percentage === 100 
                  ? "Your pack is elite. Every solicitor inquiry is pre-empted, saving you weeks of deal time."
                  : "You're nearly there. Completing the remaining details now will shave 3-4 weeks off your legal process later."}
              </p>
            </div>
            <Button 
              variant="primary" 
              onClick={() => navigate(getContinuePath())}
              className="h-16 px-10 rounded-2xl flex items-center gap-4 font-black font-heading text-xl shadow-2xl shadow-[#00e5a0]/20 hover:scale-[1.03] active:scale-95 group"
            >
              Continue Where I Left Off
              <span className="material-symbols-outlined text-2xl group-hover:translate-x-2 transition-transform">arrow_forward</span>
            </Button>
          </div>
        </Card>

        {/* ── SECTION GRID ── */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-heading font-black text-white text-2xl tracking-tight">Information Sections</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-[#00e5a0]" /><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Complete</span></div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-amber-500" /><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">In Progress</span></div>
              <div className="flex items-center gap-1.5"><div className="size-2 rounded-full bg-red-500" /><span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Action Required</span></div>
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
                className="p-8 border-white/5 bg-zinc-900/40 hover:bg-zinc-900/60 transition-all group flex flex-col justify-between h-[240px] rounded-[32px] cursor-pointer hover:border-[#00e5a0]/20"
              >
                <div className="space-y-4">
                  <div className={`size-14 rounded-2xl flex items-center justify-center ${
                    section.status === 'complete' ? 'bg-[#00e5a0]/10 text-[#00e5a0]' :
                    section.status === 'in-progress' ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'
                  }`}>
                    <span className="material-symbols-outlined text-3xl">{section.icon}</span>
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-black text-white text-xl font-heading tracking-tight group-hover:text-[#00e5a0] transition-colors">{section.label}</h5>
                    <p className="text-zinc-500 text-xs font-medium leading-relaxed">{section.desc}</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${
                      section.status === 'complete' ? 'bg-[#00e5a0]' :
                      section.status === 'in-progress' ? 'bg-amber-500' : 'bg-red-500'
                    }`} />
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                      section.status === 'complete' ? 'text-[#00e5a0]' :
                      section.status === 'in-progress' ? 'text-amber-500' : 'text-red-500'
                    }`}>
                      {section.text}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all">arrow_forward</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* ── VIEWER SECTION ── */}
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2">
            <h4 className="font-heading font-black text-white text-2xl tracking-tight">Who Has Viewed My Pack</h4>
            <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900/50 px-4 py-2 rounded-full border border-white/5">
              {data.viewers.length} Activity Logged
            </span>
          </div>
          
          <Card className="border-white/5 bg-zinc-900/40 rounded-[40px] overflow-hidden">
            {data.viewers.length > 0 ? (
              <div className="divide-y divide-white/5">
                {data.viewers.map((viewer, idx) => (
                  <div key={idx} className="p-10 flex flex-col md:flex-row md:items-center justify-between gap-8 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center gap-6">
                      <div className="size-16 rounded-3xl bg-black/40 flex items-center justify-center text-[#00e5a0] border border-white/10 group-hover:scale-105 transition-transform">
                        <span className="material-symbols-outlined text-4xl">person_pin</span>
                      </div>
                      <div className="space-y-1">
                        <h5 className="font-black text-white text-2xl font-heading tracking-tight">
                          {viewer.viewer_name}
                        </h5>
                        <div className="flex items-center gap-4 text-xs font-bold text-zinc-500 uppercase tracking-widest">
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(viewer.viewed_at).toLocaleDateString()}</span>
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-sm">schedule</span>{new Date(viewer.viewed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      {viewer.is_selling ? (
                        <div className="px-5 py-3 rounded-2xl bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center gap-3">
                          <div className="size-2 rounded-full bg-[#00e5a0] animate-pulse" />
                          <span className="text-xs font-black text-[#00e5a0] uppercase tracking-widest">
                            Also Selling: {viewer.selling_location}
                          </span>
                        </div>
                      ) : (
                        <div className="px-5 py-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                          <span className="material-symbols-outlined text-[#00e5a0] text-sm">bolt</span>
                          <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">Chain-free Buyer</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-24 text-center space-y-6">
                <div className="size-24 rounded-[32px] bg-black/40 border border-white/5 flex items-center justify-center mx-auto text-zinc-800">
                  <span className="material-symbols-outlined text-6xl">visibility_off</span>
                </div>
                <div className="space-y-2">
                  <p className="text-white font-black font-heading text-2xl tracking-tight">No views logged yet</p>
                  <p className="text-zinc-500 text-sm max-w-xs mx-auto">Share your property link with your agent or potential buyers to start tracking interest.</p>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
