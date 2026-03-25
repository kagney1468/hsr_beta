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
    
    try {
      const apiKey = import.meta.env.VITE_GETADDRESS_API_KEY || '';
      if (!apiKey) throw new Error('Missing GetAddress.io API Key in environment variables');

      const response = await fetch(`https://api.getaddress.io/find/${postcode.replace(/\s+/g, '')}?api-key=${apiKey}&expand=true`);
      const data = await response.json();
      
      if (response.status !== 200 || !data.addresses || data.addresses.length === 0) {
        throw new Error('No addresses found for this postcode');
      }
      
      setOptions(data.addresses);
    } catch (err: any) {
      setError(err.message || 'Postcode not found.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4">
        <input 
          className="flex-1 h-16 px-6 rounded-2xl border border-[var(--border)] bg-white text-[var(--teal-900)] focus:border-[var(--teal-500)] outline-none transition-colors text-xl font-semibold tracking-widest uppercase placeholder:text-[var(--muted)]"
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
            className="w-full h-16 px-6 rounded-2xl border border-[var(--border)] bg-white text-[var(--text)] focus:border-[var(--teal-500)] outline-none transition-colors cursor-pointer"
            onChange={(e) => {
              const selectedIndex = parseInt(e.target.value);
              const addr = options[selectedIndex];
              if (addr) {
                onAddressSelect({
                  line1: addr.line_1,
                  line2: addr.line_2,
                  town: addr.town_or_city,
                  county: addr.county,
                  postcode: postcode.toUpperCase()
                });
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>-- Choose an address from the list --</option>
            {options.map((addr, idx) => (
              <option key={idx} value={idx}>{addr.formatted_address.filter(Boolean).join(', ')}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
