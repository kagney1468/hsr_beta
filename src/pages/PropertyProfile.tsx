import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function PropertyProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
    property_type: 'Detached House',
    bedrooms: 3,
    bathrooms: 2,
    tenure: 'Freehold',
    heating: 'Gas Central Heating',
    drainage: 'Mains Sewerage',
    recent_works: '',
    parking: '',
    building_changes: '',
    council_tax_band: 'A',
    solar_pv: 'No',
    ev_charging: 'No',
    lease_length_remaining: '',
  });

  useEffect(() => {
    async function loadProperty() {
      if (!user) return;
      
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single();
          
        if (userError || !userData) {
          setMessage({ type: 'error', text: 'Seller profile must exist before saving property details.' });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('properties')
          .select('*')
          .eq('user_id', userData.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFormData({
            address_line1: data.address_line1 || '',
            address_line2: data.address_line2 || '',
            city: data.city || '',
            postcode: data.postcode || '',
            property_type: data.property_type || 'Detached House',
            bedrooms: data.bedrooms || 3,
            bathrooms: data.bathrooms || 2,
            tenure: data.tenure || 'Freehold',
            heating: data.heating || 'Gas Central Heating',
            drainage: data.drainage || 'Mains Sewerage',
            recent_works: data.recent_works || '',
            parking: data.parking || '',
            building_changes: data.building_changes || '',
            council_tax_band: data.council_tax_band || 'A',
            solar_pv: data.solar_pv || 'No',
            ev_charging: data.ev_charging || 'No',
            lease_length_remaining: data.lease_length_remaining || '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'number' ? parseInt(value) || 0 : value 
    }));
  };

  const handleNumberChange = (name: string, increment: number) => {
    setFormData(prev => {
      const currentValue = prev[name as keyof typeof prev] as number;
      const newValue = Math.max(0, currentValue + increment);
      return { ...prev, [name]: newValue };
    });
  };

  const handleSave = async (redirect: boolean = false) => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    if (redirect && formData.tenure === 'Leasehold' && !formData.lease_length_remaining) {
      setMessage({ type: 'error', text: 'Please provide the remaining lease length to continue.' });
      setSaving(false);
      return;
    }
    
    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();
        
      if (userError || !userData) {
        throw new Error('Seller profile must exist before saving property details.');
      }

      // Check if property exists
      const { data: existingProp } = await supabase
        .from('properties')
        .select('id')
        .eq('user_id', userData.id)
        .single();

      let error;
      
      if (existingProp) {
        const { error: updateError } = await supabase
          .from('properties')
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProp.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('properties')
          .insert({
            user_id: userData.id,
            ...formData,
            updated_at: new Date().toISOString(),
          });
        error = insertError;
      }

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Property details saved successfully!' });
      
      if (redirect) {
        navigate('/seller/documents');
      }
    } catch (error: any) {
      console.error('Error saving property:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save property details.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="max-w-5xl w-full mx-auto p-10 pt-6 animate-pulse">Loading property details...</div>;
  }

  return (
    <div className="max-w-5xl w-full mx-auto p-10 pt-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Property Details</h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Update your property information to reach "Home Sales Ready" status.</p>
      </div>
      
      {message && (
        <div className={`p-4 mb-6 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <form className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSave(true); }}>
        {/* Section 1: Location */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Location &amp; Identification</h3>
            <p className="text-xs text-slate-500">The exact physical location details of the property.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Address Line 1</label>
              <input 
                name="address_line1"
                value={formData.address_line1}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="e.g. 42 Willow Lane" 
                type="text"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Address Line 2</label>
              <input 
                name="address_line2"
                value={formData.address_line2}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="e.g. Apt 4B" 
                type="text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">City</label>
              <input 
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="e.g. London" 
                type="text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Postcode</label>
              <input 
                name="postcode"
                value={formData.postcode}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="e.g. SW1A 1AA" 
                type="text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Property Type</label>
              <select 
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="Detached House">Detached House</option>
                <option value="Semi-Detached House">Semi-Detached House</option>
                <option value="Terraced House">Terraced House</option>
                <option value="Flat / Apartment">Flat / Apartment</option>
                <option value="Bungalow">Bungalow</option>
              </select>
            </div>
          </div>
        </div>
        {/* Section 2: Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Layout &amp; Features</h3>
            <p className="text-xs text-slate-500">Internal configuration and ownership status.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Bedrooms</label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button onClick={() => handleNumberChange('bedrooms', -1)} className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">remove</span></button>
                <input 
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="w-12 text-center border-x border-slate-200 dark:border-slate-700 py-2 text-sm bg-transparent outline-none font-medium" 
                  type="number" 
                />
                <button onClick={() => handleNumberChange('bedrooms', 1)} className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">add</span></button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Bathrooms</label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded overflow-hidden">
                <button onClick={() => handleNumberChange('bathrooms', -1)} className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">remove</span></button>
                <input 
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="w-12 text-center border-x border-slate-200 dark:border-slate-700 py-2 text-sm bg-transparent outline-none font-medium" 
                  type="number" 
                />
                <button onClick={() => handleNumberChange('bathrooms', 1)} className="flex-1 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400" type="button"><span className="material-symbols-outlined text-sm">add</span></button>
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Tenure</label>
              <select 
                name="tenure"
                value={formData.tenure}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="Freehold">Freehold</option>
                <option value="Leasehold">Leasehold</option>
                <option value="Commonhold">Commonhold</option>
                <option value="Share of Freehold">Share of Freehold</option>
              </select>
            </div>
            {formData.tenure === 'Leasehold' && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Lease Length Remaining (Years)</label>
                <input 
                  name="lease_length_remaining"
                  value={formData.lease_length_remaining}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                  placeholder="e.g. 99" 
                  type="number"
                />
              </div>
            )}
          </div>
        </div>
        {/* Section 3: Infrastructure */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Utilities &amp; Infrastructure</h3>
            <p className="text-xs text-slate-500">Essential services and systems connectivity.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Heating System</label>
              <select 
                name="heating"
                value={formData.heating}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="Gas Central Heating">Gas Central Heating</option>
                <option value="Electric Heating">Electric Heating</option>
                <option value="Oil Heating">Oil Heating</option>
                <option value="Heat Pump (Air/Ground)">Heat Pump (Air/Ground)</option>
                <option value="Biomass">Biomass</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Drainage</label>
              <select 
                name="drainage"
                value={formData.drainage}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="Mains Sewerage">Mains Sewerage</option>
                <option value="Septic Tank">Septic Tank</option>
                <option value="Cesspit">Cesspit</option>
                <option value="Private Treatment Plant">Private Treatment Plant</option>
              </select>
            </div>
          </div>
        </div>
        {/* Section 4: Maintenance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8 border-b border-slate-200 dark:border-slate-800">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Recent Works</h3>
            <p className="text-xs text-slate-500">Renovations and works from the last 5 years.</p>
          </div>
          <div className="lg:col-span-2 space-y-4">
            <textarea 
              name="recent_works"
              value={formData.recent_works}
              onChange={handleChange}
              className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none" 
              placeholder="e.g. New boiler installed 2022, Kitchen renovation 2021..." 
              rows={4}
            ></textarea>
          </div>
        </div>
        {/* Section 5: Additional Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 py-8">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">Additional Details</h3>
            <p className="text-xs text-slate-500">Other important property information.</p>
          </div>
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Building Changes / Extensions</label>
              <textarea 
                name="building_changes"
                value={formData.building_changes}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all resize-none" 
                placeholder="e.g. Rear extension added in 2018..." 
                rows={3}
              ></textarea>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Parking</label>
              <input 
                name="parking"
                value={formData.parking}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" 
                placeholder="e.g. Driveway for 2 cars" 
                type="text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Council Tax Band</label>
              <select 
                name="council_tax_band"
                value={formData.council_tax_band}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="A">Band A</option>
                <option value="B">Band B</option>
                <option value="C">Band C</option>
                <option value="D">Band D</option>
                <option value="E">Band E</option>
                <option value="F">Band F</option>
                <option value="G">Band G</option>
                <option value="H">Band H</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Solar PV</label>
              <select 
                name="solar_pv"
                value={formData.solar_pv}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">EV Charging</label>
              <select 
                name="ev_charging"
                value={formData.ev_charging}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </select>
            </div>
          </div>
        </div>
        {/* Action Bar */}
        <div className="flex items-center justify-between pt-8 border-t border-slate-200 dark:border-slate-800 mt-4">
          <button className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 transition-colors uppercase" type="button" onClick={() => window.location.reload()}>
            <span className="material-symbols-outlined text-sm">delete</span>
            Discard Changes
          </button>
          <div className="flex items-center gap-4">
            <button 
              className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded transition-colors uppercase disabled:opacity-50" 
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button 
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-primary text-white text-xs font-bold rounded shadow-md shadow-primary/10 hover:bg-primary/90 transition-all transform active:scale-95 uppercase tracking-wide inline-block text-center disabled:opacity-50"
            >
              Complete Property Profile
            </button>
          </div>
        </div>
      </form>
      {/* Footer/Support */}
      <div className="mt-12 text-center pb-12">
        <p className="text-slate-400 text-sm">Need help with these details? <a className="text-primary font-bold underline" href="mailto:hello@homesalesready.co.uk?subject=Home%20Sales%20Ready%20Support">Contact our support team</a></p>
      </div>
    </div>
  );
}
