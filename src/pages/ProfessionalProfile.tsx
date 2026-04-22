import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const PROFESSION_LABELS: Record<string, string> = {
  solicitor: 'Solicitor',
  surveyor: 'Surveyor',
  mortgage_broker: 'Mortgage Broker',
  lender: 'Lender',
  other: 'Other Professional',
};

const REG_LABELS: Record<string, string> = {
  SRA: 'SRA Number',
  RICS: 'RICS Membership Number',
  FCA: 'FCA Reference Number',
  Other: 'Professional Registration Number',
};

export default function ProfessionalProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [profile, setProfile] = useState({
    full_name: '',
    phone: '',
    contact_preference: 'email',
  });
  const [readOnly, setReadOnly] = useState({
    profession_type: '',
    regulatory_body: '',
    regulatory_number: '',
    firm_name: '',
    company_number: '',
    registered_office: '',
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('users')
          .select('full_name, phone, contact_preference, profession_type, regulatory_body, regulatory_number, firm_id, firms(firm_name, company_number, registered_office)')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            phone: data.phone || '',
            contact_preference: data.contact_preference || 'email',
          });
          const firm = (data as any).firms;
          setReadOnly({
            profession_type: data.profession_type || '',
            regulatory_body: data.regulatory_body || '',
            regulatory_number: data.regulatory_number || '',
            firm_name: firm?.firm_name || '',
            company_number: firm?.company_number || '',
            registered_office: firm?.registered_office || '',
          });
        }
      } catch (err) {
        console.error('Error loading professional profile:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    if (!profile.full_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          contact_preference: profile.contact_preference,
          email: user.email,
        })
        .eq('auth_user_id', user.id);

      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  const contactOptions = [
    { value: 'email', icon: 'mail',  label: 'Email' },
    { value: 'phone', icon: 'call',  label: 'Phone call' },
    { value: 'sms',   icon: 'sms',   label: 'SMS text' },
  ];

  const regLabel = REG_LABELS[readOnly.regulatory_body] || 'Registration number';

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      <div className="px-6 md:px-10 pt-10 pb-6 border-b border-[var(--border)] bg-white">
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">My Profile</h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Your contact details and professional registration information.
        </p>
      </div>

      <main className="p-6 md:p-10">
        <div className="max-w-2xl space-y-6">

          {message && (
            <div className={`p-4 rounded-2xl border font-semibold text-sm animate-in fade-in slide-in-from-top-2 duration-300 ${
              message.type === 'success'
                ? 'bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]'
                : 'bg-[#fee2e2] border-[#fecaca] text-[#b91c1c]'
            }`}>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">
                  {message.type === 'success' ? 'check_circle' : 'error'}
                </span>
                {message.text}
              </div>
            </div>
          )}

          {/* Personal details — editable */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-2 border-b border-[var(--border)]">
              <h2 className="text-lg font-black font-heading text-[var(--teal-900)]">Personal details</h2>
              <p className="text-xs text-[var(--muted)]">Your name and contact information.</p>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Full name <span className="text-[#dc2626]">*</span>
                </label>
                <input type="text" value={profile.full_name} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} className="w-full" placeholder="Jane Smith" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Email address</label>
                <div className="relative">
                  <input type="email" value={user?.email || ''} readOnly className="w-full pr-20" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--page)] px-2 py-0.5 rounded border border-[var(--border)]">Read-only</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Phone number</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full" placeholder="07123 456 789" />
              </div>
            </div>
          </Card>

          {/* Contact preference */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-2 border-b border-[var(--border)]">
              <h2 className="text-lg font-black font-heading text-[var(--teal-900)]">Contact preference</h2>
              <p className="text-xs text-[var(--muted)]">How would you prefer to be contacted?</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {contactOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setProfile(p => ({ ...p, contact_preference: opt.value }))}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                    profile.contact_preference === opt.value
                      ? 'bg-[var(--teal-600)] text-white border-[var(--teal-600)] shadow-soft'
                      : 'bg-white text-[var(--text)] border-[var(--border)] hover:border-[var(--teal-500)] hover:bg-[var(--teal-050)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${profile.contact_preference === opt.value ? 'text-white' : 'text-[var(--teal-600)]'}`}>{opt.icon}</span>
                  <span className="text-xs font-bold font-heading leading-tight">{opt.label}</span>
                </button>
              ))}
            </div>
          </Card>

          {/* Professional registration — read-only */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-2 border-b border-[var(--border)]">
              <h2 className="text-lg font-black font-heading text-[var(--teal-900)]">Professional registration</h2>
              <p className="text-xs text-[var(--muted)]">These details were set when you created your account. Contact support to update them.</p>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Profession</p>
                  <p className="text-sm font-semibold text-[var(--teal-900)]">{PROFESSION_LABELS[readOnly.profession_type] || readOnly.profession_type || '—'}</p>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">{regLabel}</p>
                  <p className="text-sm font-semibold text-[var(--teal-900)]">{readOnly.regulatory_number || '—'}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[var(--border)] space-y-4">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Firm name</p>
                  <p className="text-sm font-semibold text-[var(--teal-900)]">{readOnly.firm_name || '—'}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Company number</p>
                    <p className="text-sm font-semibold text-[var(--teal-900)]">{readOnly.company_number || '—'}</p>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">Registered office</p>
                    <p className="text-sm font-semibold text-[var(--teal-900)]">{readOnly.registered_office || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end pb-12">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
              className="w-full md:w-auto px-12 h-14 rounded-2xl font-black font-heading text-lg active:scale-95 transition-all"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </Button>
          </div>

        </div>
      </main>
    </div>
  );
}
