import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * AuthCallback — handles the redirect after a user clicks the
 * verification link in their email. Supabase appends the session
 * tokens as URL hash fragments (#access_token=...&type=signup).
 * This page exchanges them for a real session, determines the
 * user's role, then redirects to the correct dashboard.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        // Supabase JS automatically picks up the hash tokens and
        // sets the session. We just need to wait for the session.
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (!session) {
          // Tokens may arrive slightly after mount — wait briefly
          await new Promise(res => setTimeout(res, 1500));
          const { data: { session: retrySession }, error: retryError } = await supabase.auth.getSession();
          if (retryError) throw retryError;
          if (!retrySession) throw new Error('No session found after verification. Please try logging in.');
        }

        // Determine role from user metadata and redirect
        const role = session?.user?.user_metadata?.role ?? 'seller';
        if (role === 'agent') {
          navigate('/agent/dashboard', { replace: true });
        } else {
          navigate('/seller/dashboard', { replace: true });
        }
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setErrorMsg(err.message || 'Verification failed. Please try logging in.');
        setStatus('error');
      }
    }

    handleCallback();
  }, [navigate]);

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-2xl p-10 text-center space-y-6">
          <div className="size-16 bg-red-900/20 text-red-500 flex items-center justify-center rounded-2xl mx-auto">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-black font-heading text-white">Verification Failed</h1>
          <p className="text-zinc-400 text-sm">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 rounded-xl bg-[#00e5a0] text-black font-black font-heading hover:bg-[#00e5a0]/90 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="size-16 bg-[#00e5a0]/10 flex items-center justify-center rounded-2xl mx-auto">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00e5a0]" />
        </div>
        <div>
          <h1 className="text-2xl font-black font-heading text-white">Verifying your account…</h1>
          <p className="text-zinc-400 text-sm mt-2">You'll be redirected to your dashboard shortly.</p>
        </div>
      </div>
    </div>
  );
}
