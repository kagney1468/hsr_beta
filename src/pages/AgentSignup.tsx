import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';

export default function AgentSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    agencyName: '',
    email: '',
    phone: '',
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
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          data: {
            full_name: formData.fullName,
            agency_name: formData.agencyName,
            phone: formData.phone,
            role: 'agent',
          },
        },
      });

      if (otpError) throw otpError;
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during signup.');
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
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Check your inbox</h2>
          <p className="text-[var(--muted)]">
            We've sent you a secure access link. Click it to get started.
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[var(--teal-600)] mb-4">
            <span className="material-symbols-outlined text-3xl">home_filled</span>
            <span className="font-heading font-black text-xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
          </div>
          <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Agent sign up</h1>
          <p className="text-[var(--muted)]">Manage your property pipeline with white-label tools.</p>
        </div>

        <Card className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Agency name</label>
              <input 
                type="text" 
                name="agencyName"
                required
                value={formData.agencyName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="Elite Properties"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Full name</label>
              <input 
                type="text" 
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="Jane Smith"
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
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="jane@agency.com"
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-4"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send My Access Link'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-[var(--muted)] text-sm">
              Registering for an agency? <Link to="/login" className="text-[var(--teal-600)] font-semibold hover:underline">Log in here</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
