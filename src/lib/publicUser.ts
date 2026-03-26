import { supabase } from './supabase';

export async function getPublicUserIdByAuthUserId(authUserId: string): Promise<string> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .eq('auth_user_id', authUserId)
    .single();

  if (error || !data?.id) {
    throw new Error(error?.message || 'Could not resolve public user id.');
  }

  return data.id;
}
