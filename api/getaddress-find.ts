import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Proxies GetAddress.io find requests so the API key stays server-side and CORS is avoided.
 * Set GETADDRESS_API_KEY or VITE_GETADDRESS_API_KEY in Vercel environment variables.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const raw =
    typeof req.query.postcode === 'string'
      ? req.query.postcode
      : typeof (req.body as { postcode?: string } | undefined)?.postcode === 'string'
        ? (req.body as { postcode: string }).postcode
        : '';

  const postcode = raw.trim();
  if (!postcode) {
    res.status(400).json({ error: 'Missing postcode' });
    return;
  }

  const apiKey = process.env.GETADDRESS_API_KEY || process.env.VITE_GETADDRESS_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Address lookup is not configured on the server' });
    return;
  }

  const clean = postcode.replace(/\s+/g, '').toUpperCase();
  const url = `https://api.getaddress.io/find/${encodeURIComponent(clean)}?api-key=${encodeURIComponent(apiKey)}&expand=true`;

  try {
    const upstream = await fetch(url);
    const data = (await upstream.json()) as { Message?: string; message?: string; addresses?: unknown[] };

    if (!upstream.ok) {
      res.status(upstream.status).json({
        error: data.Message || data.message || 'Postcode lookup failed',
        addresses: [],
      });
      return;
    }

    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Lookup failed';
    res.status(500).json({ error: message });
  }
}
