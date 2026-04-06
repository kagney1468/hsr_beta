import { useState } from 'react';
import { Button } from './ui/Button';

export interface AddressData {
  address_line1: string;
  address_line2: string;
  address_town: string;
  address_county: string;
  address_city: string;
  address_postcode: string;
}

interface PostcodeLookupProps {
  onAddressSelect: (address: AddressData) => void;
}

type LookupState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const UK_POSTCODE_REGEX = /^[A-Z]{1,2}[0-9][0-9A-Z]?\s?[0-9][A-Z]{2}$/i;

const EMPTY_ADDRESS: AddressData = {
  address_line1: '',
  address_line2: '',
  address_town: '',
  address_county: '',
  address_city: '',
  address_postcode: '',
};

export default function PostcodeLookup({ onAddressSelect }: PostcodeLookupProps) {
  const [postcode, setPostcode] = useState('');
  const [postcodeError, setPostcodeError] = useState<string | null>(null);
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [address, setAddress] = useState<AddressData>(EMPTY_ADDRESS);

  const handlePostcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPostcode(e.target.value);
    setPostcodeError(null);
    // Reset if user edits the postcode after a lookup
    if (lookupState !== 'idle') {
      setLookupState('idle');
      setAddress(EMPTY_ADDRESS);
    }
  };

  const handleLookup = async () => {
    const trimmed = postcode.trim().toUpperCase();

    if (!UK_POSTCODE_REGEX.test(trimmed)) {
      setPostcodeError('Please enter a valid UK postcode, e.g. SW1A 1AA');
      return;
    }

    setPostcodeError(null);
    setLookupState('loading');

    try {
      const encoded = encodeURIComponent(trimmed);
      const res = await fetch(`https://api.postcodes.io/postcodes/${encoded}`);

      if (res.status === 404) {
        // Valid format but no match — show manual fallback
        setAddress({ ...EMPTY_ADDRESS, address_postcode: trimmed });
        setLookupState('not_found');
        return;
      }

      if (!res.ok) {
        setLookupState('error');
        return;
      }

      const json = await res.json();
      const result = json.result;

      // Map API fields to our address shape
      const prefilled: AddressData = {
        address_line1: '',
        address_line2: '',
        address_town: result.admin_district ?? result.parish ?? '',
        address_county: result.admin_county ?? result.region ?? '',
        address_city: '',
        address_postcode: trimmed,
      };

      setAddress(prefilled);
      setLookupState('found');
    } catch {
      setLookupState('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleLookup();
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAddress(prev => {
      const updated = { ...prev, [name]: value };
      // Notify parent on every keystroke so the parent form stays in sync
      onAddressSelect(updated);
      return updated;
    });
  };

  const isAddressComplete =
    address.address_line1.trim() !== '' &&
    address.address_town.trim() !== '' &&
    address.address_postcode.trim() !== '';

  const showAddressForm = lookupState === 'found' || lookupState === 'not_found';

  return (
    <div className="space-y-5">
      {/* Postcode lookup row */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
          Postcode *
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={postcode}
            onChange={handlePostcodeChange}
            onKeyDown={handleKeyDown}
            placeholder="e.g. SW1A 1AA"
            maxLength={8}
            className={`w-48 uppercase tracking-widest font-semibold${postcodeError ? ' border-red-400 focus:border-red-500' : ''}`}
            aria-label="Postcode"
            aria-describedby={postcodeError ? 'postcode-error' : undefined}
          />
          <Button
            type="button"
            variant="primary"
            onClick={handleLookup}
            disabled={lookupState === 'loading' || postcode.trim() === ''}
            className="shrink-0"
          >
            {lookupState === 'loading' ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin mr-1.5">progress_activity</span>
                Looking up…
              </>
            ) : (
              'Find address'
            )}
          </Button>
        </div>

        {postcodeError && (
          <p id="postcode-error" className="text-red-500 text-xs font-semibold">
            {postcodeError}
          </p>
        )}

        {lookupState === 'error' && (
          <p className="text-red-500 text-xs font-semibold">
            Something went wrong with the postcode lookup. Please enter your address below.
          </p>
        )}
      </div>

      {/* Status message after lookup */}
      {lookupState === 'found' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--teal-050)] border border-[#6dd4d4]">
          <span className="material-symbols-outlined text-[var(--teal-600)] text-base shrink-0 mt-0.5">check_circle</span>
          <p className="text-sm text-[var(--teal-900)]">
            Postcode found. We've filled in your town and county — please complete the remaining fields below.
          </p>
        </div>
      )}

      {lookupState === 'not_found' && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <span className="material-symbols-outlined text-amber-600 text-base shrink-0 mt-0.5">info</span>
          <p className="text-sm text-amber-900">
            We couldn't find that postcode automatically — this is common for new builds and rural addresses. Please enter your address below.
          </p>
        </div>
      )}

      {/* Address fields — shown after any lookup attempt */}
      {showAddressForm && (
        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Address Line 1 *
            </label>
            <input
              type="text"
              name="address_line1"
              required
              value={address.address_line1}
              onChange={handleAddressChange}
              placeholder="e.g. 12 Maple Gardens"
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              Address Line 2 (Optional)
            </label>
            <input
              type="text"
              name="address_line2"
              value={address.address_line2}
              onChange={handleAddressChange}
              placeholder="Flat, apartment, or building name"
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                Town *
              </label>
              <input
                type="text"
                name="address_town"
                required
                value={address.address_town}
                onChange={handleAddressChange}
                placeholder="e.g. Bristol"
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                County (Optional)
              </label>
              <input
                type="text"
                name="address_county"
                value={address.address_county}
                onChange={handleAddressChange}
                placeholder="e.g. Somerset"
                className="w-full"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
              City (Optional)
            </label>
            <input
              type="text"
              name="address_city"
              value={address.address_city}
              onChange={handleAddressChange}
              placeholder="e.g. Bristol"
              className="w-full"
            />
          </div>

          {/* Confirm button — fires the callback with the complete address */}
          <Button
            type="button"
            variant={isAddressComplete ? 'primary' : 'secondary'}
            disabled={!isAddressComplete}
            onClick={() => onAddressSelect(address)}
            className="w-full mt-2"
          >
            {isAddressComplete ? (
              <>
                <span className="material-symbols-outlined text-base mr-1.5">check</span>
                Use this address
              </>
            ) : (
              'Complete the required fields above'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
