import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { AddressLookup } from '../components/AddressLookup';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';

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

  const [form, setForm] = useState({
    address_line1: '',
    address_line2: '',
    address_town: '',
    address_county: '',
    address_postcode: '',
    property_type: '',
    tenure: '',
    bedrooms: '',
    bathrooms: '',
  });

  const [addressConfirmed, setAddressConfirmed] = useState(false);

  const handleAddressSelect = (addr: {
    line1: string;
    line2: string;
    town: string;
    county: string;
    postcode: string;
  }) => {
    setForm(prev => ({
      ...prev,
      address_line1: addr.line1,
      address_line2: addr.line2,
      address_town: addr.town,
      address_county: addr.county,
      address_postcode: addr.postcode,
    }));
    setAddressConfirmed(true);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const isValid =
    form.address_line1.trim() &&
    form.address_postcode.trim() &&
    form.property_type &&
    form.tenure &&
    form.bedrooms;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !isValid) return;

    setSaving(true);
    setError(null);

    try {
      const publicUserId = await getPublicUserIdByAuthUserId(user.id);

      // Check no property already exists for this seller
      const { data: existing } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_user_id', publicUserId)
        .maybeSingle();

      if (existing) {
        // Already has a property — go straight to dashboard
        navigate('/seller/dashboard');
        return;
      }

      const { error: insertError } = await supabase.from('properties').insert({
        seller_user_id: publicUserId,
        address_line1: form.address_line1.trim(),
        address_line2: form.address_line2.trim() || null,
        address_town: form.address_town.trim() || null,
        address_county: form.address_county.trim() || null,
        address_city: form.address_town.trim() || null,
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
            <p className="text-[var(--muted)] leading-relaxed">
              Tell us about the property <strong>you are selling</strong> — not where you currently live.
            </p>
          </div>

          {/* Important callout */}
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)]">
            <span className="material-symbols-outlined text-[var(--teal-600)] shrink-0 mt-0.5">info</span>
            <p className="text-sm text-[var(--teal-900)] leading-relaxed">
              <strong>This is the property for sale.</strong> If you are currently living somewhere else, enter the address of the home you are selling here.
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
            <Card className="p-6 md:p-8 space-y-6">
              <h2 className="font-black font-heading text-[var(--teal-900)] text-xl">Property address</h2>

              <AddressLookup
                postcode={form.address_postcode}
                onPostcodeChange={(val) => setForm(prev => ({ ...prev, address_postcode: val }))}
                onAddressSelect={handleAddressSelect}
              />

              {addressConfirmed && (
                <div className="space-y-4 pt-2 border-t border-[var(--border)] animate-in fade-in duration-300">
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Confirm or edit the address below</p>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address line 1 *</label>
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
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Address line 2</label>
                    <input
                      name="address_line2"
                      value={form.address_line2}
                      onChange={handleChange}
                      className="w-full"
                      placeholder="Flat, apartment, building name (optional)"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Town / City</label>
                      <input name="address_town" value={form.address_town} onChange={handleChange} className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">County</label>
                      <input name="address_county" value={form.address_county} onChange={handleChange} className="w-full" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Postcode *</label>
                    <input
                      name="address_postcode"
                      required
                      value={form.address_postcode}
                      onChange={handleChange}
                      className="w-full uppercase tracking-widest font-semibold"
                    />
                  </div>
                </div>
              )}

              {/* Manual entry fallback */}
              {!addressConfirmed && (
                <button
                  type="button"
                  onClick={() => setAddressConfirmed(true)}
                  className="text-xs text-[var(--teal-600)] font-semibold hover:underline"
                >
                  Enter address manually instead
                </button>
              )}
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
    </div>
  );
}
