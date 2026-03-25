import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

const AUTH_CALLBACK = 'https://homesalesready.com/auth/callback';

export { AUTH_CALLBACK };

/**
 * After magic-link login, ensure public.users exists and (for agents) an agencies row
 * is linked via users.agency_id. Handles rows pre-created by DB triggers.
 */
export async function ensureUserProfile(user: User): Promise<'seller' | 'agent'> {
  const meta = user.user_metadata || {};
  const metaRole = meta.role === 'agent' ? 'agent' : meta.role === 'seller' ? 'seller' : null;

  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const effectiveRole: 'seller' | 'agent' =
    metaRole ||
    (existing?.role === 'agent' ? 'agent' : existing?.role === 'seller' ? 'seller' : null) ||
    'seller';

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

      if (agencyError) throw agencyError;

      const { error: insertError } = await supabase.from('users').insert({
        auth_user_id: user.id,
        email: user.email,
        full_name: (meta.full_name as string) || null,
        phone: (meta.phone as string) || null,
        role: 'agent',
        user_type: 'agent',
        agency_id: agencyData.id,
      });
      if (insertError) throw insertError;
      return 'agent';
    }

    const { error: insertError } = await supabase.from('users').insert({
      auth_user_id: user.id,
      email: user.email,
      full_name: (meta.full_name as string) || null,
      phone: (meta.phone as string) || null,
      contact_preference: (meta.contact_preference as string) || 'email',
      role: 'seller',
      user_type: 'seller',
    });
    if (insertError) throw insertError;
    return 'seller';
  }

  const updates: Record<string, unknown> = {};
  if (user.email && existing.email !== user.email) updates.email = user.email;
  if (meta.full_name && !existing.full_name) updates.full_name = meta.full_name;
  if (meta.phone && !existing.phone) updates.phone = meta.phone;
  if (meta.contact_preference && !existing.contact_preference) {
    updates.contact_preference = meta.contact_preference;
  }
  if (metaRole && existing.role !== metaRole) updates.role = metaRole;
  if (metaRole && !existing.user_type) updates.user_type = metaRole;

  if (Object.keys(updates).length > 0) {
    await supabase.from('users').update(updates).eq('id', existing.id);
  }

  const isAgent = effectiveRole === 'agent' || existing.role === 'agent';
  if (isAgent) {
    const { data: agency } = await supabase
      .from('agencies')
      .select('id')
      .eq('agent_user_id', user.id)
      .maybeSingle();

    if (!agency) {
      const { data: created, error: agencyError } = await supabase
        .from('agencies')
        .insert({
          agency_name: (meta.agency_name as string) || 'My agency',
          agent_user_id: user.id,
        })
        .select('id')
        .single();

      if (agencyError) throw agencyError;

      await supabase
        .from('users')
        .update({ agency_id: created.id, role: 'agent', user_type: 'agent' })
        .eq('auth_user_id', user.id);
    } else if (!existing.agency_id) {
      await supabase.from('users').update({ agency_id: agency.id }).eq('auth_user_id', user.id);
    }
    return 'agent';
  }

  return 'seller';
}
