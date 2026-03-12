import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  // Redirect if already logged in
  if (user) {
    navigate('/seller/dashboard');
    return null;
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: 'https://mvp2-delta.vercel.app/seller/dashboard'
        }
      });
      if (error) throw error;
      
      setSuccessMessage('Check your email for your secure sign-in link.');
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
      <div className="relative flex h-auto min-h-screen w-full flex-col group/design-root overflow-x-hidden">
        <div className="layout-container flex h-full grow flex-col">
          <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 px-6 py-3 lg:px-40 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
            <div className="flex items-center gap-2 text-primary">
              <span aria-hidden="true" className="material-symbols-outlined text-3xl">home_filled</span>
              <h2 className="text-slate-900 dark:text-slate-100 text-lg font-bold leading-tight tracking-tight">Home Sales Ready</h2>
            </div>
          </header>
          <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 lg:px-40">
            <div className="w-full max-w-[440px] flex flex-col gap-10">
              <div className="flex flex-col gap-6">
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-slate-200/60 dark:border-slate-800 relative bg-slate-50 dark:bg-zinc-900">
                  <img alt="Modern clean home interior" className="w-full h-full object-cover opacity-80" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB-yxgehddu8sftX1fdl2PfjYhS3l61Zo9OeOeP4DV9qBvzKphTm1Q2t0cvVbFXqB8Obhnz12Hh4MjiESTngPapZVWk1hOgiQMeH-zvD5Ww2VSskCvij315VWiETbiv1CMfxL7WIjQSRcvRNI-_v7cVxQ8ozViVZ3tTZb3f89ILfKW4PxEOR2bsUdqutbhLQKlAsqQFuu3cofP0Wdu57eiSMShtvx74gmgAbTIjbM19-5JjuZM396OXZUsBrAPwoq2NV6gWSNvmeCA"/>
                </div>
                <div className="text-center md:text-left">
                  <h1 className="text-slate-900 dark:text-slate-50 text-3xl font-bold tracking-tight mb-2">Home Sales Ready</h1>
                  <p className="text-primary font-medium text-base leading-relaxed mb-3">Prepare your property before it goes on the market.</p>
                  <p className="text-slate-600 dark:text-slate-400 text-base font-normal leading-normal">
                    Our AI-driven platform helps you collate all the necessary paperwork and documentation to ensure that you are sales ready before listing. Be ahead of the market.
                  </p>
                </div>
              </div>
              
              {!isSupabaseConfigured && (
                <div className="p-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-sm">
                  <strong>Supabase is not configured.</strong> Please add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to your environment variables to enable authentication and database features.
                </div>
              )}

              <div className="flex flex-col gap-3 w-full">
                {showEmailForm ? (
                  successMessage ? (
                    <div className="flex flex-col items-center justify-center p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center gap-3">
                      <span className="material-symbols-outlined text-4xl text-green-500">mark_email_read</span>
                      <p className="text-green-800 dark:text-green-200 font-medium">{successMessage}</p>
                      <button 
                        type="button" 
                        onClick={() => setSuccessMessage(null)}
                        className="mt-2 text-sm text-green-700 dark:text-green-400 hover:underline font-semibold"
                      >
                        Try another email
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
                      {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                          {error}
                        </div>
                      )}
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Email</label>
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-zinc-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/50"
                          placeholder="you@example.com"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={loading}
                        className="h-11 mt-2 rounded-lg bg-primary text-white font-bold hover:bg-primary/90 transition-colors disabled:opacity-70"
                      >
                        {loading ? 'Sending link...' : 'Send Magic Link'}
                      </button>
                      <div className="text-center mt-2">
                        <button 
                          type="button" 
                          onClick={() => setShowEmailForm(false)}
                          className="text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        >
                          Back to all login options
                        </button>
                      </div>
                    </form>
                  )
                ) : (
                  <>
                    <button type="button" className="flex items-center justify-center gap-3 w-full h-11 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all shadow-sm opacity-50 cursor-not-allowed" title="Coming soon">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="currentColor"></path>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="currentColor"></path>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="currentColor"></path>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="currentColor"></path>
                      </svg>
                      <span>Continue with Google</span>
                    </button>
                    <button type="button" className="flex items-center justify-center gap-3 w-full h-11 rounded-lg bg-slate-900 dark:bg-white dark:text-slate-900 text-white text-sm font-medium hover:opacity-90 transition-all shadow-sm opacity-50 cursor-not-allowed" title="Coming soon">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.96.95-2.12 2.13-3.6 2.13-1.41 0-1.85-.88-3.6-.88-1.76 0-2.24.85-3.6.88-1.44.03-2.6-1.21-3.6-2.13C.68 18.28-1.63 13.56 1.57 9.17c1.55-2.1 3.73-3.23 5.62-3.23 1.44 0 2.58.85 3.6.85 1.02 0 2.06-.85 3.6-.85 1.5 0 3.31.78 4.6 2.27-3.15 1.61-2.64 6.22.56 7.64-.69 1.76-1.55 3.48-2.5 4.43zM12.03 5.35C11.9 3.1 13.84 1 15.89 1c.14 2.37-2.3 4.54-3.86 4.35z" fill="currentColor"></path>
                      </svg>
                      <span>Continue with Apple</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setShowEmailForm(true)}
                      className="flex items-center justify-center gap-3 w-full h-11 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-all shadow-sm"
                    >
                      <span className="material-symbols-outlined text-xl">mail</span>
                      <span>Continue with Email</span>
                    </button>
                  </>
                )}
              </div>
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-6 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                  By continuing, you agree to our Terms of Service and Privacy Policy. Our AI recommendations are based on market data analysis and should be verified by a property professional.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">Secure</span>
                  </div>
                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-amber-custom">bolt</span>
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500">AI Enhanced</span>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <footer className="py-8 px-6 text-center">
            <p className="text-xs text-slate-400 dark:text-slate-600">© 2024 Home Sales Ready. All rights reserved.</p>
          </footer>
        </div>
      </div>
      <div className="fixed top-0 right-0 -z-10 w-1/3 h-1/2 bg-primary/5 blur-[120px] rounded-full"></div>
      <div className="fixed bottom-0 left-0 -z-10 w-1/4 h-1/3 bg-primary/10 blur-[100px] rounded-full"></div>
    </div>
  );
}
