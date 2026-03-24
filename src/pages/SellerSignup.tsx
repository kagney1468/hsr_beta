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
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-10 border-white/10 bg-zinc-900 text-center space-y-6">
          <div className="size-20 bg-[#00e5a0]/10 text-[#00e5a0] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">mark_email_read</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-white">Check your email</h2>
          <p className="text-zinc-400">We've sent a verification link to <span className="text-white font-bold">{formData.email}</span>. Please verify your email to continue.</p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[#00e5a0]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#00e5a0] mb-4">
            <span className="material-symbols-outlined text-3xl">home_filled</span>
            <span className="font-heading font-black text-xl tracking-tight text-white">HomeSalesReady</span>
          </div>
          <h1 className="text-4xl font-black font-heading text-white tracking-tight">Seller Sign Up</h1>
          <p className="text-zinc-400">Get your property ready for the market.</p>
        </div>

        <Card className="p-8 border-white/5 bg-zinc-900 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-500 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
              <input 
                type="text" 
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Email Address</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="john@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Phone Number</label>
              <input 
                type="tel" 
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="07123 456789"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Password</label>
              <input 
                type="password" 
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2 border-t border-white/5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-[#00e5a0]">Were you referred by an estate agent?</label>
              <input 
                type="text" 
                name="referredBy"
                value={formData.referredBy}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-[#00e5a0]/20 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="Enter agency name"
              />
              <p className="text-[10px] text-zinc-500 italic">This will automatically link your account to your agent.</p>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl text-black font-black font-heading text-lg mt-4 shadow-xl shadow-[#00e5a0]/10"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Create Seller Account'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-zinc-500 text-sm">
              Already have an account? <Link to="/login" className="text-[#00e5a0] font-bold hover:underline">Log in</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
