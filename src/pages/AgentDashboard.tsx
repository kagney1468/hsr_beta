import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AgentDashboard() {
  const [properties, setProperties] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pipeline' | 'leads'>('pipeline');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
    
    // Real-time subscription for properties and leads
    const propSubscription = supabase
      .channel('agent_dashboard_changes')
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'properties' }, () => {
        loadDashboardData(true);
      })
      .on('postgres_changes' as any, { event: '*', schema: 'public', table: 'pack_viewers' }, () => {
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
      // 1. Get properties with seller info
      const { data: propsData, error: propsError } = await supabase
        .from('properties')
        .select('*, users!inner(full_name, phone, email)');
      if (propsError) throw propsError;

      // 2. Get all documents and declarations for progress calc
      const { data: docsData } = await supabase
        .from('documents')
        .select('property_id, category');

      const { data: declData } = await supabase
        .from('seller_declarations')
        .select('property_id, confirms_accuracy, confirms_ai_review');

      // 3. Get all viewer registrations for managed properties
      const propIds = propsData?.map(p => p.id) || [];
      const { data: viewersData } = await supabase
        .from('pack_viewers')
        .select('*, properties!inner(address)')
        .in('property_id', propIds)
        .order('viewed_at', { ascending: false });

      const enrichedProperties = propsData?.map(prop => {
        const propDocs = docsData?.filter(d => d.property_id === prop.id) || [];
        const propDecl = declData?.find(d => d.property_id === prop.id);
        const propViewers = viewersData?.filter(v => v.property_id === prop.id) || [];

        // Simple scoring logic
        let score = 0;
        if (prop.address && prop.property_type) score += 25;
        if (propDocs.some(d => d.category === 'ID') && propDocs.some(d => d.category === 'Proof of Ownership')) score += 25;
        if (propDocs.length >= 3) score += 25; // General placeholder for "enough docs"
        if (propDecl?.confirms_accuracy) score += 25;

        const status = score === 100 ? 'Complete' : score === 0 ? 'Not Started' : 'In Progress';

        return {
          ...prop,
          sellerName: prop.users?.full_name || 'Unknown Seller',
          score,
          viewCount: propViewers.length,
          status,
          updatedAt: prop.updated_at || prop.created_at,
        };
      }) || [];

      setProperties(enrichedProperties);
      setLeads(viewersData || []);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  const exportLeadsToCSV = () => {
    const headers = ['Viewer Name', 'Email', 'Phone', 'Property', 'Date Viewed', 'Selling?', 'Selling Location'];
    const rows = leads.map(l => [
      l.viewer_name,
      l.viewer_email || '—',
      l.viewer_phone || '—',
      l.properties?.address,
      new Date(l.viewed_at).toLocaleDateString(),
      l.is_selling ? 'Yes' : 'No',
      l.selling_location || '—'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInviteSeller = (e: React.FormEvent) => {
    e.preventDefault();
    // Placeholder for email invitation
    alert(`Invitation sent to ${inviteEmail} (Simulated)`);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  const kpis = [
    { label: 'Total Properties', value: properties.length, icon: 'home' },
    { label: 'Packs Complete', value: properties.filter(p => p.score === 100).length, icon: 'check_circle', color: 'text-[#00e5a0]' },
    { label: 'Awaiting Seller Action', value: properties.filter(p => p.score < 100 && p.score > 0).length, icon: 'pending', color: 'text-amber-500' },
    { label: 'Total Pack Views (Mo)', value: leads.length, icon: 'visibility', color: 'text-blue-400' },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="animate-spin size-10 border-4 border-[#00e5a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Dashboard Header */}
      <div className="px-6 md:px-12 pt-10 pb-8 border-b border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black font-heading tracking-tight">Agent Dashboard</h1>
          <p className="text-zinc-500 mt-1 flex items-center gap-2">
            Managing {properties.length} active listings
            {isRefreshing && <span className="size-1.5 rounded-full bg-[#00e5a0] animate-pulse" />}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Button 
             variant="outline" 
             onClick={() => setActiveTab(activeTab === 'pipeline' ? 'leads' : 'pipeline')}
             className="h-12 px-6 rounded-xl border-white/10 font-bold"
           >
             {activeTab === 'pipeline' ? 'View Leads' : 'View Pipeline'}
           </Button>
           <Button 
             variant="primary" 
             onClick={() => setShowInviteModal(true)}
             className="h-12 px-6 rounded-xl bg-[#00e5a0] text-black font-black font-heading flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-[20px]">person_add</span>
             Add Seller
           </Button>
        </div>
      </div>

      <main className="p-6 md:p-12 space-y-10">
        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, i) => (
            <Card key={i} className="p-6 bg-zinc-900/40 border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{kpi.label}</span>
                <span className={`material-symbols-outlined ${kpi.color || 'text-white'} opacity-40`}>{kpi.icon}</span>
              </div>
              <div className="text-4xl font-black font-heading tracking-tight">{kpi.value}</div>
            </Card>
          ))}
        </div>

        {activeTab === 'pipeline' ? (
          /* PROPERTY PIPELINE TABLE */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-heading tracking-tight">Property Pipeline</h2>
            </div>
            <Card className="overflow-hidden border-white/5 bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Property Address</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Seller</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Completion</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Pack Views</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {properties.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center text-zinc-500 italic">No properties managed yet.</td>
                      </tr>
                    ) : properties.map(prop => (
                      <tr key={prop.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-5">
                          <Link to={`/agent/property/${prop.id}`} className="block">
                            <div className="font-bold text-white group-hover:text-[#00e5a0] transition-colors">{prop.address}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{prop.postcode}</div>
                          </Link>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm">{prop.sellerName}</div>
                          <div className="text-[10px] text-zinc-600 font-mono mt-0.5">{prop.users?.email}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 bg-black rounded-full overflow-hidden min-w-[80px]">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${prop.score === 100 ? 'bg-[#00e5a0]' : prop.score > 50 ? 'bg-amber-500' : 'bg-red-500'}`} 
                                style={{ width: `${prop.score}%` }} 
                              />
                            </div>
                            <span className="text-xs font-bold text-zinc-400">{prop.score}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20">
                            <span className="material-symbols-outlined text-[14px]">visibility</span>
                            {prop.viewCount}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${
                            prop.status === 'Complete' ? 'bg-[#00e5a0]/10 text-[#00e5a0] border border-[#00e5a0]/20' : 
                            prop.status === 'In Progress' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' : 
                            'bg-zinc-800 text-zinc-500 border border-white/5'
                          }`}>
                            {prop.status}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                           <Link to={`/agent/property/${prop.id}`} className="p-2 hover:bg-white/5 rounded-lg transition-colors inline-block">
                             <span className="material-symbols-outlined text-zinc-500 group-hover:text-white transition-colors">chevron_right</span>
                           </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          /* VIEWER LEADS SECTION */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-heading tracking-tight">Viewer leads</h2>
              <Button onClick={exportLeadsToCSV} variant="outline" className="h-10 px-4 rounded-xl border-white/10 text-xs font-black flex items-center gap-2">
                Export to CSV <span className="material-symbols-outlined text-[16px]">download</span>
              </Button>
            </div>
            <Card className="overflow-hidden border-white/5 bg-zinc-900/40">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-white/[0.02]">
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Viewer</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Contact</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Property Viewed</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selling Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {leads.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-20 text-center text-zinc-500 italic">No viewer registrations yet.</td>
                      </tr>
                    ) : leads.map(lead => (
                      <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="font-bold">{lead.viewer_name}</div>
                            {lead.is_selling && (
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00e5a0]/10 text-[#00e5a0] text-[9px] font-black uppercase tracking-widest border border-[#00e5a0]/30 animate-pulse">
                                <span className="size-1 bg-[#00e5a0] rounded-full" />
                                Priority
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm font-medium">{lead.viewer_email || '—'}</div>
                          <div className="text-xs text-zinc-500 mt-0.5">{lead.viewer_phone || '—'}</div>
                        </td>
                        <td className="px-6 py-5">
                          <div className="text-sm text-zinc-400">{lead.properties?.address}</div>
                        </td>
                        <td className="px-6 py-5 text-sm text-zinc-500">
                          {new Date(lead.viewed_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-5">
                          {lead.is_selling ? (
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-[#00e5a0] uppercase tracking-widest">Selling in {lead.selling_location}</span>
                              <p className="text-[10px] text-zinc-500 italic leading-tight">Valuation target identified</p>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Market search only</span>
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
      </main>

      {/* INVITE SELLER MODAL (Method 1) */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <Card className="w-full max-w-md p-8 border-white/10 bg-zinc-900 shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-black font-heading tracking-tight">Invite a Seller</h3>
              <button onClick={() => setShowInviteModal(false)} className="size-10 flex items-center justify-center rounded-full hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <p className="text-zinc-400 text-sm">Send a unique sign-up link to your client. Their account will be automatically linked to your agency.</p>
            
            <form onSubmit={handleInviteSeller} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Seller Email Address</label>
                <input 
                  required
                  type="email" 
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[#00e5a0]/50 outline-none transition-all placeholder:text-zinc-700"
                  placeholder="name@example.com"
                />
              </div>
              
              <Button 
                type="submit" 
                variant="primary" 
                className="w-full h-16 rounded-2xl bg-[#00e5a0] text-black font-black font-heading text-lg shadow-xl shadow-[#00e5a0]/10 flex items-center justify-center gap-3"
              >
                Send Invitation
                <span className="material-symbols-outlined">send</span>
              </Button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
