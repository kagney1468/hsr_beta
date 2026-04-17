import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { getPublicUserIdByAuthUserId } from '../lib/publicUser';
import { Card } from '../components/ui/Card';

export default function AgentProfile() {
  const { user } = useAuth();
  const [agency, setAgency] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const publicUserId = await getPublicUserIdByAuthUserId(user.id);
        const { data } = await supabase
          .from('agencies')
          .select('*')
          .eq('agent_user_id', publicUserId)
          .maybeSingle();
        setAgency(data || null);
      } catch (err) {
        console.error('Error loading agency profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const fields = [
    { label: 'Agency Name',               value: agency?.agency_name },
    { label: 'Trading Address',            value: agency?.trading_address },
    { label: 'Phone',                      value: agency?.phone },
    { label: 'Company Registration No.',   value: agency?.company_registration_number },
    { label: 'VAT Number',                 value: agency?.vat_number },
    { label: 'NAEA Membership No.',        value: agency?.naea_number },
    { label: 'Authorised Signatory',       value: agency?.authorised_signatory_name },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black text-[var(--teal-900)] tracking-tight">My Profile</h1>
        <p className="text-slate-500 mt-2">Your agency registration and contact details.</p>
      </div>

      <Card className="p-8 space-y-6">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 border-b border-[var(--border)] pb-5 last:border-0 last:pb-0">
            <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest sm:w-52 shrink-0">{label}</p>
            <p className="font-semibold text-[var(--teal-900)] text-sm">{value || <span className="text-[var(--muted)] font-normal italic">Not provided</span>}</p>
          </div>
        ))}
      </Card>

      {!agency && (
        <div className="mt-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
          <span className="material-symbols-outlined shrink-0 text-amber-600">info</span>
          <p className="text-sm font-semibold">No agency profile found. Please complete onboarding to set up your agency details.</p>
        </div>
      )}
    </div>
  );
}
