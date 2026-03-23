import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

type Step = 1 | 2 | 3 | 4;

export default function SellerOnboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Address
    address: '',
    postcode: '',
    // Step 2: Details
    property_type: 'Detached',
    tenure: 'Freehold',
    bedrooms: 3,
    council_tax_band: 'D',
    epc_rating: 'C',
    // Step 3: Material Info
    utilities: { gas: true, electric: true, water: true, broadband: 'Fibre' },
    parking: 'Driveway',
    flooding_risk: 'Low',
    building_safety: 'No issues known',
    planning_history: 'None',
    disputes_notices: 'None',
    building_reg_works: 'None',
    disputes: 'None',
    building_regs_required: false,
  });

  useEffect(() => {
    async function initOnboarding() {
      if (!user) return;
      
      try {
        const { data: prop, error } = await supabase
          .from('properties')
          .select('*')
          .eq('seller_user_id', user.id)
          .maybeSingle();

        if (prop) {
          setPropertyId(prop.id);
          setFormData(prev => ({
            ...prev,
            address: prop.address || '',
            postcode: prop.postcode || '',
            property_type: prop.property_type || 'Detached',
            tenure: prop.tenure || 'Freehold',
            bedrooms: prop.bedrooms || 3,
            council_tax_band: prop.council_tax_band || 'D',
            epc_rating: prop.epc_rating || 'C',
          }));

          // Fetch material info if exists
          const { data: matInfo } = await supabase
            .from('material_information')
            .select('*')
            .eq('property_id', prop.id)
            .maybeSingle();
          
          if (matInfo) {
            setFormData(prev => ({
              ...prev,
              utilities: (matInfo.utilities as any) || prev.utilities,
              parking: matInfo.parking || prev.parking,
              flooding_risk: matInfo.flooding_risk || prev.flooding_risk,
              building_safety: matInfo.building_safety || prev.building_safety,
              planning_history: matInfo.planning_history || prev.planning_history,
              disputes_notices: matInfo.disputes_notices || prev.disputes_notices,
              building_reg_works: matInfo.building_reg_works || prev.building_reg_works,
            }));
          }
        }
      } catch (err) {
        console.error('Error loading onboarding data:', err);
      } finally {
        setLoading(false);
      }
    }

    initOnboarding();
  }, [user]);

  const saveStepData = async (step: Step) => {
    if (!user) return;
    setSaving(true);
    
    try {
      let currentPropId = propertyId;

      if (step === 1 || step === 2) {
        const payload = {
          seller_user_id: user.id,
          address: formData.address,
          postcode: formData.postcode,
          property_type: formData.property_type,
          tenure: formData.tenure,
          bedrooms: formData.bedrooms,
          council_tax_band: formData.council_tax_band,
          epc_rating: formData.epc_rating,
        };

        if (currentPropId) {
          await supabase.from('properties').update(payload).eq('id', currentPropId);
        } else {
          const { data, error } = await supabase.from('properties').insert(payload).select().single();
          if (error) throw error;
          currentPropId = data.id;
          setPropertyId(data.id);
        }
      }

      if (step === 3 && currentPropId) {
        const payload = {
          property_id: currentPropId,
          utilities: formData.utilities,
          parking: formData.parking,
          flooding_risk: formData.flooding_risk,
          building_safety: formData.building_safety,
          planning_history: formData.planning_history,
          disputes_notices: formData.disputes_notices,
          building_reg_works: formData.building_reg_works,
          disputes: formData.disputes,
          building_regs_required: formData.building_regs_required,
          updated_at: new Date().toISOString(),
        };

        const { data: existing } = await supabase.from('material_information').select('id').eq('property_id', currentPropId).single();
        
        if (existing) {
          await supabase.from('material_information').update(payload).eq('id', existing.id);
        } else {
          await supabase.from('material_information').insert(payload);
        }
      }
    } catch (err) {
      console.error('Error saving step:', err);
    } finally {
      setSaving(false);
    }
  };

  const nextStep = async () => {
    await saveStepData(currentStep);
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as Step);
    } else {
      navigate('/seller/dashboard');
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const HelpTooltip = ({ text }: { text: string }) => {
    const [open, setOpen] = useState(false);
    return (
      <div className="relative inline-block ml-2 align-middle">
        <button 
          onClick={() => setOpen(!open)}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          className="size-5 rounded-full bg-white/10 flex items-center justify-center text-zinc-400 hover:text-[#00e5a0] hover:bg-[#00e5a0]/10 transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">question_mark</span>
        </button>
        {open && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-zinc-800/95 backdrop-blur-md text-white text-[11px] leading-relaxed rounded-2xl opacity-100 transition-all z-50 border border-white/10 shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <div className="font-bold text-[#00e5a0] mb-1">Why this matters</div>
            {text}
            <div className="mt-2 text-[10px] text-zinc-500 italic">This speeds up your legal process by reducing solicitor inquiries later.</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-800/95" />
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-black"><div className="animate-spin size-10 border-4 border-[#00e5a0] border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-black text-white p-6 md:p-10 font-sans selection:bg-[#00e5a0]/30">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Progress Header */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[#00e5a0] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of 4</p>
              <h1 className="text-4xl md:text-6xl font-black font-heading tracking-tight leading-none">
                {currentStep === 1 && "The Address"}
                {currentStep === 2 && "Core Details"}
                {currentStep === 3 && "Material Info"}
                {currentStep === 4 && "Documents"}
              </h1>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest mb-1">Onboarding Progress</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black font-heading text-white">{currentStep * 25}%</span>
                <div className="size-3 rounded-full bg-[#00e5a0] animate-pulse shadow-[0_0_10px_#00e5a0]" />
              </div>
            </div>
          </div>
          
          <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-white/5 p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[#00e5a0] to-[#00ffb3] transition-all duration-1000 ease-in-out rounded-full shadow-[0_0_25px_rgba(0,229,160,0.4)]"
              style={{ width: `${currentStep * 25}%` }}
            />
          </div>
        </div>

        <Card className="p-8 md:p-12 border-white/5 bg-zinc-900/40 backdrop-blur-2xl shadow-2xl space-y-10 relative overflow-hidden group/card rounded-[40px]">
          {/* Subtle background glow */}
          <div className="absolute -top-40 -right-40 size-96 bg-[#00e5a0]/10 blur-[120px] rounded-full pointer-events-none group-hover/card:bg-[#00e5a0]/15 transition-colors duration-1000" />
          
          {/* Step Content */}
          <div className="min-h-[350px] animate-in fade-in slide-in-from-bottom-6 duration-700">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center">
                    Full Property Address
                    <HelpTooltip text="Solicitors need your exact address as it appears on the Land Registry to verify ownership and perform searches." />
                  </label>
                  <textarea 
                    className="w-full p-6 h-40 rounded-[32px] border border-white/10 bg-black/40 text-white focus:border-[#00e5a0]/50 outline-none transition-all resize-none text-lg font-medium placeholder:text-zinc-700"
                    placeholder="e.g. 123 High Street, London..."
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center">
                    Postcode
                    <HelpTooltip text="A valid postcode allows us to automatically fetch EPC data and local authority flood risk records." />
                  </label>
                  <input 
                    className="w-full h-16 px-6 rounded-2xl border border-white/10 bg-black/40 text-white focus:border-[#00e5a0]/50 outline-none transition-all text-xl font-black tracking-widest uppercase placeholder:text-zinc-800"
                    placeholder="E.G. SW1A 1AA"
                    value={formData.postcode}
                    onChange={(e) => setFormData({...formData, postcode: e.target.value})}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center">
                    Property Type
                    <HelpTooltip text="This helps buyers understand the structural nature of the building (e.g., detached, terrace)." />
                  </label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all appearance-none"
                    value={formData.property_type}
                    onChange={(e) => setFormData({...formData, property_type: e.target.value})}
                  >
                    <option>Detached</option>
                    <option>Semi-Detached</option>
                    <option>Terrace</option>
                    <option>Flat / Maisonette</option>
                    <option>Bungalow</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center">
                    Tenure
                    <HelpTooltip text="Freehold means you own the land. Leasehold involves a landlord and annual ground rent/service charges." />
                  </label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all appearance-none"
                    value={formData.tenure}
                    onChange={(e) => setFormData({...formData, tenure: e.target.value})}
                  >
                    <option>Freehold</option>
                    <option>Leasehold</option>
                    <option>Share of Freehold</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center">
                    Bedrooms
                    <HelpTooltip text="The number of bedrooms is a key valuation factor and must match the legal description." />
                  </label>
                  <input 
                    type="number"
                    className="w-full h-14 px-4 rounded-2xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center">
                    Council Tax Band
                    <HelpTooltip text="Mandatory disclosure. Buyers need to know their ongoing monthly costs." />
                  </label>
                  <select 
                    className="w-full h-14 px-4 rounded-2xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all appearance-none"
                    value={formData.council_tax_band}
                    onChange={(e) => setFormData({...formData, council_tax_band: e.target.value})}
                  >
                    {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-8 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                      <label className="text-xs font-bold text-[#00e5a0] flex items-center">
                        Utilities
                        <HelpTooltip text="Confirming mains connections for gas, water, and electric is essential for the TA6 legal form." />
                      </label>
                      <div className="flex flex-wrap gap-4">
                        {Object.keys(formData.utilities).filter(k => k !== 'broadband').map(util => (
                          <label key={util} className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={(formData.utilities as any)[util]} 
                              onChange={(e) => setFormData({
                                ...formData, 
                                utilities: { ...formData.utilities, [util]: e.target.checked }
                              })}
                              className="size-5 rounded border-white/10 bg-black"
                            />
                            <span className="text-xs capitalize font-medium">{util}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                   
                   <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                      <label className="text-xs font-bold text-[#00e5a0] flex items-center">
                        Parking
                        <HelpTooltip text="Parking availability significantly impacts property value and buyer interest." />
                      </label>
                      <select 
                        className="w-full bg-transparent border-none outline-none text-sm text-white"
                        value={formData.parking}
                        onChange={(e) => setFormData({...formData, parking: e.target.value})}
                      >
                        <option>Driveway</option>
                        <option>Garage</option>
                        <option>On-street (Allocated)</option>
                        <option>On-street (Casual)</option>
                        <option>Off-street (Private)</option>
                        <option>None</option>
                      </select>
                   </div>
                </div>

                {[
                  { id: 'flooding_risk', label: 'Flooding Risk', help: 'Recent law changes require disclosure of flood risk history and insurance difficulties.' },
                  { id: 'building_safety', label: 'Building Safety', help: 'Covers issues like cladding, asbestos, or structural concerns identified in surveys.' },
                  { id: 'planning_history', label: 'Planning History', help: 'Any developments nearby or previously rejected applications for this property.' },
                  { id: 'disputes_notices', label: 'Disputes or Notices', help: 'Legal requirement to disclose disputes with neighbors or council notices.' },
                  { id: 'building_reg_works', label: 'Works req. Building Regs', help: 'Solictors will need certificates for any electrical, gas, or structural work done.' }
                ].map(field => (
                  <div key={field.id} className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center">
                      {field.label}
                      <HelpTooltip text={field.help} />
                    </label>
                    <input 
                      className="w-full h-14 px-4 rounded-2xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                      placeholder="e.g. None known / Detail here..."
                      value={(formData as any)[field.id]}
                      onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                    />
                  </div>
                ))}
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { title: 'Title Deeds', icon: 'description', required: true },
                    { title: 'EPC Certificate', icon: 'verified', required: true },
                    { title: 'Building Regs Certs', icon: 'architecture', required: false },
                    { title: 'Warranties/Guarantees', icon: 'award_star', required: false },
                    { title: 'Leasehold Pack', icon: 'folder_open', required: formData.tenure !== 'Freehold' }
                  ].map((doc) => (
                    <div key={doc.title} className="p-6 rounded-3xl border border-white/5 bg-white/[0.02] flex items-center justify-between group hover:border-[#00e5a0]/20 transition-all cursor-pointer">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-zinc-800 flex items-center justify-center text-[#00e5a0]">
                          <span className="material-symbols-outlined">{doc.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold">{doc.title}</p>
                          <p className="text-[10px] text-zinc-500 font-medium">
                            {doc.required ? 'MANDATORY' : 'OPTIONAL'}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-zinc-600 group-hover:text-[#00e5a0] transition-colors">upload_file</span>
                    </div>
                  ))}
                </div>
                
                <div className="p-6 rounded-3xl border-2 border-dashed border-white/10 bg-black/20 text-center space-y-4">
                   <span className="material-symbols-outlined text-4xl text-zinc-700">cloud_upload</span>
                   <p className="text-zinc-500 text-sm">Drag and drop your property documents here</p>
                   <Button variant="outline" className="text-xs">Browse files</Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-8 border-t border-white/5">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex-1 h-14 rounded-2xl text-zinc-400 font-bold border-white/5 hover:bg-white/5"
              >
                Back
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={nextStep}
              disabled={saving}
              className="flex-[2] h-14 rounded-2xl text-black font-black font-heading text-lg shadow-xl shadow-[#00e5a0]/10"
            >
              {saving ? 'Saving...' : currentStep === 4 ? 'Complete Onboarding' : 'Save and Continue'}
            </Button>
          </div>
        </Card>

        {/* Floating help notice */}
        <div className="flex items-center justify-center gap-2 text-zinc-600">
           <span className="material-symbols-outlined text-sm">lock</span>
           <p className="text-[10px] font-black uppercase tracking-widest text-center">
             Your information is encrypted and only shared with verified buyers & solicitors.
           </p>
        </div>
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 229, 160, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 229, 160, 0.4);
        }
      `}</style>
    </div>
  );
}
