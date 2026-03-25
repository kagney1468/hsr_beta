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

/** Auth callback + DB errors (PostgREST, RLS, network) — always show a useful string. */
export function formatCallbackError(err: unknown): string {
  if (err == null) return 'Something went wrong.';
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const e = err as {
      message: string;
      code?: string;
      details?: string;
      hint?: string;
      status?: number;
    };
    const bits = [e.message];
    if (e.code) bits.push(`code: ${e.code}`);
    if (e.details) bits.push(e.details);
    if (e.hint) bits.push(`hint: ${e.hint}`);
    if (e.status) bits.push(`status: ${e.status}`);
    return bits.filter(Boolean).join(' — ');
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
