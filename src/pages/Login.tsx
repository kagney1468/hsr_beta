import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';
import { formatAuthError } from '../lib/authErrors';

export default function Login() {
  const [role, setRole] = useState<'seller' | 'agent' | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location]);

  useEffect(() => {
    if (user && !authLoading) {
      checkRoleAndRedirect(user.id);
    }
  }, [user, authLoading]);

  const checkRoleAndRedirect = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        navigate('/seller/onboarding');
        return;
      }

      if (data.role === 'seller') {
        const { data: prop, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_user_id', userId)
          .maybeSingle();

        if (propError) throw propError;
        if (!prop) {
          navigate('/seller/onboarding');
        } else {
          navigate('/seller/dashboard');
        }
      } else if (data.role === 'agent') {
        navigate('/agent/dashboard');
      }
    } catch (err: unknown) {
      console.error('Error fetching role:', err);
      setError(err instanceof Error ? err.message : 'Failed to determine user role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const redirectTo = getAuthRedirectUrl();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          /** Must allow new Auth users here or "login" never creates an account / sends first-time mail. */
          shouldCreateUser: true,
        },
      });

      if (otpError) {
        const m = otpError.message || '';
        if (/redirect|not allowed|invalid.*url/i.test(m)) {
          setError(
            `Auth redirect blocked. In Supabase → Authentication → URL Configuration, add this exact URL to Redirect URLs: ${redirectTo}`
          );
        } else {
          setError(formatAuthError(otpError));
        }
        return;
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not send login link.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && !error)) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-[var(--teal-600)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
            <div className="flex items-center justify-center gap-3 text-[var(--teal-600)] mb-8">
                <span className="material-symbols-outlined text-4xl">home_filled</span>
                <span className="font-heading font-black text-2xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
            </div>
            
            <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-black font-heading tracking-tighter text-[var(--teal-900)]">Welcome back</h1>
                <p className="text-[var(--muted)] text-lg">Please select your account type to continue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <Card 
                    className="p-10 group transition-all cursor-pointer text-left space-y-6 hover:bg-[var(--teal-050)]"
                    onClick={() => setRole('seller')}
                >
                    <div className="size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">person</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black font-heading text-[var(--teal-900)]">I’m a seller</h3>
                        <p className="text-[var(--muted)] text-sm leading-relaxed">Access your property pack, upload documents, and track your sale readiness.</p>
                    </div>
                    <div className="pt-4 flex items-center gap-2 text-[var(--teal-600)] font-semibold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>

                <Card 
                    className="p-10 group transition-all cursor-pointer text-left space-y-6 hover:bg-[var(--teal-050)]"
                    onClick={() => setRole('agent')}
                >
                    <div className="size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black font-heading text-[var(--teal-900)]">I’m an estate agent</h3>
                        <p className="text-[var(--muted)] text-sm leading-relaxed">Manage your agency pipeline, view leads, and access property packs.</p>
                    </div>
                    <div className="pt-4 flex items-center gap-2 text-[var(--teal-600)] font-semibold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>
            </div>

            <div className="pt-8 flex flex-col items-center gap-4">
                <p className="text-[var(--muted)] text-xs font-semibold uppercase tracking-widest">or create a new account</p>
                <div className="flex gap-4">
                    <Link to="/signup/seller" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as seller</Link>
                    <Link to="/signup/agent" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as agent</Link>
                </div>
            </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 text-center space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">mark_email_read</span>
          </div>
          <h2 className="text-2xl font-black font-heading text-[var(--teal-900)]">Check your inbox</h2>
          <p className="text-[var(--muted)]">We've sent your login link.</p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Back</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <button 
            onClick={() => setRole(null)}
            className="text-[var(--muted)] hover:text-[var(--teal-900)] transition-colors flex items-center gap-2 mx-auto text-xs font-semibold uppercase tracking-widest mb-6"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to selection
          </button>
          <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">
            {role === 'seller' ? 'Seller Login' : 'Agent Login'}
          </h1>
          <p className="text-[var(--muted)]">Enter your email and we’ll send you a secure link.</p>
        </div>

        <Card className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-4"
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Send My Login Link'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-[var(--muted)] text-sm">
              New to HomeSalesReady? <Link to={role === 'seller' ? "/signup/seller" : "/signup/agent"} className="text-[var(--teal-600)] font-semibold hover:underline">Create an account</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
