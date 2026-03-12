import React, { useState, useEffect } from 'react';
import { Card } from '../components/ui/Card';
import { SectionContainer } from '../components/ui/SectionContainer';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function SellerProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
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
          .select('*')
          .eq('auth_user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        if (data) {
          setFormData({
            full_name: data.full_name || '',
            phone: data.phone || '',
            contact_preference: data.contact_preference || 'email',
          });
        } else {
          // Create a new row if it doesn't exist yet
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              auth_user_id: user.id,
              email: user.email,
              role: 'seller'
            });
            
          if (insertError) {
            console.error('Error creating initial profile:', insertError);
          }
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      // Check if user exists to get the primary key if needed, or just update by auth_user_id
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      let error;

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            email: user.email,
            role: 'seller',
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingUser.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            auth_user_id: user.id,
            email: user.email,
            role: 'seller',
            ...formData,
            updated_at: new Date().toISOString(),
          });
        error = insertError;
      }

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile saved successfully!' });
    } catch (error: any) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse flex space-x-4">Loading...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Seller Profile</h1>
        <p className="text-slate-500 mt-1">Manage your personal information and identity verification.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <Card className="p-8">
        <SectionContainer 
          title="Personal Information" 
          description="Your contact details and primary address."
        >
          <div className="space-y-4 max-w-xl">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Full Name</label>
              <input 
                type="text" 
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="John Doe"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email Address</label>
              <input 
                type="email" 
                value={user?.email || ''}
                disabled
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-zinc-800 text-slate-500 dark:text-slate-400 cursor-not-allowed"
              />
              <p className="text-xs text-slate-400">Email is managed through your account settings.</p>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="+1 (555) 000-0000"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Contact Preference</label>
              <select 
                name="contact_preference"
                value={formData.contact_preference}
                onChange={handleChange}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="sms">SMS</option>
              </select>
            </div>
          </div>
        </SectionContainer>

        <SectionContainer 
          title="Identity Verification" 
          description="Upload your ID to verify your identity as the property owner."
          className="border-0 mt-8"
        >
          <div className="p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 mb-2">badge</span>
            <p className="text-slate-500 font-medium">ID Upload Component Placeholder</p>
            <p className="text-sm text-slate-400 mt-1">Integration with identity verification service will go here.</p>
          </div>
        </SectionContainer>

        <div className="mt-8 flex justify-end gap-4">
          <Button variant="ghost">Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
