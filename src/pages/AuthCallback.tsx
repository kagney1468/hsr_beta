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
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border-[1.5px] border-[var(--border)] rounded-2xl p-10 text-center space-y-6 shadow-soft">
          <div className="size-16 bg-[#fee2e2] text-[#dc2626] flex items-center justify-center rounded-2xl mx-auto border border-[#fecaca]">
            <span className="material-symbols-outlined text-3xl">error</span>
          </div>
          <h1 className="text-2xl font-black font-heading text-[var(--teal-900)]">Verification failed</h1>
          <p className="text-[var(--muted)] text-sm">{errorMsg}</p>
          <button
            onClick={() => navigate('/login')}
            className="w-full h-12 rounded-xl bg-[var(--teal-600)] text-white font-bold font-heading hover:bg-[var(--teal-900)] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
      <div className="text-center space-y-6">
        <div className="size-16 bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center rounded-2xl mx-auto">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--teal-600)]" />
        </div>
        <div>
          <h1 className="text-2xl font-black font-heading text-[var(--teal-900)]">Verifying your account…</h1>
          <p className="text-[var(--muted)] text-sm mt-2">You’ll be redirected to your dashboard shortly.</p>
        </div>
      </div>
    </div>
  );
}
