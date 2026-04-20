import React, { useState, useEffect } from 'react';
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
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone, contact_preference')
          .eq('auth_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            contact_preference: data.contact_preference || 'email',
          });
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
        .single();

      if (existing) {
        const { error } = await supabase
          .from('users')
          .update({ ...formData, email: user.email })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('users')
          .insert({ auth_user_id: user.id, email: user.email, user_type: 'buyer', role: 'buyer', ...formData });
        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Profile saved.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      console.error('Error saving buyer profile:', err);
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

  return (
    <div className="max-w-2xl mx-auto space-y-10 py-6 md:py-10 px-4 md:px-0">
      <div className="space-y-1">
        <h1 className="text-3xl font-black font-heading text-[var(--teal-900)] tracking-tight">My Profile</h1>
        <p className="text-[var(--muted)]">Manage your contact details.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl border font-bold animate-in fade-in slide-in-from-top-2 duration-300 ${
          message.type === 'success'
            ? 'bg-[#d1fae5] border-[#a7f3d0] text-[#065f46]'
            : 'bg-[#fee2e2] border-[#fecaca] text-[#b91c1c]'
        }`}>
          {message.text}
        </div>
      )}

      <Card className="p-6 sm:p-8 space-y-8">
        <div className="space-y-1">
          <h3 className="text-xl font-bold font-heading text-[var(--teal-900)]">Personal Information</h3>
          <p className="text-xs text-[var(--muted)]">Your core contact details.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Full Name <span className="text-[#dc2626]">*</span></label>
            <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} className="w-full" placeholder="Jane Smith" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Email Address (Read-only)</label>
            <input type="email" value={user?.email || ''} readOnly className="w-full" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Phone Number</label>
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

      <div className="flex justify-end pb-12">
        <Button variant="primary" onClick={handleSave} disabled={saving} className="w-full md:w-auto px-12 h-14 rounded-2xl font-black font-heading text-lg active:scale-95 transition-all">
          {saving ? 'Saving…' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
