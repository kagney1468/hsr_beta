/** Surface Supabase AuthApiError details in the UI for debugging. */
export function formatAuthError(err: unknown): string {
  if (err == null) return 'Something went wrong.';
  if (typeof err === 'object' && 'message' in err) {
    const e = err as { message: string; code?: string; status?: number; name?: string };
    const bits = [e.message];
    if (e.code) bits.push(`code: ${e.code}`);
    if (e.status) bits.push(`status: ${e.status}`);
    return bits.join(' — ');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
