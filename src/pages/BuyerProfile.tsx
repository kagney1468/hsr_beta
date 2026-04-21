import { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function BuyerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    contact_preference: 'email',
  });

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;
      try {
        // Try users table first
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, phone, contact_preference')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (userData?.full_name) {
          setFormData({
            full_name: userData.full_name || '',
            phone: userData.phone || '',
            contact_preference: userData.contact_preference || 'email',
          });
          return;
        }

        // No users row yet — try to pre-fill from pack_viewers registration data
        const { data: viewerData } = await supabase
          .from('pack_viewers')
          .select('viewer_name, viewer_phone')
          .eq('auth_user_id', user.id)
          .order('viewed_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (viewerData) {
          setFormData(prev => ({
            ...prev,
            full_name: viewerData.viewer_name || '',
            phone: viewerData.viewer_phone || '',
          }));
        }
      } catch (err) {
        console.error('Error loading buyer profile:', err);
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
    if (!formData.full_name.trim()) {
      setMessage({ type: 'error', text: 'Please enter your full name.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            phone: formData.phone,
            contact_preference: formData.contact_preference,
            email: user.email,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            user_type: 'buyer',
            role: 'buyer',
            full_name: formData.full_name,
            phone: formData.phone,
            contact_preference: formData.contact_preference,
          });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Profile saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving buyer profile:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save profile. Please try again.' });
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
    { value: 'email', icon: 'mail', label: 'Email' },
    { value: 'phone', icon: 'call', label: 'Phone call' },
    { value: 'sms', icon: 'sms', label: 'SMS text' },
  ];

  return (
    <div className="min-h-screen bg-[var(--page)] text-[var(--text)]">
      {/* Header */}
      <div className="px-6 md:px-10 pt-10 pb-6 border-b border-[var(--border)] bg-white">
        <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
          My Profile
        </h1>
        <p className="text-[var(--muted)] mt-1 text-sm">
          Your contact details — used to keep you up to date on any packs you have registered for.
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

          {/* Personal details */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-2 border-b border-[var(--border)]">
              <h2 className="text-lg font-black font-heading text-[var(--teal-900)]">
                Personal details
              </h2>
              <p className="text-xs text-[var(--muted)]">
                Your name and contact information.
              </p>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Full name <span className="text-[#dc2626]">*</span>
                </label>
                <input
                  type="text"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="Jane Smith"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Email address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    readOnly
                    className="w-full pr-20"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] bg-[var(--page)] px-2 py-0.5 rounded border border-[var(--border)]">
                    Read-only
                  </span>
                </div>
                <p className="text-[11px] text-[var(--muted)]">
                  This is the email address linked to your account and cannot be changed here.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                  Phone number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full"
                  placeholder="07123 456 789"
                />
              </div>
            </div>
          </Card>

          {/* Contact preference */}
          <Card className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1 pb-2 border-b border-[var(--border)]">
              <h2 className="text-lg font-black font-heading text-[var(--teal-900)]">
                Contact preference
              </h2>
              <p className="text-xs text-[var(--muted)]">
                How would you prefer sellers and agents to get in touch with you?
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {contactOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, contact_preference: opt.value }))}
                  className={`p-4 rounded-2xl border text-center transition-all flex flex-col items-center gap-2 ${
                    formData.contact_preference === opt.value
                      ? 'bg-[var(--teal-600)] text-white border-[var(--teal-600)] shadow-soft'
                      : 'bg-white text-[var(--text)] border-[var(--border)] hover:border-[var(--teal-500)] hover:bg-[var(--teal-050)]'
                  }`}
                >
                  <span className={`material-symbols-outlined text-2xl ${
                    formData.contact_preference === opt.value ? 'text-white' : 'text-[var(--teal-600)]'
                  }`}>
                    {opt.icon}
                  </span>
                  <span className="text-xs font-bold font-heading leading-tight">{opt.label}</span>
                </button>
              ))}
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
