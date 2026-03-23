import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { AddressLookup } from '../components/AddressLookup';

export default function SellerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    contact_preference: 'email',
    home_address_line1: '',
    home_address_line2: '',
    home_address_town: '',
    home_address_county: '',
    home_address_city: '',
    home_address_postcode: '',
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            contact_preference: data.contact_preference || 'email',
            home_address_line1: data.home_address_line1 || '',
            home_address_line2: data.home_address_line2 || '',
            home_address_town: data.home_address_town || '',
            home_address_county: data.home_address_county || '', 
            home_address_city: data.home_address_city || '', 
            home_address_postcode: data.home_address_postcode || '',
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      const payload = {
        email: user.email,
        role: 'seller',
        ...formData,
        updated_at: new Date().toISOString(),
      };

      if (existingUser) {
          const { error } = await supabase
            .from('users')
            .update(payload)
            .eq('id', existingUser.id);
          if (error) throw error;
      } else {
          const { error } = await supabase
            .from('users')
            .insert({ auth_user_id: user.id, ...payload });
          if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Profile saved successfully!' });
      setTimeout(() => {
          setMessage(null);
          navigate('/seller/property');
      }, 1500);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 md:py-10">
      <div className="flex flex-col gap-2 px-4 md:px-0">
        <h1 className="text-4xl font-black font-heading text-white tracking-tight">Seller Profile</h1>
        <p className="text-zinc-400">Complete your personal details to begin your property sale.</p>
      </div>

      {message && (
        <div className={`mx-4 md:mx-0 p-4 rounded-2xl border font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success' 
            ? 'bg-green-900/20 border-green-800 text-green-400' 
            : 'bg-red-900/20 border-red-800 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-0">
        <Card className="p-8 border-white/5 bg-zinc-900 space-y-8 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-heading text-white">Personal Information</h3>
            <p className="text-xs text-zinc-500">Your core contact details.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address (Read-only)</label>
              <input 
                type="email" 
                value={user?.email || ''}
                readOnly
                className="w-full h-12 px-4 rounded-xl border border-white/5 bg-white/5 text-zinc-500 cursor-not-allowed"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="07123 456789"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">How should we contact you?</label>
              <div className="relative">
                <select 
                    name="contact_preference"
                    value={formData.contact_preference}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all appearance-none"
                >
                    <option value="email">Email</option>
                    <option value="phone">Phone Call</option>
                    <option value="sms">SMS Text</option>
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">unfold_more</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-8 border-white/5 bg-zinc-900 space-y-8 shadow-2xl">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-heading text-white">Home Address</h3>
            <p className="text-xs text-zinc-500">Where you currently reside.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-6">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Postcode Search</label>
              <AddressLookup 
                postcode={formData.home_address_postcode} 
                onPostcodeChange={(val) => setFormData({...formData, home_address_postcode: val})} 
                onAddressSelect={(addr) => {
                  setFormData(prev => ({
                    ...prev,
                    home_address_line1: addr.line1,
                    home_address_line2: addr.line2,
                    home_address_town: addr.town,
                    home_address_county: addr.county,
                    home_address_city: addr.town, // Fill city automatically from town for now
                    home_address_postcode: addr.postcode
                  }));
                }} 
              />
            </div>

            <div className="pt-4 space-y-4 border-t border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Address Line 1</label>
                <input 
                  type="text" 
                  name="home_address_line1"
                  value={formData.home_address_line1}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                  placeholder="123 Example Street"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Address Line 2 (Optional)</label>
                <input 
                  type="text" 
                  name="home_address_line2"
                  value={formData.home_address_line2}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                  placeholder="Apt 4B"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Town / City</label>
                  <input 
                    type="text" 
                    name="home_address_town"
                    value={formData.home_address_town}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                    placeholder="London"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">County</label>
                  <input 
                    type="text" 
                    name="home_address_county"
                    value={formData.home_address_county}
                    onChange={handleChange}
                    className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                    placeholder="Greater London"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">City</label>
                <input 
                  type="text" 
                  name="home_address_city"
                  value={formData.home_address_city}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                  placeholder="e.g. London"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Postcode</label>
                <input 
                  type="text" 
                  name="home_address_postcode"
                  value={formData.home_address_postcode}
                  onChange={handleChange}
                  className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                  placeholder="SW1A 1AA"
                />
              </div>
            </div>

            <div className="pt-4">
              <div className="p-6 bg-white/[0.03] border border-white/5 rounded-2xl flex items-center gap-4">
                <div className="size-10 bg-white/5 rounded-xl flex items-center justify-center text-zinc-500">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#00e5a0]">Security Note</p>
                  <p className="text-[10px] text-zinc-500 leading-tight">Your data is encrypted and only shared with your appointed estate agent when you choose to go live.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end pt-4 px-4 md:px-0 pb-12">
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={saving}
          className="w-full md:w-auto px-12 h-14 rounded-2xl text-black font-black font-heading text-lg shadow-xl shadow-[#00e5a0]/20 active:scale-95 transition-all"
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
