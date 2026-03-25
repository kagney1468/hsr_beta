import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ensureUserProfile } from '../lib/ensureUserProfile';

/**
 * AuthCallback — handles the redirect after a user clicks the magic link.
 * Supabase sends PKCE: /auth/callback?code=... — client must use flowType 'pkce' so
 * initialize() exchanges the code before getSession() returns a user.
 */
export default function AuthCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function handleCallback() {
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error_description') || params.get('error');
        if (oauthError) {
          throw new Error(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
        }

        // getSession awaits client init, which exchanges ?code= for a session when flowType is pkce
        let session = (await supabase.auth.getSession()).data.session;

        if (!session) {
          await new Promise((res) => setTimeout(res, 500));
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session) {
          await new Promise((res) => setTimeout(res, 2000));
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session) {
          throw new Error('No session found after verification. Please try logging in.');
        }

        const role = await ensureUserProfile(session.user);

        if (role === 'agent') {
          navigate('/agent/dashboard', { replace: true });
        } else {
          navigate('/seller/dashboard', { replace: true });
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setErrorMsg(err instanceof Error ? err.message : 'Verification failed. Please try logging in.');
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
          <h1 className="text-2xl font-black font-heading text-[var(--teal-900)]">Signing you in…</h1>
          <p className="text-[var(--muted)] text-sm mt-2">You’ll be redirected to your dashboard shortly.</p>
        </div>
      </div>
    </div>
  );
}
