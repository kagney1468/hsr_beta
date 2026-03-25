import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function SellerSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    referredBy: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Sign up user in Supabase Auth
      const { data, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'seller',
            referred_by_agency: formData.referredBy || null
          },
          emailRedirectTo: 'https://homesalesready.com/auth/callback'
        }
      });

      if (authError) throw authError;

      // 2. Logic for automatic linking to agency if referredBy matches
      // Note: In a real app, a DB trigger on auth.users would handle 
      // linking the 'users' table record to an 'agency_id' by matching 
      // the agency name in the metadata.
      
      if (data.user) {
        setSuccess(true);
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      setError(err.message || 'An error occurred during signup.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 text-center space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">mark_email_read</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Check your email</h2>
          <p className="text-[var(--muted)]">We've sent a verification link to <span className="text-[var(--teal-900)] font-semibold">{formData.email}</span>. Please verify your email to continue.</p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[var(--teal-600)] mb-4">
            <span className="material-symbols-outlined text-3xl">home_filled</span>
            <span className="font-heading font-black text-xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
          </div>
          <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Seller sign up</h1>
          <p className="text-[var(--muted)]">Get your property ready for the market.</p>
        </div>

        <Card className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Full name</label>
              <input 
                type="text" 
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Phone number</label>
              <input 
                type="tel" 
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="07123 456789"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Password</label>
              <input 
                type="password" 
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2 border-t border-[var(--border)] space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--teal-900)]">Were you referred by an estate agent?</label>
              <input 
                type="text" 
                name="referredBy"
                value={formData.referredBy}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="Enter agency name"
              />
              <p className="text-[10px] text-[var(--muted)] italic">This will automatically link your account to your agent.</p>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-4"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Seller Account'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-[var(--muted)] text-sm">
              Already have an account? <Link to="/login" className="text-[var(--teal-600)] font-semibold hover:underline">Log in</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
