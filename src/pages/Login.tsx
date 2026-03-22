import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function Login() {
  const [role, setRole] = useState<'seller' | 'agent' | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, isLoading: authLoading } = useAuth();

  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
    }
  }, [location]);

  useEffect(() => {
    if (user && !authLoading) {
      /* if (!user.email_confirmed_at) {
        setError("Please verify your email address to continue.");
        return;
      } */
      checkRoleAndRedirect(user.id);
    }
  }, [user, authLoading]);

  const checkRoleAndRedirect = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_user_id', userId)
        .maybeSingle();
      
      if (error) throw error;

      if (!data) {
        // If no user record exists yet, they might be a very fresh signup.
        // We'll redirect to onboarding as a fallback for now.
        navigate('/seller/onboarding');
        return;
      }

      if (data.role === 'seller') {
        const { data: prop, error: propError } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_user_id', userId)
          .maybeSingle();
        
        if (!prop) {
          navigate('/seller/onboarding');
        } else {
          navigate('/seller/dashboard');
        }
      } else if (data.role === 'agent') {
        navigate('/agent/dashboard');
      }
    } catch (err: any) {
      console.error('Error fetching role:', err);
      setError(err.message || 'Failed to determine user role. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.user) {
        if (!data.user.email_confirmed_at) {
          setError("Verification pending. Please check your inbox for the activation link.");
          await signOut();
          return;
        }
        await checkRoleAndRedirect(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (user && !error)) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin size-8 border-2 border-[#00e5a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#00e5a0]/5 blur-[120px] rounded-full pointer-events-none" />
        
        <div className="w-full max-w-4xl space-y-12 relative z-10 text-center">
            <div className="flex items-center justify-center gap-2 text-[#00e5a0] mb-8">
                <span className="material-symbols-outlined text-4xl">home_filled</span>
                <span className="font-heading font-black text-2xl tracking-tight text-white uppercase">HomeSalesReady</span>
            </div>
            
            <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl font-black font-heading text-white tracking-tighter">Welcome Back</h1>
                <p className="text-zinc-500 text-lg">Please select your account type to continue.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                <Card 
                    className="p-10 border-white/5 bg-zinc-900 group hover:border-[#00e5a0]/50 transition-all cursor-pointer text-left space-y-6"
                    onClick={() => setRole('seller')}
                >
                    <div className="size-16 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">person</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black font-heading text-white">I'm a Seller</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Access your property pack, upload documents, and track your sale readiness.</p>
                    </div>
                    <div className="pt-4 flex items-center gap-2 text-[#00e5a0] font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>

                <Card 
                    className="p-10 border-white/5 bg-zinc-900 group hover:border-[#00e5a0]/50 transition-all cursor-pointer text-left space-y-6"
                    onClick={() => setRole('agent')}
                >
                    <div className="size-16 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-2xl group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-3xl">corporate_fare</span>
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-2xl font-black font-heading text-white">I'm an Estate Agent</h3>
                        <p className="text-zinc-500 text-sm leading-relaxed">Manage your agency pipeline, view leads, and access property packs.</p>
                    </div>
                    <div className="pt-4 flex items-center gap-2 text-[#00e5a0] font-black text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        Continue to Login
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </div>
                </Card>
            </div>

            <div className="pt-8 flex flex-col items-center gap-4">
                <p className="text-zinc-600 text-xs font-bold uppercase tracking-widest">or create a new account</p>
                <div className="flex gap-4">
                    <Link to="/signup/seller" className="px-6 py-2 rounded-xl border border-white/10 hover:border-[#00e5a0]/50 text-white text-xs font-black uppercase tracking-widest transition-all">Sign up as Seller</Link>
                    <Link to="/signup/agent" className="px-6 py-2 rounded-xl border border-white/10 hover:border-[#00e5a0]/50 text-white text-xs font-black uppercase tracking-widest transition-all">Sign up as Agent</Link>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#00e5a0]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <button 
            onClick={() => setRole(null)}
            className="text-zinc-500 hover:text-white transition-all flex items-center gap-2 mx-auto text-xs font-black uppercase tracking-widest mb-6"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to selection
          </button>
          <h1 className="text-4xl font-black font-heading text-white tracking-tight">
            {role === 'seller' ? 'Seller Login' : 'Agent Login'}
          </h1>
          <p className="text-zinc-400">Welcome back. Enter your details below.</p>
        </div>

        <Card className="p-8 border-white/5 bg-zinc-900 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-500 rounded-xl text-sm font-bold animate-in fade-in slide-in-from-top-2">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Password</label>
                <button type="button" className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors">Forgot?</button>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl text-black font-black font-heading text-lg mt-4 shadow-xl shadow-[#00e5a0]/10"
              disabled={loading}
            >
              {loading ? 'Logging in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-zinc-500 text-sm">
              New to HomeSalesReady? <Link to={role === 'seller' ? "/signup/seller" : "/signup/agent"} className="text-[#00e5a0] font-bold hover:underline">Create an account</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
