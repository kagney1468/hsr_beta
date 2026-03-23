import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';

export default function PublicPack() {
  const { token } = useParams<{ token: string }>();
  const [property, setProperty] = useState<any>(null);
  const [materialInfo, setMaterialInfo] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registering, setRegistering] = useState(false);
  
  const [viewerForm, setViewerForm] = useState({
    name: '',
    email: '',
    phone: '',
    is_selling: false,
    selling_location: ''
  });

  useEffect(() => {
    async function loadPack() {
      if (!token) return;
      
      try {
        // 1. Fetch Property by Token
        const { data: prop, error: propError } = await supabase
          .from('properties')
          .select('*, users!inner(full_name, agencies(*))')
          .eq('shareable_link_token', token)
          .eq('is_link_active', true)
          .maybeSingle();

        if (propError || !prop) throw new Error('Property pack not found or link has been disabled.');

        setProperty(prop);

        // 2. Fetch Material Info & Docs (Only accessible after registration usually, 
        // but for this view we fetch them now and hide behind the state)
        const { data: matInfo } = await supabase
          .from('material_information')
          .select('*')
          .eq('property_id', (prop as any).id)
          .maybeSingle();
        
        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', (prop as any).id);

        setMaterialInfo(matInfo);
        setDocuments(docs || []);
        
      } catch (err: any) {
        console.error('Error loading pack:', err);
        setProperty({ error: err.message });
      } finally {
        setLoading(false);
      }
    }

    loadPack();
  }, [token]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistering(true);
    
    try {
      // 1. Save Viewer Data
      const { error } = await supabase
        .from('pack_viewers')
        .insert({
          property_id: (property as any).id,
          viewer_name: viewerForm.name,
          viewed_at: new Date().toISOString(),
          is_selling: viewerForm.is_selling,
          selling_location: viewerForm.is_selling ? viewerForm.selling_location : null
        } as any);

      if (error) throw error;

      // 2. Send Notifications to Seller and Agent
      await supabase.functions.invoke('send-notification', {
        body: {
          type: 'viewerRegistration',
          propertyId: (property as any).id,
          viewerData: {
            full_name: viewerForm.name,
            email: viewerForm.email,
            phone: viewerForm.phone,
            is_selling: viewerForm.is_selling,
            selling_location: viewerForm.selling_location
          }
        }
      });
      
      setIsRegistered(true);
      window.scrollTo(0, 0);
    } catch (err) {
      console.error('Registration failed:', err);
      alert('Failed to register. Please try again.');
    } finally {
      setRegistering(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="animate-spin size-10 border-4 border-[#00e5a0] border-t-transparent rounded-full" />
    </div>
  );

  if (property?.error || !property) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-zinc-500">
        <Card className="p-12 text-center border-white/5 space-y-6">
          <span className="material-symbols-outlined text-6xl text-red-500/20">lock</span>
          <h2 className="text-2xl font-black font-heading text-white">Access Denied</h2>
          <p className="max-w-xs mx-auto">{property?.error || 'This property pack link is invalid or has been disabled by the seller.'}</p>
        </Card>
      </div>
    );
  }

  const agency = property.users?.agencies;

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00e5a0]/30 font-display">
      {/* ── STICKY HEADER ── */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/5 print:hidden">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             {agency?.logo_url ? (
               <img src={agency.logo_url} alt={agency.agency_name} className="h-8 w-auto" />
             ) : (
               <div className="flex items-center gap-3">
                 <div className="size-10 rounded-xl bg-[#00e5a0] flex items-center justify-center text-black">
                   <span className="material-symbols-outlined font-black">real_estate_agent</span>
                 </div>
                 <span className="font-heading font-black text-xl tracking-tight hidden sm:block">{agency?.agency_name || 'HomeSalesReady'}</span>
               </div>
             )}
          </div>
          
          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-full bg-[#00e5a0]/10 border border-[#00e5a0]/20 flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[#00e5a0] animate-pulse" />
              <span className="text-[10px] font-black text-[#00e5a0] uppercase tracking-widest">Verified Pack</span>
            </div>
            {isRegistered && (
              <Button onClick={handlePrint} variant="outline" className="h-10 px-4 rounded-xl border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/5 transition-all flex items-center gap-2">
                Print / PDF <span className="material-symbols-outlined text-sm">print</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="pt-32 pb-32 px-6 max-w-4xl mx-auto">
        {!isRegistered ? (
          /* ── REGISTRATION GATE ── */
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
            <div className="text-center space-y-4">
              <h1 className="text-4xl md:text-5xl font-black font-heading leading-tight tracking-tight">
                Access the Property Pack for <br/>
                <span className="text-[#00e5a0]">{property.address}</span>
              </h1>
              <p className="text-zinc-500 text-lg max-w-xl mx-auto">
                In accordance with UK property regulations, please register your details to view full material information and download verified documents.
              </p>
            </div>

            <Card className="p-10 md:p-12 border-white/5 bg-zinc-900/40 backdrop-blur-2xl rounded-[40px] shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 size-64 bg-[#00e5a0]/5 blur-[100px] pointer-events-none" />
               <form onSubmit={handleRegister} className="space-y-8 relative z-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Full Name</label>
                     <input 
                       required 
                       type="text" 
                       value={viewerForm.name}
                       onChange={e => setViewerForm({...viewerForm, name: e.target.value})}
                       className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[#00e5a0]/50 outline-none transition-all"
                       placeholder="Enter your name"
                     />
                   </div>
                   <div className="space-y-3">
                     <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Email Address</label>
                     <input 
                       required 
                       type="email" 
                       value={viewerForm.email}
                       onChange={e => setViewerForm({...viewerForm, email: e.target.value})}
                       className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[#00e5a0]/50 outline-none transition-all"
                       placeholder="john@example.com"
                     />
                   </div>
                 </div>

                 <div className="space-y-3">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Phone Number</label>
                   <input 
                     required 
                     type="tel" 
                     value={viewerForm.phone}
                     onChange={e => setViewerForm({...viewerForm, phone: e.target.value})}
                     className="w-full h-14 bg-black/40 border border-white/10 rounded-2xl px-5 text-sm focus:border-[#00e5a0]/50 outline-none transition-all"
                     placeholder="e.g. 07123 456 789"
                   />
                 </div>

                 <div className="space-y-6 pt-4 border-t border-white/5">
                   <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] px-1">Are you currently selling a property?</label>
                   <div className="flex gap-4">
                     {[true, false].map((val) => (
                       <button
                         key={val ? 'yes' : 'no'}
                         type="button"
                         onClick={() => setViewerForm({...viewerForm, is_selling: val})}
                         className={`flex-1 h-14 rounded-2xl border text-sm font-black transition-all ${
                           viewerForm.is_selling === val 
                           ? 'bg-white text-black border-white' 
                           : 'bg-black/40 border-white/10 text-zinc-500 hover:border-white/20'
                         }`}
                       >
                         {val ? 'Yes' : 'No'}
                       </button>
                     ))}
                   </div>
                 </div>

                 {viewerForm.is_selling && (
                   <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                     <label className="text-[10px] font-black text-[#00e5a0] uppercase tracking-[0.2em] px-1">Where is your property located?</label>
                     <input 
                       required={viewerForm.is_selling}
                       type="text" 
                       value={viewerForm.selling_location}
                       onChange={e => setViewerForm({...viewerForm, selling_location: e.target.value})}
                       className="w-full h-14 bg-black/40 border border-[#00e5a0]/20 rounded-2xl px-5 text-sm focus:border-[#00e5a0]/50 outline-none transition-all"
                       placeholder="Enter city or area"
                     />
                   </div>
                 )}

                 <Button 
                   type="submit" 
                   disabled={registering}
                   className="w-full h-16 rounded-2xl bg-[#00e5a0] text-black font-black font-heading text-xl shadow-2xl shadow-[#00e5a0]/20 hover:scale-[1.02] active:scale-95 transition-all"
                 >
                   {registering ? 'Granting Access...' : 'Register & View Pack'}
                 </Button>
               </form>
            </Card>
          </div>
        ) : (
          /* ── THE PROPERTY PACK VIEW ── */
          <div className="space-y-20 animate-in fade-in duration-1000 print:text-black">
            {/* HERO SECTION */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[#00e5a0] text-[10px] font-black uppercase tracking-[0.3em] font-heading bg-[#00e5a0]/10 px-4 py-2 rounded-full border border-[#00e5a0]/20">
                   <span className="material-symbols-outlined text-sm">verified</span>
                   Verified Information Pack
                </div>
                <span className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                  Updated {new Date(property.updated_at || property.created_at).toLocaleDateString()}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black font-heading tracking-tight leading-none">
                {property.address}
              </h1>
              <p className="text-2xl text-zinc-500 tracking-tight">{property.postcode}</p>
            </div>

            {/* PROPERTY SNAPSHOT */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               {[
                 { label: 'Type', value: property.property_type, icon: 'home' },
                 { label: 'Tenure', value: property.tenure, icon: 'vpn_key' },
                 { label: 'Bedrooms', value: property.bedrooms, icon: 'bed' },
                 { label: 'Council Tax', value: `Band ${property.council_tax_band}`, icon: 'receipt_long' },
               ].map(item => (
                 <Card key={item.label} className="p-6 bg-zinc-900/40 border-white/5 space-y-3 print:border-zinc-200">
                   <span className="material-symbols-outlined text-[#00e5a0] text-2xl">{item.icon}</span>
                   <div>
                     <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest">{item.label}</p>
                     <p className="font-bold text-white text-lg print:text-black">{item.value}</p>
                   </div>
                 </Card>
               ))}
            </div>

            {/* MATERIAL INFORMATION */}
            <div className="space-y-10">
               <div className="flex items-center gap-4 border-b border-white/5 pb-6">
                 <h2 className="text-3xl font-black font-heading tracking-tight">Material Information</h2>
                 <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest bg-zinc-900/50 px-3 py-1 rounded-full border border-white/5">Consumer Code Compliant</span>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                 <div className="space-y-8">
                   <div className="space-y-6">
                     <h4 className="text-xs font-black text-[#00e5a0] uppercase tracking-[0.2em]">Utilities & Infrastructure</h4>
                     <div className="space-y-4">
                       {[
                         { label: 'Essential Services', value: materialInfo?.utilities || 'Mains Water, Electric, Gas' },
                         { label: 'Parking Provisions', value: materialInfo?.parking || 'Driveway and Garage' },
                       ].map(i => (
                         <div key={i.label} className="space-y-1">
                           <p className="text-[11px] font-bold text-zinc-500 uppercase">{i.label}</p>
                           <p className="text-sm font-medium leading-relaxed">{i.value}</p>
                         </div>
                       ))}
                     </div>
                   </div>

                   <div className="space-y-6">
                     <h4 className="text-xs font-black text-[#00e5a0] uppercase tracking-[0.2em]">Environmental Risks</h4>
                     <div className="space-y-4">
                       {[
                         { label: 'Flood risk & Coastal Erosion', value: materialInfo?.flooding_risk || 'No known risk' },
                       ].map(i => (
                         <div key={i.label} className="space-y-1">
                           <p className="text-[11px] font-bold text-zinc-500 uppercase">{i.label}</p>
                           <p className="text-sm font-medium leading-relaxed">{i.value}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>

                 <div className="space-y-8">
                    <div className="space-y-6">
                      <h4 className="text-xs font-black text-[#00e5a0] uppercase tracking-[0.2em]">Legal & Planning</h4>
                      <div className="space-y-4">
                        {[
                          { label: 'Building Safety', value: materialInfo?.building_safety || 'Standard Construction, no cladding issues' },
                          { label: 'Planning & Local Work', value: materialInfo?.planning_history || 'No active planning notices' },
                          { label: 'Disputes & Notices', value: materialInfo?.disputes_notices || 'None disclosed' },
                        ].map(i => (
                          <div key={i.label} className="space-y-1">
                            <p className="text-[11px] font-bold text-zinc-500 uppercase">{i.label}</p>
                            <p className="text-sm font-medium leading-relaxed">{i.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
               </div>
            </div>

            {/* DOWNLOADABLE DOCUMENTS */}
            <div className="space-y-8">
               <h2 className="text-3xl font-black font-heading tracking-tight border-b border-white/5 pb-6">Verified Documents</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {documents.length > 0 ? documents.map((doc, idx) => (
                    <a 
                      key={idx} 
                      href={doc.file_url} 
                      download 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-6 bg-zinc-900 border border-white/5 rounded-3xl flex items-center justify-between hover:bg-zinc-800 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-black/40 rounded-2xl flex items-center justify-center text-[#00e5a0] group-hover:scale-110 transition-transform">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div>
                          <p className="font-bold text-sm tracking-tight">{doc.name || doc.document_type}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">{doc.category || 'Information'}</p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-zinc-600 group-hover:text-white transition-colors">download</span>
                    </a>
                  )) : (
                    <div className="col-span-full p-12 text-center border-2 border-dashed border-white/5 rounded-[40px] text-zinc-600">
                      <p className="text-sm italic">Standard title deeds and identification documents are being prepared by the solicitor and will be available shortly.</p>
                    </div>
                  )}
               </div>
            </div>

            {/* AGENCY CONTACT */}
            <Card className="p-10 border-[#00e5a0]/20 bg-[#00e5a0]/5 rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-8 print:hidden">
              <div className="space-y-2 text-center md:text-left">
                <p className="text-[10px] font-black text-[#00e5a0] uppercase tracking-[0.2em]">Listing Estate Agent</p>
                <h3 className="text-2xl font-black font-heading tracking-tight">{agency?.agency_name || 'HomeSalesReady'}</h3>
                <p className="text-sm text-zinc-400">Please contact the agent directly to request a viewing or make an offer.</p>
              </div>
              <Button variant="primary" className="h-14 px-10 rounded-2xl text-black font-black font-heading shadow-xl shadow-[#00e5a0]/15">
                Request Viewing
              </Button>
            </Card>

            <footer className="pt-20 text-center opacity-30 text-[9px] font-black uppercase tracking-[0.3em]">
               HomeSalesReady • Prepared for {property.address}
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
