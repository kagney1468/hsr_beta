import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Footer from '../components/Footer';

export default function FindPack() {
  const navigate = useNavigate();
  const [reference, setReference] = useState('');
  const [postcode, setPostcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFind = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanRef = reference.trim().toUpperCase();
    const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, ' ');

    if (!cleanRef || !cleanPostcode) {
      setError('Please enter both a pack reference and a postcode.');
      return;
    }

    setLoading(true);
    try {
      // Look up the property by reference and postcode (case-insensitive)
      const { data: property, error: propErr } = await supabase
        .from('properties')
        .select('id, address_postcode, pack_reference')
        .ilike('pack_reference', cleanRef)
        .ilike('address_postcode', cleanPostcode)
        .maybeSingle();

      if (propErr) throw propErr;

      if (!property) {
        setError("We couldn't find a pack with those details. Please check the reference and postcode and try again.");
        return;
      }

      // Find the active share token for this property
      const { data: share, error: shareErr } = await supabase
        .from('shares')
        .select('token')
        .eq('property_id', property.id)
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (shareErr) throw shareErr;

      if (!share?.token) {
        setError('This property pack is not currently available. Please contact the seller or their agent.');
        return;
      }

      // Redirect to the pack page as if they had clicked the link directly
      navigate(`/pack/${share.token}`);

    } catch (err) {
      console.error('FindPack error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">

        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative z-10">

          {/* Brand */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="material-symbols-outlined text-4xl text-[var(--teal-600)]">home_filled</span>
              <span className="font-heading font-black text-2xl tracking-tight text-[var(--teal-900)]">
                HomeSalesReady
              </span>
            </div>
            <h1 className="text-4xl font-black font-heading tracking-tighter text-[var(--teal-900)]">
              Find a property pack
            </h1>
            <p className="text-[var(--muted)] text-base leading-relaxed">
              Enter the pack reference and postcode you've been given to access the property information pack.
            </p>
          </div>

          {/* Form */}
          <Card className="p-6 sm:p-8 space-y-6">

            {error && (
              <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            <form onSubmit={handleFind} className="space-y-5">

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Pack reference
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full font-heading font-bold text-lg tracking-wider uppercase"
                  placeholder="e.g. HSR-BH-0001"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <p className="text-[11px] text-[var(--muted)]">
                  You'll find this on the seller's marketing materials or from their estate agent.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Property postcode
                </label>
                <input
                  type="text"
                  value={postcode}
                  onChange={e => setPostcode(e.target.value)}
                  className="w-full font-heading font-bold text-lg tracking-wider uppercase"
                  placeholder="e.g. BH14 9PS"
                  autoComplete="postal-code"
                  autoCapitalize="characters"
                  spellCheck={false}
                />
                <p className="text-[11px] text-[var(--muted)]">
                  This is used to confirm the reference matches the correct property.
                </p>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-2"
                disabled={loading}
              >
                {loading ? 'Searching…' : 'Find pack'}
              </Button>

            </form>

          </Card>

          {/* Divider + login link */}
          <div className="text-center space-y-3 pt-2">
            <p className="text-[var(--muted)] text-sm">
              Have a direct link?{' '}
              <span className="text-[var(--muted)]">Paste it into your browser to go straight to the pack.</span>
            </p>
            <p className="text-[var(--muted)] text-sm">
              Already have an account?{' '}
              <a href="/login" className="text-[var(--teal-600)] font-semibold hover:underline">
                Log in
              </a>
            </p>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
