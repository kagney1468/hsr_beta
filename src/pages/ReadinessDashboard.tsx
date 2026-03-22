import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

export default function ReadinessDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<any>(null);
  const [readiness, setReadiness] = useState({
    score: 0,
    profileComplete: false,
    propertyComplete: false,
    documentsComplete: false,
    declarationComplete: false,
    missingItems: [] as string[]
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        const { data: propData } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', profile?.id)
          .single();

        if (propData) setProperty(propData);

        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', propData?.id);

        const { data: declaration } = await supabase
          .from('seller_declarations')
          .select('*')
          .eq('property_id', propData?.id)
          .single();

        let score = 0;
        let missing = [];
        
        const profileComplete = !!(profile?.full_name && profile?.phone);
        if (profileComplete) score += 25;
        else missing.push('Complete Seller Profile');

        const propertyComplete = !!(propData?.address_line1 && propData?.property_type);
        if (propertyComplete) score += 25;
        else missing.push('Complete Property Details');

        const hasLandRegistry = docs?.some(d => d.document_type === 'Land Registry');
        const hasEPC = docs?.some(d => d.document_type === 'EPC certificate');
        const documentsComplete = !!(hasLandRegistry && hasEPC);
        if (documentsComplete) score += 25;
        else {
          if (!hasLandRegistry) missing.push('Upload Land Registry');
          if (!hasEPC) missing.push('Upload EPC Certificate');
        }

        const declarationComplete = !!(declaration?.signed_at);
        if (declarationComplete) score += 25;
        else missing.push('Sign Seller Declaration');

        setReadiness({
          score,
          profileComplete,
          propertyComplete,
          documentsComplete,
          declarationComplete,
          missingItems: missing
        });

      } catch (error) {
        console.error('Error loading readiness data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [user]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Readiness Report</h1>
        <p className="text-zinc-400">Advanced analysis of your property pack completion status.</p>
      </div>

      <Card className="p-10 border-white/5 bg-zinc-900 shadow-2xl relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 size-64 bg-[#00e5a0]/5 blur-3xl -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="size-40 relative flex items-center justify-center">
             <svg className="size-full -rotate-90" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
               <circle cx="50" cy="50" r="44" fill="none" stroke="#00e5a0" strokeWidth="8" strokeDasharray="276" strokeDashoffset={276 - (276 * readiness.score) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
             </svg>
             <span className="absolute text-4xl font-black font-heading text-white">{readiness.score}%</span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
             <h2 className="text-2xl font-black font-heading text-white">
                {readiness.score === 100 ? "Ready to sell!" : "Almost at the finish line"}
             </h2>
             <p className="text-zinc-400 text-sm leading-relaxed">
                {readiness.score === 100 
                  ? "Your property information pack is 100% verified and compliant. You can now share it with potential buyers."
                  : `You have ${readiness.missingItems.length} critical items remaining. Completing these now will save an average of 3 weeks during the legal process.`}
             </p>
             <div className="pt-2">
                <div className="inline-flex items-center gap-2 bg-white/5 px-4 py-2 rounded-full border border-white/5">
                   <div className={`size-2 rounded-full ${readiness.score === 100 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                   <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                      Status: {readiness.score === 100 ? 'Market Ready' : 'In Preparation'}
                   </span>
                </div>
             </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 px-2">Completed Steps</h3>
           <div className="space-y-3">
              {[
                { label: 'Seller Profile', done: readiness.profileComplete },
                { label: 'Property Metadata', done: readiness.propertyComplete },
                { label: 'Legal Documents', done: readiness.documentsComplete },
                { label: 'Digital Signature', done: readiness.declarationComplete }
              ].filter(i => i.done).map(item => (
                <div key={item.label} className="p-4 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#00e5a0]">check_circle</span>
                      <span className="text-sm font-bold text-white">{item.label}</span>
                   </div>
                   <span className="text-[9px] font-black uppercase tracking-widest text-[#00e5a0] bg-[#00e5a0]/10 px-2 py-1 rounded">Verified</span>
                </div>
              ))}
              {!readiness.profileComplete && !readiness.propertyComplete && !readiness.documentsComplete && !readiness.declarationComplete && (
                  <p className="text-zinc-600 italic text-sm px-2">No steps completed yet.</p>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 px-2">Action Required</h3>
           <div className="space-y-3">
              {readiness.missingItems.length > 0 ? readiness.missingItems.map(item => (
                <div key={item} className="p-4 bg-zinc-900 border border-white/5 rounded-2xl flex items-center justify-between group hover:border-amber-500/30 transition-all">
                   <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-amber-500">pending</span>
                      <span className="text-sm font-bold text-white">{item}</span>
                   </div>
                   <Link 
                    to={
                      item.includes('Profile') ? '/seller/profile' :
                      item.includes('Property') ? '/seller/property' :
                      item.includes('Registry') || item.includes('EPC') ? '/seller/documents' :
                      '/seller/declaration'
                    }
                    className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition-all"
                   >
                     Fix Now
                   </Link>
                </div>
              )) : (
                <div className="p-8 text-center bg-zinc-900/50 border border-dashed border-white/5 rounded-3xl">
                   <span className="material-symbols-outlined text-3xl text-[#00e5a0] mb-2">auto_awesome</span>
                   <p className="text-zinc-500 text-sm">Perfect Score! All actions completed.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
