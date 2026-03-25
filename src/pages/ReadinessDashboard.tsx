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
    documentsComplete: false,
    materialComplete: false,
    missingItems: [] as string[]
  });

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      try {
        const { data: propData } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', user.id)
          .single();

        if (propData) setProperty(propData);

        const { data: docs } = await supabase
          .from('documents')
          .select('*')
          .eq('property_id', propData?.id);

        const { data: miData } = await supabase
          .from('material_information')
          .select('*')
          .eq('property_id', propData?.id)
          .single();

        let score = 0;
        let missing = [];

        // 1. Mandatory Documents (50%)
        const mandatoryDocs = ['Title Deeds', 'EPC Certificate'];
        if (propData?.tenure === 'Leasehold') {
          mandatoryDocs.push('Leasehold Documents');
        }

        let uploadedMandatoryCount = 0;
        mandatoryDocs.forEach(docType => {
          if (docs?.some(d => d.document_type === docType)) {
            uploadedMandatoryCount++;
          } else {
            missing.push(`Upload ${docType}`);
          }
        });

        const docsRatio = uploadedMandatoryCount / mandatoryDocs.length;
        score += Math.round(docsRatio * 50);
        const documentsComplete = docsRatio === 1;

        // 2. Material Information Answers (50%)
        // Assume material information is complete if the record exists and key fields are answered.
        const miFields = [
          'water_supply', 'electricity_supply', 'broadband_speed', 'mobile_signal',
          'flood_risk', 'coastal_erosion', 'coalfield_area', 'disputes'
        ];
        
        let answeredMiCount = 0;
        if (miData) {
          miFields.forEach(field => {
            if (miData[field] && miData[field] !== '') {
              answeredMiCount++;
            }
          });
        }
        
        const miRatio = miData ? (answeredMiCount / miFields.length) : 0;
        score += Math.round(miRatio * 50);
        const materialComplete = miRatio >= 1;
        
        if (!materialComplete) {
          missing.push('Complete Material Information Form');
        }

        setReadiness({
          score,
          documentsComplete,
          materialComplete,
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

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-10">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Readiness report</h1>
        <p className="text-[var(--muted)]">Advanced analysis of your property pack completion status.</p>
      </div>

      <Card className="p-10 relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 size-64 bg-[var(--teal-050)] blur-3xl -mr-32 -mt-32 rounded-full" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
          <div className="size-40 relative flex items-center justify-center">
             <svg className="size-full -rotate-90" viewBox="0 0 100 100">
               <circle cx="50" cy="50" r="44" fill="none" stroke="var(--border)" strokeWidth="8" />
               <circle cx="50" cy="50" r="44" fill="none" stroke="var(--teal-600)" strokeWidth="8" strokeDasharray="276" strokeDashoffset={276 - (276 * readiness.score) / 100} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
             </svg>
             <span className="absolute text-4xl font-black font-heading text-[var(--teal-900)]">{readiness.score}%</span>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
             <h2 className="text-2xl font-black font-heading text-[var(--teal-900)]">
                {readiness.score === 100 ? "Ready to sell!" : "Almost at the finish line"}
             </h2>
             <p className="text-[var(--muted)] text-sm leading-relaxed">
                {readiness.score === 100 
                  ? "Your property information pack is 100% verified and compliant. You can now share it with potential buyers."
                  : `You have ${readiness.missingItems.length} critical items remaining. Completing these now will save an average of 3 weeks during the legal process.`}
             </p>
             <div className="pt-2">
                <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full border border-[var(--border)]">
                   <div className={`size-2 rounded-full ${readiness.score === 100 ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}`} />
                   <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                      Status: {readiness.score === 100 ? 'Market Ready' : 'In Preparation'}
                   </span>
                </div>
             </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
           <h3 className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)] px-2">Completed steps</h3>
           <div className="space-y-3">
              {[
                { label: 'Mandatory Documents', done: readiness.documentsComplete },
                { label: 'Material Information Form', done: readiness.materialComplete }
              ].filter(i => i.done).map(item => (
                <div key={item.label} className="p-4 bg-white border border-[var(--border)] rounded-2xl flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#059669]">check_circle</span>
                      <span className="text-sm font-semibold text-[var(--teal-900)]">{item.label}</span>
                   </div>
                   <span className="text-[9px] font-semibold uppercase tracking-widest text-[#059669] bg-[#d1fae5] px-2 py-1 rounded">Verified</span>
                </div>
              ))}
              {!readiness.documentsComplete && !readiness.materialComplete && (
                  <p className="text-[var(--muted)] italic text-sm px-2">No steps completed yet.</p>
              )}
           </div>
        </div>

        <div className="space-y-6">
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 px-2">Action Required</h3>
           <div className="space-y-3">
              {readiness.missingItems.length > 0 ? readiness.missingItems.map(item => (
                <div
                  key={item}
                  className="p-4 bg-white border border-[var(--border)] rounded-2xl flex items-center justify-between group hover:border-amber-400/50 shadow-soft transition-all"
                >
                   <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-amber-500">pending</span>
                      <span className="text-sm font-bold text-[var(--teal-900)]">{item}</span>
                   </div>
                     <Link 
                      to={item.includes('Material Information') ? '/seller/property' : '/seller/documents'}
                      className="text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-3 py-2 rounded-lg hover:bg-amber-500 hover:text-black transition-all"
                     >
                     Fix Now
                   </Link>
                </div>
              )) : (
                <div className="p-8 text-center bg-[var(--teal-050)] border border-dashed border-[var(--border)] rounded-3xl">
                   <span className="material-symbols-outlined text-3xl text-[var(--teal-600)] mb-2">auto_awesome</span>
                   <p className="text-[var(--muted)] text-sm">Perfect Score! All actions completed.</p>
                </div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
