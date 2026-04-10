import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

export default function SellerProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [sellingAddressSame, setSellingAddressSame] = useState(true);

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

  const [sellingAddress, setSellingAddress] = useState({
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
    address_city: '',
    address_postcode: '',
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

  const handleSellingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSellingAddress(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    const missing: string[] = [];
    if (!formData.full_name.trim())             missing.push('Full Name');
    if (!formData.phone.trim())                 missing.push('Phone Number');
    if (!formData.home_address_line1.trim())    missing.push('Address Line 1');
    if (!formData.home_address_town.trim())     missing.push('Town');
    if (!formData.home_address_postcode.trim()) missing.push('Postcode');

    if (!sellingAddressSame) {
      if (!sellingAddress.address_line1.trim())    missing.push('Selling Property — Address Line 1');
      if (!sellingAddress.address_town.trim())     missing.push('Selling Property — Town');
      if (!sellingAddress.address_postcode.trim()) missing.push('Selling Property — Postcode');
    }

    if (missing.length > 0) {
      setMessage({ type: 'error', text: `Please complete the following required fields: ${missing.join(', ')}.` });
      return;
    }

    const homePostcode = formData.home_address_postcode.trim().toUpperCase();
    if (!UK_POSTCODE_REGEX.test(homePostcode)) {
      setMessage({ type: 'error', text: 'Please enter a valid UK postcode for your home address, e.g. SW1A 1AA' });
      return;
    }

    if (!sellingAddressSame) {
      const sellingPostcode = sellingAddress.address_postcode.trim().toUpperCase();
      if (!UK_POSTCODE_REGEX.test(sellingPostcode)) {
        setMessage({ type: 'error', text: 'Please enter a valid UK postcode for the selling property address, e.g. SW1A 1AA' });
        return;
      }
    }

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
        home_address_postcode: homePostcode,
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

      const resolvedSellingAddress = sellingAddressSame
        ? {
            address_line1:    formData.home_address_line1,
            address_line2:    formData.home_address_line2,
            address_town:     formData.home_address_town,
            address_county:   formData.home_address_county,
            address_city:     formData.home_address_city,
            address_postcode: homePostcode,
          }
        : {
            ...sellingAddress,
            address_postcode: sellingAddress.address_postcode.trim().toUpperCase(),
          };

      setTimeout(() => {
        setMessage(null);
        navigate('/seller/property', { state: { prefillAddress: resolvedSellingAddress } });
      }, 1500);
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin size-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-10 py-6 md:py-10">
      <div className="flex flex-col gap-2 px-4 md:px-0">
        <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Seller Profile</h1>
        <p className="text-[var(--muted)]">Complete your personal details to begin your property sale.</p>
      </div>

      {message && (
        <div className={`mx-4 md:mx-0 p-4 rounded-2xl border font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success'
            ? 'bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]'
            : 'bg-[#fee2e2] border-[#fecaca] text-[#b91c1c]'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 md:px-0">
        {/* Personal Information */}
        <Card className="p-8 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-heading text-[var(--teal-900)]">Personal Information</h3>
            <p className="text-xs text-[var(--muted)]">Your core contact details.</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Full Name <span className="text-[#dc2626]">*</span></label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full" placeholder="John Doe" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Email Address (Read-only)</label>
              <input type="email" value={user?.email || ''} readOnly className="w-full" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Phone Number <span className="text-[#dc2626]">*</span></label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full" placeholder="07123 456789" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">How should we contact you?</label>
              <select name="contact_preference" value={formData.contact_preference} onChange={handleChange} className="w-full">
                <option value="email">Email</option>
                <option value="phone">Phone Call</option>
                <option value="sms">SMS Text</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Home Address */}
        <Card className="p-8 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-bold font-heading text-[var(--teal-900)]">Home Address</h3>
            <p className="text-xs text-[var(--muted)]">Where you currently reside.</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 1 <span className="text-[#dc2626]">*</span></label>
              <input type="text" name="home_address_line1" value={formData.home_address_line1} onChange={handleChange} className="w-full" placeholder="123 Example Street" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 2 (Optional)</label>
              <input type="text" name="home_address_line2" value={formData.home_address_line2} onChange={handleChange} className="w-full" placeholder="Apt 4B" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Town <span className="text-[#dc2626]">*</span></label>
                <input type="text" name="home_address_town" value={formData.home_address_town} onChange={handleChange} className="w-full" placeholder="London" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">County (Optional)</label>
                <input type="text" name="home_address_county" value={formData.home_address_county} onChange={handleChange} className="w-full" placeholder="Greater London" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">City (Optional)</label>
              <input type="text" name="home_address_city" value={formData.home_address_city} onChange={handleChange} className="w-full" placeholder="e.g. London" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Postcode <span className="text-[#dc2626]">*</span></label>
              <input type="text" name="home_address_postcode" value={formData.home_address_postcode} onChange={handleChange} className="w-full uppercase tracking-widest font-semibold" placeholder="SW1A 1AA" />
            </div>

            {/* Selling address toggle */}
            <div className="pt-4 border-t border-[var(--border)] space-y-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSellingAddressSame(prev => !prev)}
                  className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${sellingAddressSame ? 'bg-[var(--teal-600)]' : 'bg-[#d1d5db]'}`}
                  aria-pressed={sellingAddressSame}
                >
                  <span className={`inline-block w-4 h-4 mt-1 rounded-full bg-white shadow transition-transform duration-200 ${sellingAddressSame ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm font-semibold text-[var(--teal-900)]">The property I am selling is at this address</span>
              </div>
              <p className="text-[10px] text-[var(--muted)]">
                {sellingAddressSame
                  ? 'Toggle off if the property you are selling is at a different address.'
                  : 'Toggle on if the property you are selling is at the same address as above.'}
              </p>
            </div>

            {/* Security note */}
            <div className="pt-2">
              <div className="p-6 bg-[var(--teal-050)] border border-[var(--border)] rounded-2xl flex items-center gap-4">
                <div className="size-10 bg-white rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)]">
                  <span className="material-symbols-outlined text-lg">verified_user</span>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[var(--teal-600)]">Security Note</p>
                  <p className="text-[10px] text-[var(--muted)] leading-tight">Your data is encrypted and only shared with your appointed estate agent when you choose to go live.</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Selling address card — shown when toggle is off */}
      {!sellingAddressSame && (
        <div className="px-4 md:px-0">
          <Card className="p-8 space-y-6 border-2 border-[var(--teal-600)]">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-[var(--teal-050)] rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--teal-600)]">
                <span className="material-symbols-outlined text-lg">sell</span>
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xl font-bold font-heading text-[var(--teal-900)]">Property Being Sold</h3>
                <p className="text-xs text-[var(--muted)]">Enter the address of the property you are selling. All intelligence searches will be run against this address.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 1 <span className="text-[#dc2626]">*</span></label>
                <input type="text" name="address_line1" value={sellingAddress.address_line1} onChange={handleSellingChange} className="w-full" placeholder="123 Example Street" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 2 (Optional)</label>
                <input type="text" name="address_line2" value={sellingAddress.address_line2} onChange={handleSellingChange} className="w-full" placeholder="Apt 4B" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Town <span className="text-[#dc2626]">*</span></label>
                  <input type="text" name="address_town" value={sellingAddress.address_town} onChange={handleSellingChange} className="w-full" placeholder="London" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">County (Optional)</label>
                  <input type="text" name="address_county" value={sellingAddress.address_county} onChange={handleSellingChange} className="w-full" placeholder="Greater London" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Postcode <span className="text-[#dc2626]">*</span></label>
                <input type="text" name="address_postcode" value={sellingAddress.address_postcode} onChange={handleSellingChange} className="w-full uppercase tracking-widest font-semibold" placeholder="SW1A 1AA" />
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <span className="material-symbols-outlined text-amber-600 shrink-0 mt-0.5">info</span>
                <p className="text-sm text-amber-900 leading-relaxed">
                  All property intelligence will be based on the selling address above — not your home address.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      <div className="flex justify-end pt-4 px-4 md:px-0 pb-12">
        <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full md:w-auto px-12 h-14 rounded-2xl font-black font-heading text-lg active:scale-95 transition-all">
          {saving ? 'Saving...' : 'Save & Continue'}
        </Button>
      </div>
    </div>
  );
}
