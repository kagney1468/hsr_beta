import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { AddressLookup } from '../components/AddressLookup';
import { Tooltip } from '../components/ui/Tooltip';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { updatePackCompletion } from '../lib/completion';

export default function PropertyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [epcLoading, setEpcLoading] = useState(false);
  const [epcStatus, setEpcStatus] = useState<'initial' | 'found' | 'not_found' | 'multiple'>('initial');
  const [epcOptions, setEpcOptions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
    postcode: '',
    property_type: 'Detached House',
    bedrooms: 3,
    bathrooms: 2,
    epc_rating: '',
    epc_expiry: '',
    construction_age_band: '',
    
    // Part A
    asking_price: '',
    tenure: 'Freehold',
    council_tax_band: 'A',
    
    // Part B
    heating: 'Gas Central Heating',
    drainage: 'Mains Sewerage',
    water_supply: 'Mains',
    electricity_supply: 'Mains',
    broadband_speed: 'Superfast',
    mobile_signal: 'Good',
    parking: 'Driveway',
    
    // Part C
    building_changes: '',
    restrictions: '',
    rights_easements: '',
    flood_risk: 'Low',
    coastal_erosion: 'No',
    planning_permissions: '',
    coalfield_area: 'No',
    disputes: 'None',
    building_regs_required: false,
  });

  useEffect(() => {
    async function loadProperty() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*, material_information(*)')
          .eq('seller_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          const mi = Array.isArray(data.material_information) ? data.material_information[0] : data.material_information;
          setFormData({
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            address_town: data.city || '',
            address_county: '',
            postcode: data.postcode || '',
            property_type: data.property_type || 'Detached House',
            bedrooms: data.bedrooms || 3,
            bathrooms: data.bathrooms || 2,
            epc_rating: mi?.epc_rating || '',
            epc_expiry: mi?.epc_expiry || '',
            construction_age_band: mi?.construction_age_band || '',
            
            asking_price: data.asking_price || '',
            tenure: data.tenure || 'Freehold',
            council_tax_band: data.council_tax_band || 'A',
            
            heating: data.heating || 'Gas Central Heating',
            drainage: data.drainage || 'Mains Sewerage',
            water_supply: mi?.water_supply || 'Mains',
            electricity_supply: mi?.electricity_supply || 'Mains',
            broadband_speed: mi?.broadband_speed || 'Superfast',
            mobile_signal: mi?.mobile_signal || 'Good',
            parking: data.parking || 'Driveway',
            
            building_changes: data.building_changes || '',
            restrictions: mi?.restrictions || '',
            rights_easements: mi?.rights_easements || '',
            flood_risk: mi?.flood_risk || 'Low',
            coastal_erosion: mi?.coastal_erosion || 'No',
            planning_permissions: mi?.planning_permissions || '',
            coalfield_area: mi?.coalfield_area || 'No',
            disputes: mi?.disputes || 'None',
            building_regs_required: mi?.building_regs_required || false,
          });
        }
      } catch (error) {
        console.error('Error loading property:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProperty();
  }, [user]);

  const handleEpcLookup = async (postcode: string, addressLine1: string) => {
    try {
      setEpcLoading(true);
      setEpcStatus('initial');
      setEpcOptions([]);
      
      const epcKey = import.meta.env.VITE_EPC_API_KEY || import.meta.env.NEXT_PUBLIC_EPC_API_KEY;
      if (!epcKey) throw new Error('EPC API Key missing');

      const encodedPostcode = encodeURIComponent(postcode.replace(/\s+/g, '').toUpperCase());
      const response = await fetch(`https://epc.opendatacommunities.org/api/v1/domestic/search?postcode=${encodedPostcode}`, {
        headers: {
          'Authorization': `Basic ${epcKey}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) throw new Error('Failed to fetch EPC');
      
      const data = await response.json();
      if (!data || !data.rows || data.rows.length === 0) {
        setEpcStatus('not_found');
        return;
      }
      
      const exactMatch = data.rows.filter((r: any) => r.address.toLowerCase().includes(addressLine1.toLowerCase()));
      
      if (exactMatch.length === 1) {
        applyEpcDetails(exactMatch[0]);
        setEpcStatus('found');
      } else if (data.rows.length === 1) {
        applyEpcDetails(data.rows[0]);
        setEpcStatus('found');
      } else {
        setEpcOptions(data.rows);
        setEpcStatus('multiple');
      }
    } catch (err) {
      console.error(err);
      setEpcStatus('not_found');
    } finally {
      setEpcLoading(false);
    }
  };

  const applyEpcDetails = (epcData: any) => {
    let formattedExpiry = '';
    if (epcData['lodgement-date']) {
      const lodgement = new Date(epcData['lodgement-date']);
      lodgement.setFullYear(lodgement.getFullYear() + 10);
      formattedExpiry = lodgement.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    
    setFormData(prev => ({
      ...prev,
      epc_rating: epcData['current-energy-rating'] || prev.epc_rating,
      epc_expiry: formattedExpiry || prev.epc_expiry,
      property_type: epcData['property-type'] || prev.property_type,
      construction_age_band: epcData['construction-age-band'] || prev.construction_age_band
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    }));
  };

  const handleSave = async (redirect: boolean = false) => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      // 1. Update/Insert Property
      const { data: property, error: propError } = await supabase
        .from('properties')
        .upsert({
          seller_user_id: user.id,
          address_line1: formData.address_line1,
          address_line2: formData.address_line2,
          city: formData.address_town,
          postcode: formData.postcode,
          property_type: formData.property_type,
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          asking_price: formData.asking_price,
          tenure: formData.tenure,
          council_tax_band: formData.council_tax_band,
          heating: formData.heating,
          drainage: formData.drainage,
          parking: formData.parking,
          building_changes: formData.building_changes,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'seller_user_id' })
        .select()
        .single();

      if (propError) throw propError;

      // 2. Update/Insert Material Information
      const { error: miError } = await supabase
        .from('material_information')
        .upsert({
          property_id: property.id,
          water_supply: formData.water_supply,
          electricity_supply: formData.electricity_supply,
          broadband_speed: formData.broadband_speed,
          mobile_signal: formData.mobile_signal,
          restrictions: formData.restrictions,
          rights_easements: formData.rights_easements,
          flood_risk: formData.flood_risk,
          coastal_erosion: formData.coastal_erosion,
          planning_permissions: formData.planning_permissions,
          coalfield_area: formData.coalfield_area,
          disputes: formData.disputes,
          building_regs_required: formData.building_regs_required,
          epc_rating: formData.epc_rating,
          epc_expiry: formData.epc_expiry,
          construction_age_band: formData.construction_age_band,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'property_id' });

      if (miError) throw miError;
      
      await updatePackCompletion(property.id);
      
      setMessage({ type: 'success', text: 'Property and Material Information saved!' });
      if (redirect) navigate('/seller/documents');
    } catch (error: any) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center animate-pulse">Loading property details...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Material Information</h1>
        <p className="text-slate-500 mt-2">Required by National Trading Standards to ensure your listing is compliant.</p>
      </div>
      
      {message && (
        <div className={`p-4 mb-8 rounded-xl border ${message.type === 'success' ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-red-50/50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-12">
        <Card className="p-8 border-l-4 border-l-[var(--teal-500)]/50 space-y-8 bg-white border border-slate-200 text-slate-900">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xl font-bold font-heading text-slate-900">Property Address</h2>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-6">
              <label className="text-xs font-bold uppercase tracking-widest text-slate-600">Postcode Search</label>
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
                  handleEpcLookup(addr.postcode, addr.line1);
                }} 
              />
            </div>

            <div className="pt-4 space-y-4 border-t border-slate-200">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Address Line 1</label>
                <input 
                  type="text" 
                  name="address_line1"
                  value={formData.address_line1}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--teal-500)] focus:ring-2 focus:ring-[var(--teal-500)]/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Address Line 2</label>
                <input 
                  type="text" 
                  name="address_line2"
                  value={formData.address_line2}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--teal-500)] focus:ring-2 focus:ring-[var(--teal-500)]/20 outline-none transition-all"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Town / City</label>
                  <input 
                    type="text" 
                    name="address_town"
                    value={formData.address_town}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--teal-500)] focus:ring-2 focus:ring-[var(--teal-500)]/20 outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">County</label>
                  <input 
                    type="text" 
                    name="address_county"
                    value={formData.address_county}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--teal-500)] focus:ring-2 focus:ring-[var(--teal-500)]/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Postcode</label>
                <input 
                  type="text" 
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[var(--teal-500)] focus:ring-2 focus:ring-[var(--teal-500)]/20 outline-none transition-all"
                />
              </div>
            </div>

            {epcLoading && (
              <div className="p-4 bg-[var(--teal-050)] border border-[var(--border)] rounded-xl flex items-center gap-3 text-[var(--teal-900)] animate-pulse">
                <span className="material-symbols-outlined spin text-[var(--teal-600)]">autorenew</span>
                <span className="text-sm font-bold">Looking up Energy Performance Certificate (EPC)...</span>
              </div>
            )}
            
            {epcStatus === 'found' && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-xl flex items-start gap-4 animate-in fade-in duration-500">
                <span className="material-symbols-outlined text-green-700 bg-green-100 p-1.5 rounded-full text-lg">check</span>
                <div>
                  <h4 className="text-green-800 font-bold uppercase tracking-widest text-xs mb-1">EPC Found</h4>
                  <p className="text-sm text-green-900/80">EPC certificate found and added to your pack automatically.</p>
                  <p className="text-xs font-semibold mt-2 text-green-800">Rating: {formData.epc_rating} (Expires {formData.epc_expiry})</p>
                </div>
              </div>
            )}
            
            {epcStatus === 'multiple' && epcOptions.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl animate-in fade-in duration-500 space-y-3">
                <div className="flex gap-4">
                  <span className="material-symbols-outlined text-orange-700">dynamic_form</span>
                  <div>
                    <h4 className="text-orange-800 font-bold uppercase tracking-widest text-xs mb-1">Multiple EPCs Found</h4>
                    <p className="text-sm text-orange-900/90">Select the correct EPC for your property from the list below:</p>
                  </div>
                </div>
                <select 
                  className="w-full h-12 px-4 rounded-xl border border-orange-200 bg-white text-slate-900 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none"
                  onChange={(e) => {
                    const selectedData = epcOptions.find((o, idx) => idx.toString() === e.target.value);
                    if (selectedData) {
                      applyEpcDetails(selectedData);
                      setEpcStatus('found');
                    }
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>-- Select EPC --</option>
                  {epcOptions.map((opt, idx) => (
                    <option key={idx} value={idx}>{opt.address} (Rating {opt['current-energy-rating']})</option>
                  ))}
                </select>
              </div>
            )}

            {epcStatus === 'not_found' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4 animate-in fade-in duration-500">
                <span className="material-symbols-outlined text-amber-700 mt-1">info</span>
                <div>
                  <h4 className="text-amber-800 font-bold uppercase tracking-widest text-xs mb-1">EPC Required</h4>
                  <p className="text-sm text-amber-900/85">No EPC found for this address. You may need to commission one before marketing your property. EPCs are now required at the point of marketing.</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* PART A */}
        <Card className="p-8 border-l-4 border-l-primary/50">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">PART A</span>
            <h2 className="text-xl font-bold">Essential Information</h2>
            <Tooltip content="Part A is mandatory information that must be disclosed at the start of marketing.">
              <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
            </Tooltip>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                Asking Price
                <Tooltip content="The price at which the property is being marketed.">
                  <span className="material-symbols-outlined text-slate-400 text-xs">help</span>
                </Tooltip>
              </label>
              <input name="asking_price" value={formData.asking_price} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-primary/20 outline-none transition-all" placeholder="£" />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                Tenure
                <Tooltip content="Freehold means you own the land. Leasehold means you own the building for a set period but not the land.">
                  <span className="material-symbols-outlined text-slate-400 text-xs">help</span>
                </Tooltip>
              </label>
              <select name="tenure" value={formData.tenure} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Freehold">Freehold</option>
                <option value="Leasehold">Leasehold</option>
                <option value="Commonhold">Commonhold</option>
                <option value="Share of Freehold">Share of Freehold</option>
              </select>
            </div>
          </div>
        </Card>

        {/* PART B */}
        <Card className="p-8 border-l-4 border-l-primary/30">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">PART B</span>
            <h2 className="text-xl font-bold">Physical Characteristics</h2>
            <Tooltip content="Part B describes the physical makeup of the property and its utilities.">
              <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
            </Tooltip>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Heating System</label>
              <select name="heating" value={formData.heating} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Gas Central Heating">Gas Central Heating</option>
                <option value="Electric Heating">Electric Heating</option>
                <option value="Oil Heating">Oil Heating</option>
                <option value="Heat Pump">Heat Pump</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-semibold">Drainage</label>
              <select name="drainage" value={formData.drainage} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Mains Sewerage">Mains Sewerage</option>
                <option value="Septic Tank">Septic Tank</option>
                <option value="Cesspit">Cesspit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Electricity Supply</label>
              <select name="electricity_supply" value={formData.electricity_supply} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Mains">Mains</option>
                <option value="Off-grid / Generator">Off-grid / Generator</option>
                <option value="Solar with Battery">Solar with Battery</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Broadband</label>
              <select name="broadband_speed" value={formData.broadband_speed} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Standard">Standard (Up to 24Mbps)</option>
                <option value="Superfast">Superfast (Up to 80Mbps)</option>
                <option value="Ultrafast">Ultrafast (100Mbps+)</option>
              </select>
            </div>
          </div>
        </Card>

        {/* PART C */}
        <Card className="p-8 border-l-4 border-l-primary/10">
          <div className="flex items-center gap-2 mb-6">
            <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded">PART C</span>
            <h2 className="text-xl font-bold">Additional Specific Information</h2>
            <Tooltip content="Part C covers information that might affect certain properties, such as flood risk or restrictions.">
              <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
            </Tooltip>
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">
                Flood Risk
                <Tooltip content="Does the property have a history of flooding or is it in a high-risk zone?">
                  <span className="material-symbols-outlined text-slate-400 text-xs">help</span>
                </Tooltip>
              </label>
              <select name="flood_risk" value={formData.flood_risk} onChange={handleChange} className="w-full h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 outline-none">
                <option value="Very Low">Very Low</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Rights and Easements</label>
              <textarea name="rights_easements" value={formData.rights_easements} onChange={handleChange} className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 min-h-[100px] outline-none" placeholder="Are there any public rights of way across the land?" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Planning Permissions</label>
              <textarea name="planning_permissions" value={formData.planning_permissions} onChange={handleChange} className="w-full p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-zinc-950 min-h-[100px] outline-none" placeholder="Detail any relevant planning permissions or restrictions..." />
            </div>
          </div>
        </Card>

        <div className="flex flex-col md:flex-row gap-4 pt-6">
          <Button variant="outline" className="flex-1" onClick={() => handleSave(false)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? 'Saving...' : 'Save and Continue to Documents'}
          </Button>
        </div>
      </div>
    </div>
  );
}
