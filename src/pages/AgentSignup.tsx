import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export default function AgentSignup() {
  const [formData, setFormData] = useState({
    fullName: '',
    agencyName: '',
    email: '',
    phone: '',
    password: '',
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
      // 1. Create entry in public.agencies table first
      const { data: agencyData, error: agencyError } = await supabase.from('agencies').insert({
        agency_name: formData.agencyName,
      }).select('agency_id').single();

      if (agencyError) throw agencyError;

      // 2. Sign up user in Supabase Auth with metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            agency_name: formData.agencyName,
            phone: formData.phone,
            role: 'agent',
            agency_id: agencyData.agency_id
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
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
          <h2 className="text-3xl font-black font-heading text-white">Verify your Agency</h2>
          <p className="text-zinc-400">We've sent a verification link to <span className="text-white font-bold">{formData.email}</span>. Please verify your email to access your agency dashboard.</p>
          <Button variant="primary" className="w-full" onClick={() => navigate('/login')}>Return to Login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 right-1/2 translate-x-1/2 w-full h-[500px] bg-[#00e5a0]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-[#00e5a0] mb-4">
            <span className="material-symbols-outlined text-3xl">home_filled</span>
            <span className="font-heading font-black text-xl tracking-tight text-white">HomeSalesReady</span>
          </div>
          <h1 className="text-4xl font-black font-heading text-white tracking-tight">Agent Sign Up</h1>
          <p className="text-zinc-400">Manage your property pipeline with white-label tools.</p>
        </div>

        <Card className="p-8 border-white/5 bg-zinc-900 shadow-2xl space-y-6">
          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 text-red-500 rounded-xl text-sm font-bold">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Agency Name</label>
              <input 
                type="text" 
                name="agencyName"
                required
                value={formData.agencyName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="Elite Properties"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Full Name</label>
              <input 
                type="text" 
                name="fullName"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="Jane Smith"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Work Email</label>
              <input 
                type="email" 
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full h-12 px-4 rounded-xl border border-white/10 bg-black/50 text-white focus:border-[#00e5a0]/50 outline-none transition-all"
                placeholder="jane@agency.com"
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

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full h-14 rounded-2xl text-black font-black font-heading text-lg mt-4 shadow-xl shadow-[#00e5a0]/10"
              disabled={loading}
            >
              {loading ? 'Registering Agent...' : 'Create Agent Account'}
            </Button>
          </form>

          <div className="text-center pt-4">
            <p className="text-zinc-500 text-sm">
              Registering for an agency? <Link to="/login" className="text-[#00e5a0] font-bold hover:underline">Log in here</Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
