import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { formatAuthError } from '../lib/authErrors';
import Footer from '../components/Footer';

export default function BuyerSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName, role: 'buyer' },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('Sign-up failed. Please try again.');

      const userId = data.user.id;

      await supabase.from('users').insert({
        auth_user_id: userId,
        full_name: formData.fullName,
        email: formData.email,
        user_type: 'buyer',
        role: 'buyer',
      });

      await supabase
        .from('pack_viewers')
        .update({ auth_user_id: userId })
        .eq('viewer_email', formData.email);

      setSuccess(true);
    } catch (err: unknown) {
      console.error('Buyer signup error:', err);
      setError(formatAuthError(err));
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
            We've sent you a confirmation email. Click the link inside to activate your account.
          </p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-[var(--teal-600)] mb-4">
              <span className="material-symbols-outlined text-3xl">home_filled</span>
              <span className="font-heading font-black text-xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
            </div>
            <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Buyer sign up</h1>
            <p className="text-[var(--muted)]">Create an account to access property packs you've registered for.</p>
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
                <input type="text" name="fullName" required value={formData.fullName} onChange={handleChange} className="w-full" placeholder="Jane Smith" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email address</label>
                <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full" placeholder="jane@example.com" />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pr-10"
                    placeholder="At least 8 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Confirm password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pr-10"
                    placeholder="Repeat your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors"
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    <span className="material-symbols-outlined text-[20px]">{showConfirm ? 'visibility_off' : 'visibility'}</span>
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-4"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Create My Account'}
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
      <Footer />
    </div>
  );
}
