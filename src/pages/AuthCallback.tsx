import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ensureUserProfile } from '../lib/ensureUserProfile';
import { formatCallbackError } from '../lib/authErrors';

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

        // Ensure PKCE code is exchanged (avoids race where getSession runs before init finishes).
        let session = (await supabase.auth.getSession()).data.session;
        const code = params.get('code');
        if (!session && code) {
          const { data: exchanged, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (!exchangeErr && exchanged.session) {
            session = exchanged.session;
          } else if (exchangeErr) {
            session = (await supabase.auth.getSession()).data.session;
            if (!session) throw exchangeErr;
          }
        }

        if (!session) {
          await new Promise((res) => setTimeout(res, 400));
          session = (await supabase.auth.getSession()).data.session;
        }
        if (!session) {
          await new Promise((res) => setTimeout(res, 1500));
          session = (await supabase.auth.getSession()).data.session;
        }

        if (!session) {
          throw new Error(
            'No session found after verification. Try again, or confirm this site URL is listed under Supabase → Authentication → URL Configuration → Redirect URLs.'
          );
        }

        const role = await ensureUserProfile(session.user);

        if (role === 'agent') {
          navigate('/agent/dashboard', { replace: true });
          return;
        }

        // For sellers: check if they already have a property to determine first login
        const { data: userRow } = await supabase
          .from('users')
          .select('id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        const { data: existingProperty } = userRow
          ? await supabase
              .from('properties')
              .select('id')
              .eq('seller_user_id', userRow.id)
              .maybeSingle()
          : { data: null };

        if (existingProperty) {
          navigate('/seller/dashboard', { replace: true });
        } else {
          navigate('/welcome', { replace: true });
        }
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setErrorMsg(formatCallbackError(err));
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
          <p className="text-[var(--muted)] text-sm text-left break-words">{errorMsg}</p>
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
