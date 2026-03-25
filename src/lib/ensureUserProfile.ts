import type { User } from '@supabase/supabase-js';
import type { PostgrestError } from '@supabase/supabase-js';
import { supabase } from './supabase';

/**
 * Magic link redirect URL. Must be listed in Supabase exactly:
 * Dashboard → Authentication → URL Configuration → Redirect URLs
 * (local dev origin + production domain, each with `/auth/callback`)
 */
export function getAuthRedirectUrl(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}/auth/callback`;
  }
  const site =
    import.meta.env.VITE_PUBLIC_SITE_URL ||
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_VERCEL_URL;
  if (site && typeof site === 'string') {
    const base = site.startsWith('http') ? site : `https://${site}`;
    return `${base.replace(/\/$/, '')}/auth/callback`;
  }
  return 'https://homesalesready.com/auth/callback';
}

function normalizeAppRole(value: unknown): 'seller' | 'agent' | null {
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (s === 'agent') return 'agent';
  if (s === 'seller') return 'seller';
  return null;
}

function throwDb(ctx: string, err: PostgrestError | null): asserts err is null {
  if (err) {
    const bits = [ctx + ':', err.message, err.code, err.details, err.hint].filter(Boolean);
    throw new Error(bits.join(' — '));
  }
}

/**
 * After magic-link login, ensure public.users exists and (for agents) an agencies row
 * is linked via users.agency_id. Handles rows pre-created by DB triggers.
 */
export async function ensureUserProfile(user: User): Promise<'seller' | 'agent'> {
  const meta = user.user_metadata || {};
  const metaRole = normalizeAppRole(meta.role);

  async function fetchUserRow() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', user.id)
      .maybeSingle();
    throwDb('Could not load profile', error);
    return data;
  }

  let existing = await fetchUserRow();

  const dbRole = normalizeAppRole(existing?.role);
  const effectiveRole: 'seller' | 'agent' = metaRole || dbRole || 'seller';

  if (!existing) {
    if (effectiveRole === 'agent') {
      const { data: agencyData, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          agency_name: meta.agency_name || 'My agency',
          agent_user_id: user.id,
        })
        .select('id')
        .single();

      throwDb('Could not create agency', agencyError);

      const { error: insertError } = await supabase.from('users').insert({
        auth_user_id: user.id,
        email: user.email,
        full_name: (meta.full_name as string) || null,
        phone: (meta.phone as string) || null,
        role: 'agent',
        user_type: 'agent',
        agency_id: agencyData!.id,
      });

      if (insertError?.code === '23505') {
        existing = await fetchUserRow();
      } else {
        throwDb('Could not create profile', insertError);
        return 'agent';
      }
    } else {
      const { error: insertError } = await supabase.from('users').insert({
        auth_user_id: user.id,
        email: user.email,
        full_name: (meta.full_name as string) || null,
        phone: (meta.phone as string) || null,
        contact_preference: (meta.contact_preference as string) || 'email',
        role: 'seller',
        user_type: 'seller',
      });

      if (insertError?.code === '23505') {
        existing = await fetchUserRow();
      } else {
        throwDb('Could not create profile', insertError);
        return 'seller';
      }
    }
  }

  if (!existing) {
    throw new Error('Profile row missing after sign-in. Check database triggers and RLS policies on public.users.');
  }

  const updates: Record<string, unknown> = {};
  if (user.email && existing.email !== user.email) updates.email = user.email;
  if (meta.full_name && !existing.full_name) updates.full_name = meta.full_name;
  if (meta.phone && !existing.phone) updates.phone = meta.phone;
  if (meta.contact_preference && !existing.contact_preference) {
    updates.contact_preference = meta.contact_preference;
  }
  if (metaRole && normalizeAppRole(existing.role) !== metaRole) updates.role = metaRole;
  if (metaRole && !existing.user_type) updates.user_type = metaRole;

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await supabase.from('users').update(updates).eq('id', existing.id);
    throwDb('Could not update profile', updErr);
  }

  const isAgent = effectiveRole === 'agent' || normalizeAppRole(existing.role) === 'agent';
  if (isAgent) {
    const { data: agency, error: agencySelErr } = await supabase
      .from('agencies')
      .select('id')
      .eq('agent_user_id', user.id)
      .maybeSingle();

    throwDb('Could not load agency', agencySelErr);

    if (!agency) {
      const { data: created, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          agency_name: (meta.agency_name as string) || 'My agency',
          agent_user_id: user.id,
        })
        .select('id')
        .single();

      throwDb('Could not create agency', agencyError);

      const { error: linkErr } = await supabase
        .from('users')
        .update({ agency_id: created!.id, role: 'agent', user_type: 'agent' })
        .eq('auth_user_id', user.id);
      throwDb('Could not link agency', linkErr);
    } else if (!existing.agency_id) {
      const { error: linkErr } = await supabase
        .from('users')
        .update({ agency_id: agency.id })
        .eq('auth_user_id', user.id);
      throwDb('Could not link agency', linkErr);
    }
    return 'agent';
  }

  return 'seller';
}
