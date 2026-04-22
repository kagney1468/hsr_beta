import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';
import { formatAuthError } from '../lib/authErrors';
import Footer from '../components/Footer';
import DisclaimerBox from '../components/DisclaimerBox';
import { getGreeting } from '../lib/greeting';

export default function Login() {
  const [role, setRole] = useState<'seller' | 'agent' | 'buyer' | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'magic-link' | 'password'>('magic-link');
  const [password, setPassword] = useState('');
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

  const checkRoleAndRedirect = async (authUserId: string, attempt = 0) => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('users')
        .select('id, user_type, onboarding_complete')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!data) {
        if (attempt < 3) {
          setTimeout(() => checkRoleAndRedirect(authUserId, attempt + 1), 500);
          return;
        }
        setError('No account found for this email. Please sign up first.');
        return;
      }

      const userType = (data.user_type ?? '').toLowerCase();

      if (userType === 'buyer') {
        navigate('/buyer/dashboard');
        return;
      }
      if (userType === 'agent') {
        navigate('/agent/dashboard');
        return;
      }

      if (data.onboarding_complete === true) {
        navigate('/seller/dashboard');
        return;
      }

      const { data: prop, error: propError } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_user_id', data.id)
        .maybeSingle();

      if (propError) throw propError;
      navigate(prop ? '/seller/dashboard' : '/seller/profile');

    } catch (err: unknown) {
      console.error('Error fetching role:', err);
      setError(err instanceof Error ? err.message : 'Failed to determine your account type. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (loginMethod === 'password') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) setError(formatAuthError(signInError));
        return;
      }

      const redirectTo = getAuthRedirectUrl();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectTo,
          // Login only — do not create new accounts from the login page.
          // New users must register via /signup/seller or /signup/agent.
          shouldCreateUser: false,
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
      setError(err instanceof Error ? err.message : 'Could not sign in.');
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
      <div className="min-h-screen bg-[var(--page)] flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
            <div className="flex items-center justify-center gap-3 text-[var(--teal-600)] mb-8">
                <span className="material-symbols-outlined text-4xl">home_filled</span>
                <span className="font-heading font-black text-2xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
            </div>
            
            <div className="space-y-4">
                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black font-heading tracking-tighter text-[var(--teal-900)]">{getGreeting(null)}</h1>
                <p className="text-[var(--muted)] text-lg">Please select your account type to continue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8 mt-12">
                <Card
                    className="p-6 sm:p-10 group transition-all cursor-pointer text-left space-y-4 sm:space-y-6 hover:bg-[var(--teal-050)]"
                    onClick={() => setRole('seller')}
                >
                    <div className="size-14 sm:size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">person</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black font-heading text-[var(--teal-900)]">I'm a seller</h3>
                        <p className="text-[var(--muted)] text-sm leading-relaxed">Access your property pack, upload documents, and track your sale readiness.</p>
                    </div>
                    <div className="pt-2 sm:pt-4 flex items-center gap-2 text-[var(--teal-600)] font-semibold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>

                <Card
                    className="p-6 sm:p-10 group transition-all cursor-pointer text-left space-y-4 sm:space-y-6 hover:bg-[var(--teal-050)]"
                    onClick={() => setRole('agent')}
                >
                    <div className="size-14 sm:size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">corporate_fare</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black font-heading text-[var(--teal-900)]">I'm an estate agent</h3>
                        <p className="text-[var(--muted)] text-sm leading-relaxed">Manage your agency pipeline, view leads, and access property packs.</p>
                    </div>
                    <div className="pt-2 sm:pt-4 flex items-center gap-2 text-[var(--teal-600)] font-semibold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>

                <Card
                    className="p-6 sm:p-10 group transition-all cursor-pointer text-left space-y-4 sm:space-y-6 hover:bg-[var(--teal-050)]"
                    onClick={() => setRole('buyer')}
                >
                    <div className="size-14 sm:size-16 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-2xl sm:text-3xl">search</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl sm:text-2xl font-black font-heading text-[var(--teal-900)]">I'm a buyer</h3>
                        <p className="text-[var(--muted)] text-sm leading-relaxed">View property packs you've registered for.</p>
                    </div>
                    <div className="pt-2 sm:pt-4 flex items-center gap-2 text-[var(--teal-600)] font-semibold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>
            </div>

            <div style={{ paddingTop: '40px', paddingBottom: '40px' }}>
              <DisclaimerBox />
            </div>

            <div className="pt-8 flex flex-col items-center gap-4">
                <p className="text-[var(--muted)] text-xs font-semibold uppercase tracking-widest">or create a new account</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <Link to="/signup/seller" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as seller</Link>
                    <Link to="/signup/agent" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as agent</Link>
                    <Link to="/signup/buyer" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as buyer</Link>
                    <Link to="/signup/professional" className="px-6 py-2 rounded-xl border border-[var(--border)] hover:bg-[var(--teal-050)] text-[var(--teal-900)] text-xs font-semibold uppercase tracking-widest transition-colors">Sign up as professional</Link>
                </div>
            </div>
        </div>
        </div>
        <Footer />
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
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
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
            {role === 'seller' ? 'Seller Login' : role === 'agent' ? 'Agent Login' : 'Buyer Login'}
          </h1>
          <p className="text-[var(--muted)]">{loginMethod === 'password' ? "Enter your email and password to sign in." : "Enter your email and we'll send you a secure link."}</p>
        </div>

        <Card className="p-6 sm:p-8 space-y-6">
          {error && (
            <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}


          <div className="flex rounded-xl border border-[var(--border)] p-1 gap-1">
            <button
              type="button"
              onClick={() => setLoginMethod('magic-link')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                loginMethod === 'magic-link'
                  ? 'bg-[var(--teal-600)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--teal-900)]'
              }`}
            >
              Magic link
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('password')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                loginMethod === 'password'
                  ? 'bg-[var(--teal-600)] text-white'
                  : 'text-[var(--muted)] hover:text-[var(--teal-900)]'
              }`}
            >
              Password
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full"
                placeholder="you@example.com"
              />
            </div>

            {loginMethod === 'password' && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)]">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full"
                  placeholder="Your password"
                />
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full h-14 rounded-2xl font-heading font-bold text-lg mt-4"
              disabled={loading}
            >
              {loading
                ? (loginMethod === 'password' ? 'Signing in…' : 'Sending…')
                : (loginMethod === 'password' ? 'Sign In' : 'Send My Login Link')}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-[var(--muted)] text-sm">
              New to HomeSalesReady? <Link to={role === 'seller' ? "/signup/seller" : role === 'agent' ? "/signup/agent" : "/signup/buyer"} className="text-[var(--teal-600)] font-semibold hover:underline">Create an account</Link>
            </p>
          </div>
        </Card>
      </div>
      </div>
      <Footer />
    </div>
  );
}
