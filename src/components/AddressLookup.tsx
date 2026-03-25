import React, { useState } from 'react';
import { Button } from './ui/Button';

interface AddressLookupProps {
  postcode: string;
  onPostcodeChange: (val: string) => void;
  onAddressSelect: (address: {
    line1: string;
    line2: string;
    town: string;
    county: string;
    postcode: string;
  }) => void;
  disabled?: boolean;
}

export function AddressLookup({ postcode, onPostcodeChange, onAddressSelect, disabled }: AddressLookupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<any[]>([]);

  const handleLookup = async () => {
    if (!postcode) {
      setError('Please enter a postcode');
      return;
    }
    setLoading(true);
    setError('');
    setOptions([]);

    const clean = postcode.replace(/\s+/g, '').toUpperCase();

    try {
      // Production / Vercel: server proxy avoids CORS and keeps the key off the client.
      let response = await fetch(`/api/getaddress-find?postcode=${encodeURIComponent(clean)}`);

      // Local Vite (no /api route): call GetAddress directly if key is in env (domain must be allowlisted on GetAddress for browser use).
      if (!response.ok && import.meta.env.DEV) {
        const apiKey = import.meta.env.VITE_GETADDRESS_API_KEY || '';
        if (apiKey) {
          response = await fetch(
            `https://api.getaddress.io/find/${encodeURIComponent(clean)}?api-key=${encodeURIComponent(apiKey)}&expand=true`
          );
        }
      }

      let data: { addresses?: unknown[]; error?: string; Message?: string } = {};
      try {
        data = (await response.json()) as typeof data;
      } catch {
        if (!response.ok) {
          throw new Error('Address lookup unavailable. Try again after deploy or check server configuration.');
        }
        throw new Error('Invalid response from address service');
      }

      if (!response.ok) {
        throw new Error(data.error || data.Message || 'Postcode lookup failed');
      }

      if (!data.addresses || data.addresses.length === 0) {
        throw new Error('No addresses found for this postcode');
      }

      setOptions(data.addresses);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Postcode not found.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <input
          className="flex-1 min-w-0 uppercase tracking-widest font-semibold"
          placeholder="E.G. SW1A 1AA"
          value={postcode}
          onChange={(e) => onPostcodeChange(e.target.value.toUpperCase())}
          disabled={disabled}
        />
        <Button 
          variant="primary" 
          onClick={handleLookup}
          disabled={loading || disabled}
          className="h-16 px-8 rounded-2xl whitespace-nowrap font-semibold"
        >
          {loading ? 'Finding...' : 'Find Address'}
        </Button>
      </div>
      {error && <p className="text-red-500 text-sm font-bold pl-2">{error}</p>}

      {options.length > 0 && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
          <label className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--teal-900)] flex items-center">
            Select Your Address
          </label>
          <select
            className="w-full cursor-pointer"
            onChange={(e) => {
              const selectedIndex = parseInt(e.target.value, 10);
              const addr = options[selectedIndex] as {
                line_1?: string;
                line_2?: string;
                town_or_city?: string;
                county?: string;
                postcode?: string;
                formatted_address?: (string | null | undefined)[];
              };
              if (addr) {
                onAddressSelect({
                  line1: addr.line_1 || '',
                  line2: addr.line_2 || '',
                  town: addr.town_or_city || '',
                  county: addr.county || '',
                  postcode: (addr.postcode || postcode).replace(/\s+/g, ' ').trim().toUpperCase(),
                });
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>-- Choose an address from the list --</option>
            {options.map((addr: { formatted_address?: (string | null | undefined)[] }, idx: number) => (
              <option key={idx} value={idx}>
                {Array.isArray(addr.formatted_address) ? addr.formatted_address.filter(Boolean).join(', ') : `Address ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
