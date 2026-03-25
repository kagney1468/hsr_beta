import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AgentDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [newProperty, setNewProperty] = useState({
    address: '',
    postcode: '',
    seller_email: ''
  });

  useEffect(() => {
    loadDashboardData();
    
    // Real-time subscription for properties and related data
    const propSubscription = supabase
      .channel('agent_dashboard_changes')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'properties' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'documents' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'seller_declarations' }, () => {
        loadDashboardData(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(propSubscription);
    };
  }, []);

  async function loadDashboardData(silent = false) {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    try {
      // 1. Get properties
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('*');
      if (propsError) throw propsError;

      // 1b. Fetch seller profiles using seller_user_id = auth_user_id
      const sellerIds = Array.from(
        new Set(((propsData as any[]) || []).map(p => p.seller_user_id).filter(Boolean))
      ) as string[];

      const sellersByAuthId = new Map<string, any>();
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('users')
          .select('auth_user_id, full_name, phone, email')
          .in('auth_user_id', sellerIds);
        (sellers || []).forEach((s: any) => sellersByAuthId.set(s.auth_user_id, s));
      }

      // 2. Get all documents and declarations for progress calc
      const { data: docsData } = await supabase
        .from('documents')
        .select('property_id, category');

      const { data: declData } = await supabase
        .from('seller_declarations')
        .select('property_id, confirms_accuracy, confirms_ai_review');

      const enrichedProperties = (propsData as any[])?.map(prop => {
        const propDocs = (docsData as any[])?.filter(d => d.property_id === prop.id) || [];
        const propDecl = (declData as any[])?.find(d => d.property_id === prop.id);
        const seller = sellersByAuthId.get(prop.seller_user_id);

        // Progress Scoring (Detailed for the progress bar)
        let score = 0;
        if (prop.address && prop.property_type) score += 20; // Basic Info
        if (propDocs.some(d => d.category === 'Proof of ID')) score += 20;
        if (propDocs.some(d => d.category === 'Title Deeds')) score += 20;
        if (propDocs.length >= 4) score += 20; // 4+ docs
        if (propDecl?.confirms_accuracy) score += 20; // Final declaration

        // Status Logic
        let status: 'Action Required' | 'In Progress' | 'Pack Complete' = 'In Progress';
        if (score === 100) status = 'Pack Complete';
        else if (score < 30) status = 'Action Required';

        return {
          ...prop,
          sellerName: seller?.full_name || 'Pending Onboarding',
          score,
          status,
          updatedAt: prop.updated_at || prop.created_at,
        };
      }) || [];

      setProperties(enrichedProperties);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  // KPI Calculations
  const activeProperties = properties.length;
  const packsComplete = properties.filter(p => p.status === 'Pack Complete').length;
  const awaitingSellerAction = properties.filter(p => p.status === 'Action Required').length;
  const avgCompletion = properties.length > 0 
    ? Math.round(properties.reduce((acc, p) => acc + p.score, 0) / properties.length) 
    : 0;

  const kpis = [
    { label: 'Active Properties', value: activeProperties, icon: 'home_work' },
    { label: 'Packs Complete', value: packsComplete, icon: 'verified', color: 'text-[var(--teal-600)]' },
    { label: 'Awaiting Seller Action', value: awaitingSellerAction, icon: 'error_outline', color: 'text-red-500' },
    { label: 'Average Pack Completion', value: `${avgCompletion}%`, icon: 'donut_large', color: 'text-amber-500' },
  ];

  const handleAddProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Mock: Creating property and sending invite to ' + newProperty.seller_email);
    setShowAddPropertyModal(false);
    setNewProperty({ address: '', postcode: '', seller_email: '' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-y-auto">
      {/* ── HEADER ── */}
      <div className="px-6 md:px-10 pt-10 pb-8 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-heading tracking-tight">Property Pipeline</h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            Overview of all active instructions
            {isRefreshing && <span className="size-1.5 rounded-full bg-[var(--teal-500)] animate-pulse" />}
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowAddPropertyModal(true)}
          className="h-12 px-6 rounded-xl font-black font-heading flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-[20px]">add_circle</span>
          Add Property
        </Button>
      </div>

      <main className="p-6 md:p-10 space-y-10">
        {/* ── KPI GRID ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {kpis.map((kpi, i) => (
            <Card key={i} className="p-6 bg-zinc-900/40 border-white/5 space-y-4 hover:border-white/10 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{kpi.label}</span>
                <span className={`material-symbols-outlined ${kpi.color || 'text-white'} opacity-40`}>{kpi.icon}</span>
              </div>
              <div className="text-4xl font-black font-heading tracking-tight">{kpi.value}</div>
            </Card>
          ))}
        </div>

        {/* ── PROPERTY TABLE ── */}
        <div className="space-y-6">
          <Card className="overflow-hidden border-white/5 bg-zinc-900/40">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.01]">
                    <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Property Address</th>
                    <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Seller Name</th>
                    <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em] w-48">Pack Progress</th>
                    <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Status</th>
                    <th className="px-6 py-5 text-[10px] font-black text-zinc-500 uppercase tracking-[0.15em]">Last Updated</th>
                    <th className="px-6 py-5"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {properties.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-24 text-center text-zinc-600 font-medium italic">
                        <div className="flex flex-col items-center gap-3">
                          <span className="material-symbols-outlined text-4xl opacity-20">inventory_2</span>
                          No active properties in pipeline.
                        </div>
                      </td>
                    </tr>
                  ) : properties.map(prop => (
                    <tr key={prop.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-6">
                        <Link to={`/agent/property/${prop.id}`} className="block">
                          <div className="font-bold text-white group-hover:text-[var(--teal-600)] transition-colors">{prop.address}</div>
                          <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{prop.postcode}</div>
                        </Link>
                      </td>
                      <td className="px-6 py-6 text-sm text-zinc-300 font-medium">
                        {prop.sellerName}
                      </td>
                      <td className="px-6 py-6">
                        <div className="space-y-2">
                           <div className="h-1.5 w-full bg-black/60 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full transition-all duration-700 ${
                                 prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' : 
                                 prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'
                               }`}
                               style={{ width: `${prop.score}%` }} 
                             />
                           </div>
                           <div className="text-[10px] font-black text-zinc-500">{prop.score}% COMPLETE</div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          prop.status === 'Pack Complete' ? 'bg-[var(--teal-050)] text-[var(--teal-600)] border-[var(--teal-050)]' : 
                          prop.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                          'bg-red-500/10 text-red-500 border-red-500/20'
                        }`}>
                          <span className={`size-1.5 rounded-full ${
                             prop.status === 'Pack Complete' ? 'bg-[var(--teal-600)]' : 
                             prop.status === 'In Progress' ? 'bg-amber-500' : 'bg-red-500'
                          }`} />
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-6 py-6 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                        {new Date(prop.updatedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-6 text-right">
                         <Link to={`/agent/property/${prop.id}`} className="p-2 hover:bg-white/5 rounded-lg transition-colors inline-block">
                           <span className="material-symbols-outlined text-zinc-600 group-hover:text-white transition-colors">chevron_right</span>
                         </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>

      {/* ── ADD PROPERTY MODAL ── */}
      {showAddPropertyModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <Card className="w-full max-w-lg p-10 border-white/10 bg-[#0a0d14] shadow-3xl space-y-8 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black font-heading tracking-tight">Add New Instruction</h3>
              <button onClick={() => setShowAddPropertyModal(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddProperty} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Property Address</label>
                <input 
                  required
                  type="text" 
                  value={newProperty.address}
                  onChange={e => setNewProperty({...newProperty, address: e.target.value})}
                  className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[var(--teal-500)] outline-none transition-all"
                  placeholder="e.g. 12 Maple Gardens"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Postcode</label>
                  <input 
                    required
                    type="text" 
                    value={newProperty.postcode}
                    onChange={e => setNewProperty({...newProperty, postcode: e.target.value})}
                    className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[var(--teal-500)] outline-none transition-all"
                    placeholder="E.g. SW1 1AA"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Seller Email</label>
                  <input 
                    required
                    type="email" 
                    value={newProperty.seller_email}
                    onChange={e => setNewProperty({...newProperty, seller_email: e.target.value})}
                    className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[var(--teal-500)] outline-none transition-all"
                    placeholder="seller@example.com"
                  />
                </div>
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full h-16 rounded-2xl font-black font-heading text-lg mt-4"
              >
                Create Instruction & Invite Seller
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
