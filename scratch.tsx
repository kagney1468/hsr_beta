// I will write some React code to handle the API response logic
import { useState } from 'react';

// EPC Interface
interface EPCRow {
  'lmk-key': string;
  address: string;
  'current-energy-rating': string;
  'property-type': string;
  'construction-age-band': string;
  'lodgement-date': string;
}

// Inside Component:
const [epcLoading, setEpcLoading] = useState(false);
const [epcOptions, setEpcOptions] = useState<EPCRow[]>([]);
const [epcStatus, setEpcStatus] = useState<'none' | 'found' | 'not-found' | 'multiple'>('none');
