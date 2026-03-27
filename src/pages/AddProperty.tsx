import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import Footer from '../components/Footer';

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

const PROPERTY_TYPES = [
  'Detached House',
  'Semi-Detached House',
  'Terraced House',
  'End of Terrace',
  'Flat / Apartment',
  'Bungalow',
  'Cottage',
  'Maisonette',
  'Studio',
  'Other',
];

const TENURES = [
  'Freehold',
  'Leasehold',
  'Commonhold',
  'Share of Freehold',
];

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);

  const [form, setForm] = useState({
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
    address_city: '',
    address_postcode: '',
    property_type: '',
    tenure: '',
    bedrooms: '',
    bathrooms: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'address_postcode') setPostcodeError(null);
  };

  const validatePostcode = (postcode: string): boolean => {
    if (!UK_POSTCODE_REGEX.test(postcode.trim())) {
      setPostcodeError('Please enter a valid UK postcode e.g. SW1A 1AA');
      return false;
    }
    setPostcodeError(null);
    return true;
  };

  const isValid =
    form.address_line1.trim() &&
    form.address_town.trim() &&
    form.address_postcode.trim() &&
    form.property_type &&
    form.tenure &&
    form.bedrooms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;
    if (!validatePostcode(form.address_postcode)) return;

    setSaving(true);
    setError(null);

    try {
      const publicUserId = await getPublicUserIdByAuthUserId(user.id);

      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_user_id', publicUserId)
        .maybeSingle();

      if (existing) {
        navigate('/seller/dashboard');
        return;
      }

      const { error: insertError } = await supabase.from('properties').insert({
        seller_user_id: publicUserId,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        address_town: form.address_town.trim() || null,
        address_county: form.address_county.trim() || null,
        address_city: form.address_city.trim() || null,
        address_postcode: form.address_postcode.trim().toUpperCase(),
        property_type: form.property_type,
        tenure: form.tenure,
        bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
        bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
        pack_completion_percentage: 0,
        is_link_active: false,
      });

      if (insertError) throw insertError;

      navigate('/seller/dashboard');
    } catch (err: any) {
      console.error('Error creating property:', err);
      setError(err.message || 'Failed to add property. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] px-6 md:px-10 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-2xl text-[var(--teal-500)]">home_filled</span>
          <span className="font-heading font-black text-lg tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
        </div>
        <button
          onClick={() => navigate('/welcome')}
          className="text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors flex items-center gap-1.5 text-sm font-semibold"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-start px-6 py-12">
        <div className="w-full max-w-2xl space-y-8">

          {/* Hero */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--teal-500)]">Step 1 of 5</p>
            <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Add your property</h1>
            <p className="text-[var(--muted)] leading-relaxed">Enter the address of the property you are selling.</p>
          </div>

          {/* Amber note */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
            <span className="material-symbols-outlined text-amber-600 shrink-0 mt-0.5">info</span>
            <p className="text-sm text-amber-900 leading-relaxed">
              <strong>This is the property you are selling</strong> — it may be different from where you currently live.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && (
              <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold flex items-center gap-2">
                <span className="material-symbols-outlined text-base">error</span>
                {error}
              </div>
            )}

            {/* Address */}
            <Card className="p-6 md:p-8 space-y-5">
              <h2 className="font-black font-heading text-[var(--teal-900)] text-xl">Property address</h2>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 1 *</label>
                <input
                  name="address_line1"
                  required
                  value={form.address_line1}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="e.g. 12 Maple Gardens"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address Line 2 (Optional)</label>
                <input
                  name="address_line2"
                  value={form.address_line2}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="Flat, apartment, building name"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Town *</label>
                  <input
                    name="address_town"
                    required
                    value={form.address_town}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g. Bristol"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">County (Optional)</label>
                  <input
                    name="address_county"
                    value={form.address_county}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g. Somerset"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">City (Optional)</label>
                <input
                  name="address_city"
                  value={form.address_city}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="e.g. Bristol"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Postcode *</label>
                <input
                  name="address_postcode"
                  required
                  value={form.address_postcode}
                  onChange={handleChange}
                  onBlur={() => form.address_postcode && validatePostcode(form.address_postcode)}
                  className={`w-full uppercase tracking-widest font-semibold ${postcodeError ? 'border-red-400 focus:border-red-500' : ''}`}
                  placeholder="e.g. SW1A 1AA"
                />
                {postcodeError && (
                  <p className="text-red-500 text-xs font-semibold">{postcodeError}</p>
                )}
              </div>
            </Card>

            {/* Property details */}
            <Card className="p-6 md:p-8 space-y-6">
              <h2 className="font-black font-heading text-[var(--teal-900)] text-xl">Property details</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Property type *</label>
                  <select name="property_type" required value={form.property_type} onChange={handleChange} className="w-full">
                    <option value="" disabled>Select type…</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Tenure *</label>
                  <select name="tenure" required value={form.tenure} onChange={handleChange} className="w-full">
                    <option value="" disabled>Select tenure…</option>
                    {TENURES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <p className="text-[10px] text-[var(--muted)]">Freehold = you own the land. Leasehold = you own the building for a fixed term.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Bedrooms *</label>
                  <select name="bedrooms" required value={form.bedrooms} onChange={handleChange} className="w-full">
                    <option value="" disabled>Select…</option>
                    {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n} bedroom{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Bathrooms</label>
                  <select name="bathrooms" value={form.bathrooms} onChange={handleChange} className="w-full">
                    <option value="">Select…</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} bathroom{n !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>
            </Card>

            <Button
              type="submit"
              variant="primary"
              disabled={saving || !isValid}
              className="w-full h-14 rounded-2xl font-heading font-bold text-lg"
            >
              {saving ? 'Adding property…' : 'Add property and continue'}
              {!saving && <span className="material-symbols-outlined ml-2">arrow_forward</span>}
            </Button>
          </form>
        </div>
      </main>
      <Footer />
    </div>
  );
}
