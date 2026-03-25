import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AgentPropertyDetail() {
  const { id } = useParams<{ id: string }>();
  const [property, setProperty] = useState<any>(null);
  const [seller, setSeller] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [viewers, setViewers] = useState<any[]>([]);
  const [declaration, setDeclaration] = useState<any>(null);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [readiness, setReadiness] = useState({
    score: 0,
    profileComplete: false,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
  });

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      try {
        // Fetch Property
        const { data: propData, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', id)
          .single();

        if (propError) throw propError;
        setProperty(propData);

        // Fetch Seller
        const { data: sellerData, error: sellerError } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', propData.seller_user_id)
          .single();

        if (sellerError) throw sellerError;
        setSeller(sellerData);

        // Fetch Documents
        const { data: docsData, error: docsError } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', id);

        if (docsError) throw docsError;
        setDocuments(docsData || []);

        // Fetch Viewers
        const { data: viewersData } = await supabase
          .from('pack_viewers')
          .select('*')
          .eq('property_id', id)
          .order('viewed_at', { ascending: false });
        
        setViewers(viewersData || []);

        // Fetch Declaration
        const { data: declData, error: declError } = await supabase
          .from('seller_declarations')
          .select('*')
          .eq('property_id', (propData as any).id)
          .maybeSingle();

        if (declError && declError.code !== 'PGRST116') throw declError;
        setDeclaration(declData);

        // Fetch Share Token from shares table
        const { data: shareData } = await supabase
          .from('shares')
          .select('token')
          .eq('property_id', propData.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (shareData?.token) setShareToken(shareData.token);

        // Calculate Readiness
        let score = 0;
        
        const profileComplete = !!(sellerData?.full_name && sellerData?.phone);
        if (profileComplete) score += 25;

        const propertyComplete = !!(propData?.address && propData?.property_type);
        if (propertyComplete) score += 25;

        const hasID = docsData?.some(d => d.category === 'ID');
        const hasOwnership = docsData?.some(d => d.category === 'Proof of Ownership');
        const documentsComplete = !!(hasID && hasOwnership);
        if (documentsComplete) score += 25;

        const declarationComplete = !!(declData?.confirms_accuracy && declData?.confirms_ai_review);
        if (declarationComplete) score += 25;

        setReadiness({
          score,
          profileComplete,
          propertyComplete,
          documentsComplete,
          declarationComplete,
        });

      } catch (error) {
        console.error('Error loading property details:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleViewDocument = async (doc: any) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      return;
    }
    // Fallback if file_url is missing
    alert('Document URL not found.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-8 text-zinc-500 font-heading font-black text-2xl">
        Property not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20">
      {/* Header */}
      <div className="px-6 md:px-12 pt-10 pb-8 border-b border-white/5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <Link to="/agent/dashboard" className="size-12 rounded-2xl bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/10 transition-all">
            <span className="material-symbols-outlined">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-3xl font-black font-heading tracking-tight">{property.address}</h1>
            <p className="text-zinc-500 flex items-center gap-2">
               {property.postcode} • {property.property_type}
               <span className="size-1 bg-zinc-700 rounded-full" />
               Managed for {seller?.full_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" className="h-12 px-6 rounded-xl border-white/10 text-zinc-400 font-bold">Edit Details</Button>
           <Button variant="primary" className="h-12 px-6 rounded-xl font-black font-heading">Download Pack</Button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Pack Progress', value: `${readiness.score}%`, color: readiness.score === 100 ? 'text-[var(--teal-600)]' : 'text-amber-500' },
                { label: 'Documents', value: documents.length, color: 'text-white' },
                { label: 'Total Views', value: viewers.length, color: 'text-blue-400' },
                { label: 'Priority Leads', value: viewers.filter(v => v.is_selling).length, color: 'text-[var(--teal-600)]' },
              ].map(stat => (
                <Card key={stat.label} className="p-5 bg-zinc-900/40 border-white/5 space-y-1">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{stat.label}</p>
                  <p className={`text-2xl font-black font-heading ${stat.color}`}>{stat.value}</p>
                </Card>
              ))}
            </div>

            {/* Viewer Registrations (NEW) */}
            <Card className="border-white/5 bg-zinc-900/40 overflow-hidden">
               <div className="p-6 border-b border-white/5 flex items-center justify-between">
                 <h3 className="text-lg font-black font-heading tracking-tight">Viewer Registrations</h3>
                 <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest bg-black px-3 py-1 rounded-full">{viewers.length} Registered</span>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-white/[0.02]">
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Viewer</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Date Viewed</th>
                       <th className="px-6 py-4 text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selling Status</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {viewers.length === 0 ? (
                       <tr>
                         <td colSpan={3} className="px-6 py-12 text-center text-zinc-500 italic">No registrations for this property yet.</td>
                       </tr>
                     ) : viewers.map(viewer => (
                       <tr key={viewer.id} className="hover:bg-white/[0.015] transition-colors">
                         <td className="px-6 py-4">
                           <div className="font-bold">{viewer.viewer_name}</div>
                           <div className="text-[10px] text-zinc-500 font-mono">{viewer.viewer_email}</div>
                         </td>
                         <td className="px-6 py-4 text-sm text-zinc-500">
                           {new Date(viewer.viewed_at).toLocaleDateString()}
                         </td>
                         <td className="px-6 py-4">
                            {viewer.is_selling ? (
                              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[var(--teal-050)] text-[var(--teal-600)] text-[10px] font-black uppercase tracking-widest border border-[var(--border)]">
                                <span className="size-1 rounded-full bg-[var(--teal-500)] animate-pulse" />
                                Selling in {viewer.selling_location}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-zinc-700 uppercase">Search only</span>
                            )}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </Card>

            {/* Readiness List */}
            <Card className="p-8 border-white/5 bg-zinc-900/40 space-y-6">
              <h3 className="text-xl font-black font-heading tracking-tight">Readiness Checklist</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: 'Seller Profile', done: readiness.profileComplete },
                  { label: 'Property Details', done: readiness.propertyComplete },
                  { label: 'Required Documents', done: readiness.documentsComplete },
                  { label: 'Final Declaration', done: readiness.declarationComplete },
                ].map(item => (
                  <div key={item.label} className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between">
                    <span className="font-bold text-sm tracking-tight text-zinc-300">{item.label}</span>
                    <span className={`material-symbols-outlined ${item.done ? 'text-[var(--teal-600)]' : 'text-zinc-800'}`}>
                      {item.done ? 'check_circle' : 'pending'}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Documents */}
            <Card className="p-8 border-white/5 bg-zinc-900/40 space-y-6">
              <h3 className="text-xl font-black font-heading tracking-tight">Compliance Documents</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {documents.map(doc => (
                   <div key={doc.id} className="p-5 rounded-2xl bg-black/40 border border-white/5 group hover:border-white/10 transition-all flex items-center justify-between">
                     <div className="flex items-center gap-4">
                       <div className="size-10 rounded-xl bg-zinc-900 flex items-center justify-center text-zinc-500">
                         <span className="material-symbols-outlined">description</span>
                       </div>
                       <div>
                         <p className="font-bold text-sm tracking-tight">{doc.document_type || doc.category}</p>
                         <p className="text-[10px] text-zinc-600 font-mono uppercase">{doc.file_name?.substring(0, 20)}...</p>
                       </div>
                     </div>
                     <button onClick={() => handleViewDocument(doc)} className="size-8 rounded-lg flex items-center justify-center text-zinc-600 hover:text-white hover:bg-white/5 transition-colors">
                       <span className="material-symbols-outlined text-[18px]">visibility</span>
                     </button>
                   </div>
                 ))}
                 {documents.length === 0 && (
                   <p className="col-span-full py-10 text-center text-zinc-600 italic">No documents uploaded by seller.</p>
                 )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            {/* Share Card */}
            <Card className="p-8 border-[var(--border)] bg-[var(--teal-050)] overflow-hidden relative">
              <div className="absolute top-0 right-0 size-32 bg-[var(--teal-050)] blur-[60px] pointer-events-none" />
              <div className="relative z-10 space-y-6">
                <div className="inline-flex items-center gap-2 text-[var(--teal-900)] text-[10px] font-black uppercase tracking-[0.2em]">
                  <span className="material-symbols-outlined text-sm">qr_code_2</span>
                  Property QR Gate
                </div>
                <h3 className="text-2xl font-black font-heading tracking-tight leading-none">Share Property Pack</h3>
                
                {shareToken ? (
                  <>
                    <div className="bg-white p-4 rounded-3xl flex justify-center shadow-2xl">
                       <QRCode value={`${window.location.origin}/pack/${shareToken}`} size={160} />
                    </div>
                    <div className="space-y-2">
                      <Button 
                        variant="primary" 
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/pack/${shareToken}`);
                          alert('Public link copied!');
                        }}
                        className="w-full h-14 rounded-2xl font-black font-heading text-sm"
                      >
                         Copy Public Link
                      </Button>
                      <Link to={`/pack/${shareToken}`} target="_blank" className="block w-full text-center py-2 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:text-[var(--teal-600)] transition-colors">
                        Preview as Viewer
                      </Link>
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center space-y-4">
                     <p className="text-zinc-500 text-sm">Generate a secure share link for this property.</p>
                     <Button className="w-full h-14 rounded-2xl bg-white text-black font-black font-heading">Generate Link</Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Seller Contact */}
            <Card className="p-8 border-white/5 bg-zinc-900/40 space-y-6">
               <h3 className="text-lg font-black font-heading tracking-tight">Seller Contact</h3>
               <div className="space-y-4">
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Name</p>
                   <p className="font-bold text-white">{seller?.full_name}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Email</p>
                   <p className="font-bold text-white text-sm">{seller?.email}</p>
                 </div>
                 <div className="space-y-1">
                   <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">Phone</p>
                   <p className="font-bold text-white text-sm">{seller?.phone}</p>
                 </div>
               </div>
               <Button variant="outline" className="w-full h-12 rounded-xl border-white/5 text-zinc-400 hover:text-white font-bold">Message Seller</Button>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
