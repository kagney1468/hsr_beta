import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AddressLookup } from '../components/AddressLookup';
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
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
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
            address_line1: prop.address_line1 || '',
            address_line2: prop.address_line2 || '',
            address_town: prop.city || '',
            address_county: '',
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
          address: [formData.address_line1, formData.address_line2, formData.address_town, formData.address_county, formData.postcode].filter(Boolean).join(', '),
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.address_town,
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
          className="size-5 rounded-full border border-[var(--border)] bg-[var(--teal-050)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--teal-600)] transition-all"
        >
          <span className="material-symbols-outlined text-[14px]">question_mark</span>
        </button>
        {open && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-white text-[var(--text)] text-[11px] leading-relaxed rounded-2xl opacity-100 transition-all z-50 border border-[var(--border)] shadow-soft animate-in zoom-in-95 fade-in duration-200">
            <div className="font-bold text-[var(--teal-600)] mb-1">Why this matters</div>
            {text}
            <div className="mt-2 text-[10px] text-[var(--muted)] italic">This speeds up your legal process by reducing solicitor inquiries later.</div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white" />
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[var(--page)]"><div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)] p-6 md:p-10 font-display">
      <div className="max-w-3xl mx-auto space-y-10">
        {/* Progress Header */}
        <div className="space-y-6">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[var(--teal-600)] font-black uppercase tracking-[0.2em] text-[10px] mb-2">Step {currentStep} of 4</p>
              <h1 className="text-4xl md:text-6xl font-black font-heading text-[var(--teal-900)] tracking-tight leading-none">
                {currentStep === 1 && "The Address"}
                {currentStep === 2 && "Core Details"}
                {currentStep === 3 && "Material Info"}
                {currentStep === 4 && "Documents"}
              </h1>
            </div>
            <div className="text-right hidden md:block">
              <p className="text-[var(--muted)] text-[10px] font-black uppercase tracking-widest mb-1">Onboarding Progress</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-black font-heading text-[var(--teal-900)]">{currentStep * 25}%</span>
                <div className="size-3 rounded-full bg-[var(--teal-500)] animate-pulse shadow-[0_0_10px_var(--teal-500)]" />
              </div>
            </div>
          </div>
          
          <div className="h-2.5 w-full bg-[var(--teal-050)] rounded-full overflow-hidden border border-[var(--border)] p-0.5">
            <div 
              className="h-full bg-gradient-to-r from-[var(--teal-500)] to-[var(--teal-600)] transition-all duration-1000 ease-in-out rounded-full"
              style={{ width: `${currentStep * 25}%` }}
            />
          </div>
        </div>

        <Card className="p-8 md:p-12 space-y-10 relative overflow-hidden group/card rounded-[28px]">
          <div className="absolute -top-40 -right-40 size-96 bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none transition-colors duration-1000" />
          
          {/* Step Content */}
          <div className="min-h-[350px] animate-in fade-in slide-in-from-bottom-6 duration-700">
            {currentStep === 1 && (
              <div className="space-y-8">
                <div className="space-y-6">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--muted)] flex items-center">
                    Postcode Search
                    <HelpTooltip text="A valid postcode allows us to fetch exact property addresses from the Royal Mail database." />
                  </label>
                  <AddressLookup 
                    postcode={formData.postcode} 
                    onPostcodeChange={(val) => setFormData({...formData, postcode: val})} 
                    onAddressSelect={(addr) => {
                      setFormData(prev => ({
                        ...prev,
                        address_line1: addr.line1,
                        address_line2: addr.line2,
                        address_town: addr.town,
                        address_county: addr.county,
                        postcode: addr.postcode
                      }));
                    }} 
                  />
                </div>

                <div className="pt-4 space-y-4 border-t border-[var(--border)] animate-in fade-in duration-500">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 1</label>
                    <input
                      type="text"
                      name="address_line1"
                      value={formData.address_line1}
                      onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                      className="w-full font-semibold"
                      placeholder="123 Example Street"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 2 (Optional)</label>
                    <input
                      type="text"
                      name="address_line2"
                      value={formData.address_line2}
                      onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                      className="w-full font-semibold"
                      placeholder="Apt 4B"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Town / City</label>
                      <input
                        type="text"
                        name="address_town"
                        value={formData.address_town}
                        onChange={(e) => setFormData({ ...formData, address_town: e.target.value })}
                        className="w-full font-semibold"
                        placeholder="London"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">County</label>
                      <input
                        type="text"
                        name="address_county"
                        value={formData.address_county}
                        onChange={(e) => setFormData({ ...formData, address_county: e.target.value })}
                        className="w-full font-semibold"
                        placeholder="Greater London"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Postcode</label>
                    <input
                      type="text"
                      name="postcode"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className="w-full font-semibold uppercase tracking-widest"
                      placeholder="SW1A 1AA"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center">
                    Property Type
                    <HelpTooltip text="This helps buyers understand the structural nature of the building (e.g., detached, terrace)." />
                  </label>
                  <select
                    className="w-full"
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
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center">
                    Tenure
                    <HelpTooltip text="Freehold means you own the land. Leasehold involves a landlord and annual ground rent/service charges." />
                  </label>
                  <select
                    className="w-full"
                    value={formData.tenure}
                    onChange={(e) => setFormData({...formData, tenure: e.target.value})}
                  >
                    <option>Freehold</option>
                    <option>Leasehold</option>
                    <option>Share of Freehold</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center">
                    Bedrooms
                    <HelpTooltip text="The number of bedrooms is a key valuation factor and must match the legal description." />
                  </label>
                  <input
                    type="number"
                    className="w-full"
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({...formData, bedrooms: parseInt(e.target.value, 10)})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center">
                    Council Tax Band
                    <HelpTooltip text="Mandatory disclosure. Buyers need to know their ongoing monthly costs." />
                  </label>
                  <select
                    className="w-full"
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
                   <div className="p-5 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] space-y-3">
                      <label className="text-xs font-bold text-[var(--teal-900)] flex items-center">
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
                              className="size-5 rounded border border-[var(--border)]"
                            />
                            <span className="text-xs capitalize font-medium text-[var(--text)]">{util}</span>
                          </label>
                        ))}
                      </div>
                   </div>
                   
                   <div className="p-5 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] space-y-3">
                      <label className="text-xs font-bold text-[var(--teal-900)] flex items-center">
                        Parking
                        <HelpTooltip text="Parking availability significantly impacts property value and buyer interest." />
                      </label>
                      <select
                        className="w-full"
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
                    <label className="text-xs font-black uppercase tracking-widest text-[var(--muted)] flex items-center">
                      {field.label}
                      <HelpTooltip text={field.help} />
                    </label>
                    <input
                      className="w-full"
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
                    <div key={doc.title} className="p-6 rounded-3xl border border-[var(--border)] bg-white flex items-center justify-between group hover:border-[var(--teal-500)]/40 transition-all cursor-pointer shadow-soft">
                      <div className="flex items-center gap-4">
                        <div className="size-12 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)]">
                          <span className="material-symbols-outlined">{doc.icon}</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[var(--teal-900)]">{doc.title}</p>
                          <p className="text-[10px] text-[var(--muted)] font-medium">
                            {doc.required ? 'MANDATORY' : 'OPTIONAL'}
                          </p>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-[var(--muted)] group-hover:text-[var(--teal-600)] transition-colors">upload_file</span>
                    </div>
                  ))}
                </div>
                
                <div className="p-6 rounded-3xl border-2 border-dashed border-[var(--border)] bg-[var(--teal-050)] text-center space-y-4">
                   <span className="material-symbols-outlined text-4xl text-[var(--muted)]">cloud_upload</span>
                   <p className="text-[var(--muted)] text-sm">Drag and drop your property documents here</p>
                   <Button variant="outline" className="text-xs">Browse files</Button>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-8 border-t border-[var(--border)]">
            {currentStep > 1 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex-1 h-14 rounded-2xl font-bold border-[var(--border)]"
              >
                Back
              </Button>
            )}
            <Button 
              variant="primary" 
              onClick={nextStep}
              disabled={saving}
              className="flex-[2] h-14 rounded-2xl font-black font-heading text-lg"
            >
              {saving ? 'Saving...' : currentStep === 4 ? 'Complete Onboarding' : 'Save and Continue'}
            </Button>
          </div>
        </Card>

        {/* Floating help notice */}
        <div className="flex items-center justify-center gap-2 text-[var(--muted)]">
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
          background: var(--teal-050);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(23, 175, 175, 0.35);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(23, 175, 175, 0.55);
        }
      `}</style>
    </div>
  );
}
