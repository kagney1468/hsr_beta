import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ensureUserProfile } from '../lib/ensureUserProfile';
import { formatCallbackError } from '../lib/authErrors';

/**
 * AuthCallback — handles the redirect after magic-link or Google OAuth login.
 *
 * Implicit flow (magic link): tokens arrive in URL hash.
 * PKCE / OAuth flow (Google): Supabase exchanges code from query string.
 *
 * New Google users are created in public.users with type determined by:
 *   1. agent_ref URL param → agent
 *   2. hsr_pending_signup_role in localStorage (set by AgentSignup) → agent
 *   3. Otherwise → seller
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

        let session = null;

        // ── 1. Implicit flow: tokens arrive in the URL hash ──────────────────
        const hash = window.location.hash;
        if (hash && hash.includes('access_token=')) {
          const hashParams = new URLSearchParams(hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token') ?? '';
          if (accessToken) {
            const { data, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (setErr) throw setErr;
            session = data.session;
          }
        }

        // ── 2. Check if detectSessionInUrl already handled it ─────────────────
        if (!session) {
          session = (await supabase.auth.getSession()).data.session;
        }

        // ── 3. PKCE / OAuth fallback: exchange code from query string ─────────
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

        // ── 4. Short retries for async session propagation ────────────────────
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

        const isGoogleOAuth = session.user.app_metadata?.provider === 'google';

        if (isGoogleOAuth) {
          // ── Google OAuth: handle new-user creation directly ─────────────────
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          if (!existingUser) {
            // New Google user — determine role from URL params or localStorage
            const agentRef = params.get('agent_ref');
            const pendingRole = localStorage.getItem('hsr_pending_signup_role');
            const userType: 'seller' | 'agent' =
              agentRef || pendingRole === 'agent' ? 'agent' : 'seller';
            localStorage.removeItem('hsr_pending_signup_role');

            const fullName = (session.user.user_metadata?.full_name as string) || null;

            const { error: insertError } = await supabase.from('users').insert({
              auth_user_id: session.user.id,
              email: session.user.email,
              full_name: fullName,
              role: userType,
              user_type: userType,
            });

            // 23505 = unique violation — row was race-created, fine to continue
            if (insertError && insertError.code !== '23505') {
              throw new Error('Could not create profile: ' + insertError.message);
            }
          } else {
            // Existing Google user — ensure full_name is saved if missing
            const fullName = (session.user.user_metadata?.full_name as string) || null;
            if (fullName) {
              const { data: userRow } = await supabase
                .from('users')
                .select('full_name')
                .eq('auth_user_id', session.user.id)
                .maybeSingle();
              if (userRow && !userRow.full_name) {
                await supabase
                  .from('users')
                  .update({ full_name: fullName })
                  .eq('auth_user_id', session.user.id);
              }
            }
          }
        } else {
          // ── Magic link flow: use existing ensureUserProfile logic ─────────────
          await ensureUserProfile(session.user);
        }

        // ── Read user row (authoritative routing source) ──────────────────────
        const { data: userRow, error: userErr } = await supabase
          .from('users')
          .select('id, user_type, onboarding_complete, agency_id')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (userErr) throw userErr;

        if (!userRow) {
          navigate('/login', {
            replace: true,
            state: { error: 'Account not found. Please sign up first.' },
          });
          return;
        }

        // ── Agency referral linking (seller invite flows) ─────────────────────
        const agentRef = params.get('agent_ref');
        if (agentRef && !userRow.agency_id) {
          const { data: agencyRow } = await supabase
            .from('agencies')
            .select('id')
            .eq('agent_user_id', agentRef)
            .maybeSingle();
          if (agencyRow) {
            await supabase
              .from('users')
              .update({ agency_id: agencyRow.id })
              .eq('id', userRow.id);
          }
        }

        const referredByAgency = session.user.user_metadata?.referred_by_agency;
        if (referredByAgency && !userRow.agency_id && !agentRef) {
          const { data: agencyRow } = await supabase
            .from('agencies')
            .select('id')
            .ilike('agency_name', referredByAgency.trim())
            .maybeSingle();
          if (agencyRow) {
            await supabase
              .from('users')
              .update({ agency_id: agencyRow.id })
              .eq('id', userRow.id);
          }
        }

        // ── Redirect based on user_type ───────────────────────────────────────
        const userType = (userRow.user_type ?? '').toLowerCase();

        if (userType === 'buyer') {
          navigate('/buyer/dashboard', { replace: true });
          return;
        }

        if (userType === 'professional') {
          navigate('/professional/dashboard', { replace: true });
          return;
        }

        if (userType === 'agent') {
          // Agent with no linked agency → collect firm details first
          if (!userRow.agency_id) {
            navigate('/agent/onboarding', { replace: true });
          } else {
            navigate('/agent/dashboard', { replace: true });
          }
          return;
        }

        // Seller: use onboarding_complete flag, fall back to property check
        if (userRow.onboarding_complete === true) {
          navigate('/seller/dashboard', { replace: true });
          return;
        }

        const { data: existingProperty } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_user_id', userRow.id)
          .maybeSingle();

        navigate(existingProperty ? '/seller/dashboard' : '/welcome', { replace: true });
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
          <p className="text-[var(--muted)] text-sm mt-2">You'll be redirected to your dashboard shortly.</p>
        </div>
      </div>
    </div>
  );
}
