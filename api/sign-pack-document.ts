import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * Returns a 24h signed URL for a document when the request includes a valid active share token.
 * Requires SUPABASE_SERVICE_ROLE_KEY on Vercel (not exposed to the browser).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const { token, documentId } = (req.body || {}) as { token?: string; documentId?: string };

  if (!url || !serviceKey || !token || !documentId) {
    res.status(400).json({ error: 'Missing configuration or parameters' });
    return;
  }

  const admin = createClient(url, serviceKey);

  const { data: share, error: shareErr } = await admin
    .from('shares')
    .select('property_id, active')
    .eq('token', token)
    .eq('active', true)
    .maybeSingle();

  if (shareErr || !share?.property_id) {
    res.status(403).json({ error: 'Invalid or inactive share link' });
    return;
  }

  const { data: doc, error: docErr } = await admin
    .from('documents')
    .select('property_id, file_url')
    .eq('id', documentId)
    .maybeSingle();

  if (docErr || !doc || doc.property_id !== share.property_id || !doc.file_url) {
    res.status(403).json({ error: 'Document not found' });
    return;
  }

  const { data: signed, error: signErr } = await admin.storage
    .from('property-documents')
    .createSignedUrl(doc.file_url, 60 * 60 * 24);

  if (signErr || !signed?.signedUrl) {
    res.status(500).json({ error: 'Could not create download link' });
    return;
  }

  res.status(200).json({ url: signed.signedUrl });
}
