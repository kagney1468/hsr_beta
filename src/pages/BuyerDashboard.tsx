import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getGreeting } from '../lib/greeting';

export default function BuyerDashboard() {
  const { user } = useAuth();
  const [packs, setPacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [buyerFirstName, setBuyerFirstName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('users')
      .select('full_name')
      .eq('auth_user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.full_name) setBuyerFirstName(data.full_name.split(' ')[0]);
      });
  }, [user]);

  useEffect(() => {
    async function loadPacks() {
      if (!user) return;
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from('pack_viewers')
          .select('id, viewed_at, properties(address_line1, address_town, address_postcode, shareable_link_token)')
          .eq('auth_user_id', user.id)
          .order('viewed_at', { ascending: false });

        if (error) throw error;
        setPacks(data || []);
      } catch (err) {
        console.error('Error loading buyer packs:', err);
      } finally {
        setLoading(false);
      }
    }

    loadPacks();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 pb-6 border-b border-[var(--border)] bg-white">
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
          {getGreeting(buyerFirstName)}
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">Here are the property packs you've registered for.</p>
      </div>

      <main className="p-6 md:p-10">
        {packs.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <div className="size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl mx-auto">
              <span className="material-symbols-outlined text-3xl">search</span>
            </div>
            <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">No packs yet</h2>
            <p className="text-[var(--muted)] text-sm max-w-sm mx-auto">
              You haven't registered for any property packs yet. Visit a property pack link to get started.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {packs.map((pack: any) => {
              const prop = pack.properties;
              const address = [prop?.address_line1, prop?.address_town].filter(Boolean).join(', ');
              const postcode = prop?.address_postcode || '';
              const token = prop?.shareable_link_token;

              return (
                <Card key={pack.id} className="p-6 space-y-4">
                  <div className="space-y-1">
                    <h3 className="font-black font-heading text-[var(--teal-900)] text-lg leading-tight">{address || 'Unknown Property'}</h3>
                    {postcode && <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-widest">{postcode}</p>}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] font-medium">
                    Registered on {new Date(pack.viewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <div className="flex flex-col gap-2 pt-2">
                    {token && (
                      <Button
                        variant="primary"
                        className="w-full h-10 rounded-xl font-bold text-sm"
                        onClick={() => window.open(`/pack/${token}`, '_blank')}
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">folder_open</span>
                        View Pack
                      </Button>
                    )}
                    {postcode && (
                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-xl font-bold text-sm"
                        onClick={() => window.open(`https://home-notes-khaki.vercel.app/?address=${encodeURIComponent(postcode)}`, '_blank')}
                      >
                        <span className="material-symbols-outlined text-[16px] mr-1">map</span>
                        View Area Report
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
