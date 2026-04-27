import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;
import { supabase } from '../lib/supabase';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import { useAuth } from '../contexts/AuthContext';
import { Tooltip } from '../components/ui/Tooltip';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { updatePackCompletion } from '../lib/completion';
import PostcodeLookup, { AddressData } from '../components/PostcodeLookup';
import LeaseholdInfoCard from '../components/property/LeaseholdInfoCard';

export default function PropertyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [addressLocked, setAddressLocked] = useState(false);
  const [epcLoading, setEpcLoading] = useState(false);
  const [epcStatus, setEpcStatus] = useState<'initial' | 'found' | 'not_found' | 'multiple'>('initial');
  const [epcOptions, setEpcOptions] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
    address_city: '',
    postcode: '',
    property_type: 'Detached House',
    bedrooms: 3,
    bathrooms: 2,
    tenure: 'Freehold',
    council_tax_band: 'A',
    epc_rating: '',
    epc_expiry: '',
    construction_age_band: '',
    // Material Information
    water_supply: 'Mains',
    electricity_supply: 'Mains',
    broadband_speed: 'Superfast',
    mobile_signal: 'Good',
    parking: 'Driveway',
    restrictions: '',
    rights_easements: '',
    gas_supply: '',
    drainage: '',
    water_heating: '',
    flood_risk_surface_water: '',
    flood_risk_rivers_sea: '',
    flood_risk_groundwater: '',
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
        const publicUserId = await getPublicUserIdByAuthUserId(user.id);
        const { data, error } = await supabase
          .from('properties')
          .select('*, material_information(*)')
          .eq('seller_user_id', publicUserId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          const mi = Array.isArray(data.material_information) ? data.material_information[0] : data.material_information;
          setFormData({
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            address_town: data.address_town || '',
            address_county: data.address_county || '',
            address_city: data.address_city || '',
            postcode: data.address_postcode || '',
            property_type: data.property_type || 'Detached House',
            bedrooms: data.bedrooms || 3,
            bathrooms: data.bathrooms || 2,
            tenure: data.tenure || 'Freehold',
            council_tax_band: data.council_tax_band || 'A',
            epc_rating: mi?.epc_rating || '',
            epc_expiry: mi?.epc_expiry || '',
            construction_age_band: mi?.construction_age_band || '',
            water_supply: mi?.water_supply || 'Mains',
            electricity_supply: mi?.electricity_supply || 'Mains',
            broadband_speed: mi?.broadband_speed || 'Superfast',
            mobile_signal: mi?.mobile_signal || 'Good',
            parking: mi?.parking || 'Driveway',
            restrictions: mi?.restrictions || '',
            rights_easements: mi?.rights_easements || '',
            gas_supply: mi?.gas_supply || '',
            drainage: mi?.drainage || '',
            water_heating: mi?.water_heating || '',
            flood_risk_surface_water: mi?.flood_risk_surface_water || '',
            flood_risk_rivers_sea: mi?.flood_risk_rivers_sea || '',
            flood_risk_groundwater: mi?.flood_risk_groundwater || '',
            coastal_erosion: mi?.coastal_erosion || 'No',
            planning_permissions: mi?.planning_permissions || '',
            coalfield_area: mi?.coalfield_area || 'No',
            disputes: mi?.disputes || 'None',
            building_regs_required: mi?.building_regs_required || false,
          });
          if (data.address_line1) setAddressLocked(true);
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
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleSave = async (redirect: boolean = false) => {
    if (!user) return;

    const cleanPostcode = formData.postcode.trim().toUpperCase();
    if (!cleanPostcode) {
      setMessage({ type: 'error', text: 'Postcode is required.' });
      return;
    }
    if (!UK_POSTCODE_REGEX.test(cleanPostcode)) {
      setMessage({ type: 'error', text: 'Please enter a valid UK postcode, e.g. SW1A 1AA.' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const publicUserId = await getPublicUserIdByAuthUserId(user.id);

      const propertyPayload = {
        seller_user_id:  publicUserId,
        address_line1:   formData.address_line1,
        address_line2:   formData.address_line2 || null,
        address_town:    formData.address_town,
        address_county:  formData.address_county || null,
        address_city:    formData.address_city || null,
        address_postcode: cleanPostcode,
        property_type:   formData.property_type,
        bedrooms:        formData.bedrooms,
        bathrooms:       formData.bathrooms,
        tenure:          formData.tenure,
        council_tax_band: formData.council_tax_band,
        description:     null,
      };

      // 1. Update existing property or insert a new one for this seller
      const { data: existingProperty, error: existingPropertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_user_id', publicUserId)
        .limit(1)
        .maybeSingle();
      if (existingPropertyError) throw existingPropertyError;

      let property: { id: string } | null = null;
      if (existingProperty?.id) {
        const { data: updatedProperty, error: updateError } = await supabase
          .from('properties')
          .update(propertyPayload)
          .eq('id', existingProperty.id)
          .select('id')
          .single();
        if (updateError) throw updateError;
        property = updatedProperty;
      } else {
        const { data: insertedProperty, error: insertError } = await supabase
          .from('properties')
          .insert(propertyPayload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        property = insertedProperty;
      }

      // 2. Update/Insert Material Information
      const { error: miError } = await supabase
        .from('material_information')
        .upsert({
          property_id: property.id,
          water_supply: formData.water_supply,
          electricity_supply: formData.electricity_supply,
          gas_supply: formData.gas_supply,
          drainage: formData.drainage,
          water_heating: formData.water_heating,
          broadband_speed: formData.broadband_speed,
          mobile_signal: formData.mobile_signal,
          parking: formData.parking,
          restrictions: formData.restrictions,
          rights_easements: formData.rights_easements,
          flood_risk_surface_water: formData.flood_risk_surface_water,
          flood_risk_rivers_sea: formData.flood_risk_rivers_sea,
          flood_risk_groundwater: formData.flood_risk_groundwater,
          coastal_erosion: formData.coastal_erosion,
          planning_permissions: formData.planning_permissions,
          coalfield_area: formData.coalfield_area,
          disputes: formData.disputes,
          building_regs_required: Boolean(formData.building_regs_required),
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
        <h1 className="text-3xl font-black text-[var(--teal-900)] tracking-tight">Material Information</h1>
        <p className="text-slate-500 mt-2">Required by National Trading Standards to ensure your listing is compliant.</p>
      </div>
      
      {message && (
        <div className={`p-4 mb-8 rounded-xl border ${message.type === 'success' ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-red-50/50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="space-y-12">
        <Card className="p-8 border-l-4 border-l-[var(--teal-500)]/50 space-y-6 text-[var(--text)]">
          <div>
            <h2 className="text-xl font-bold font-heading text-slate-900">Property Address</h2>
            <p className="text-xs text-[var(--muted)] mt-1">Enter the address of the property you are selling.</p>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <span className="material-symbols-outlined text-amber-600 shrink-0 mt-0.5 text-sm">info</span>
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>This is the property you are selling</strong> — it may be different from where you currently live.
            </p>
          </div>

          <div className="space-y-4">
            {/* Address — locked display for returning users, lookup for new entry */}
            {addressLocked ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[#6dd4d4]">
                  <p className="text-sm font-semibold text-[var(--teal-900)] leading-relaxed">
                    {[formData.address_line1, formData.address_line2, formData.address_town, formData.address_county]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {formData.postcode && (
                    <p className="text-sm font-semibold text-[var(--teal-900)] mt-0.5">
                      {formData.postcode.trim().toUpperCase()}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setAddressLocked(false)}
                  className="text-xs font-semibold text-[var(--teal-600)] hover:text-[var(--teal-900)] underline underline-offset-2 transition-colors"
                >
                  Change address
                </button>
              </div>
            ) : (
              <PostcodeLookup
                onAddressSelect={(data: AddressData) => {
                  setFormData(prev => ({
                    ...prev,
                    address_line1: data.address_line1,
                    address_line2: data.address_line2,
                    address_town:  data.address_town,
                    address_county: data.address_county,
                    address_city:  data.address_city,
                    postcode:      data.address_postcode,
                  }));
                  setAddressLocked(true);
                }}
              />
            )}

            {/* EPC auto-fetch — enabled once address is confirmed */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleEpcLookup(formData.postcode, formData.address_line1)}
                disabled={epcLoading || !formData.postcode || !formData.address_line1}
                className="shrink-0 px-4 py-2 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-900)] text-xs font-bold hover:bg-[var(--teal-100)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
              >
                {epcLoading ? 'Looking up…' : 'Auto-fetch EPC'}
              </button>
              <p className="text-xs text-[var(--muted)]">Automatically fill your EPC rating and expiry from the national register.</p>
            </div>

            {epcLoading && (
              <div className="p-4 bg-[var(--teal-050)] border border-[var(--border)] rounded-xl flex items-center gap-3 text-[var(--teal-900)] animate-pulse">
                <span className="material-symbols-outlined text-[var(--teal-600)]">autorenew</span>
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
                    <p className="text-sm text-orange-900/90">Select the correct EPC for your property:</p>
                  </div>
                </div>
                <select className="w-full"
                  onChange={(e) => {
                    const selectedData = epcOptions.find((o, idx) => idx.toString() === e.target.value);
                    if (selectedData) { applyEpcDetails(selectedData); setEpcStatus('found'); }
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
                  <p className="text-sm text-amber-900/85">No EPC found for this address. You may need to commission one before marketing your property.</p>
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
                Tenure
                <Tooltip content="Freehold means you own the land. Leasehold means you own the building for a set period but not the land.">
                  <span className="material-symbols-outlined text-slate-400 text-xs">help</span>
                </Tooltip>
              </label>
              <select name="tenure" value={formData.tenure} onChange={handleChange} className="w-full">
                <option value="Freehold">Freehold</option>
                <option value="Leasehold">Leasehold</option>
                <option value="Commonhold">Commonhold</option>
                <option value="Share of Freehold">Share of Freehold</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Council Tax Band</label>
              <select name="council_tax_band" value={formData.council_tax_band} onChange={handleChange} className="w-full">
                {['A','B','C','D','E','F','G','H'].map(b => <option key={b} value={b}>Band {b}</option>)}
              </select>
            </div>
          </div>

          {formData.tenure === 'Leasehold' && <LeaseholdInfoCard />}
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
              <label className="text-sm font-semibold">Electricity Supply</label>
              <select name="electricity_supply" value={formData.electricity_supply} onChange={handleChange} className="w-full">
                <option value="Mains">Mains</option>
                <option value="Off-grid / Generator">Off-grid / Generator</option>
                <option value="Solar with Battery">Solar with Battery</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Gas Supply</label>
              <select name="gas_supply" value={formData.gas_supply} onChange={handleChange} className="w-full">
                <option value="">Select...</option>
                <option value="Mains">Mains</option>
                <option value="LPG">LPG</option>
                <option value="Oil">Oil</option>
                <option value="None">None</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Drainage</label>
              <select name="drainage" value={formData.drainage} onChange={handleChange} className="w-full">
                <option value="">Select...</option>
                <option value="Mains">Mains</option>
                <option value="Septic Tank">Septic Tank</option>
                <option value="Cesspit">Cesspit</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Water Heating</label>
              <select name="water_heating" value={formData.water_heating} onChange={handleChange} className="w-full">
                <option value="">Select...</option>
                <option value="Combi Boiler">Combi Boiler</option>
                <option value="Water Tank">Water Tank</option>
                <option value="Megaflow">Megaflow</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Water Supply</label>
              <select name="water_supply" value={formData.water_supply} onChange={handleChange} className="w-full">
                <option value="Mains">Mains</option>
                <option value="Private Supply">Private Supply</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Broadband</label>
              <select name="broadband_speed" value={formData.broadband_speed} onChange={handleChange} className="w-full">
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
            <div className="space-y-3">
              <label className="text-sm font-semibold flex items-center gap-2">
                Flood Risk
                <Tooltip content="Check the government flood risk service and enter the risk level for each category below.">
                  <span className="material-symbols-outlined text-slate-400 text-xs">help</span>
                </Tooltip>
              </label>
              <a
                href="https://www.gov.uk/check-long-term-flood-risk"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-[var(--teal-900)] text-xs font-bold hover:bg-[var(--teal-100)] transition-colors"
              >
                <span className="material-symbols-outlined text-sm text-[var(--teal-600)]">open_in_new</span>
                Check Long-Term Flood Risk (gov.uk)
              </a>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--muted)]">Surface Water</label>
                  <input type="text" name="flood_risk_surface_water" value={formData.flood_risk_surface_water} onChange={handleChange} className="w-full" placeholder="e.g. Low / Medium / High" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--muted)]">Rivers &amp; Sea</label>
                  <input type="text" name="flood_risk_rivers_sea" value={formData.flood_risk_rivers_sea} onChange={handleChange} className="w-full" placeholder="e.g. Low / Medium / High" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--muted)]">Groundwater</label>
                  <input type="text" name="flood_risk_groundwater" value={formData.flood_risk_groundwater} onChange={handleChange} className="w-full" placeholder="e.g. Low / Medium / High" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Rights and Easements</label>
              <textarea name="rights_easements" value={formData.rights_easements} onChange={handleChange} className="w-full min-h-[100px]" placeholder="Are there any public rights of way across the land?" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Planning Permissions</label>
              <textarea name="planning_permissions" value={formData.planning_permissions} onChange={handleChange} className="w-full min-h-[100px]" placeholder="Detail any relevant planning permissions or restrictions..." />
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
