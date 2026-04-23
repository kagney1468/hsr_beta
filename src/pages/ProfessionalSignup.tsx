import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import Footer from '../components/Footer';

function validatePassword(password: string): string | null {
  if (password.length < 10) return 'Password must be at least 10 characters.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one capital letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character (e.g. ! @ # $).';
  return null;
}

const PROFESSION_OPTIONS = [
  { value: 'solicitor',        label: 'Solicitor',              regBody: 'SRA',   regLabel: 'SRA Number' },
  { value: 'surveyor',         label: 'Surveyor',               regBody: 'RICS',  regLabel: 'RICS Membership Number' },
  { value: 'mortgage_broker',  label: 'Mortgage Broker',        regBody: 'FCA',   regLabel: 'FCA Reference Number' },
  { value: 'lender',           label: 'Lender',                 regBody: 'FCA',   regLabel: 'FCA Reference Number' },
  { value: 'other',            label: 'Other Professional',     regBody: 'Other', regLabel: 'Professional Registration Number' },
];

export default function ProfessionalSignup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [existingFirmName, setExistingFirmName] = useState<string | null>(null);

  const [form, setForm] = useState({
    profession_type: '',
    full_name: '',
    email: '',
    password: '',
    phone: '',
    firm_name: '',
    company_number: '',
    registered_office: '',
    regulatory_number: '',
    confirmed: false,
  });

  const selectedProfession = PROFESSION_OPTIONS.find(p => p.value === form.profession_type);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  // Step 1 — check company number for existing firm
  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.profession_type) { setError('Please select your profession type.'); return; }
    if (!form.full_name.trim()) { setError('Please enter your full name.'); return; }
    if (!form.email.trim()) { setError('Please enter your email address.'); return; }
    const passwordError = validatePassword(form.password);
    if (passwordError) { setError(passwordError); return; }
    if (!form.company_number.trim()) { setError('Please enter your company registration number.'); return; }

    setLoading(true);
    try {
      // Check if a firm with this company number already exists
      const { data: existingFirm } = await supabase
        .from('firms')
        .select('id, firm_name')
        .eq('company_number', form.company_number.trim().toUpperCase())
        .maybeSingle();

      if (existingFirm) {
        setExistingFirmName(existingFirm.firm_name);
        // Pre-fill firm name from existing record
        setForm(prev => ({ ...prev, firm_name: existingFirm.firm_name }));
      }

      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — create account
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.firm_name.trim()) { setError('Please enter your firm name.'); return; }
    if (!form.registered_office.trim()) { setError('Please enter your registered office address.'); return; }
    if (!form.regulatory_number.trim()) { setError(`Please enter your ${selectedProfession?.regLabel || 'registration number'}.`); return; }
    if (!form.confirmed) { setError('Please confirm that your details are accurate.'); return; }

    setLoading(true);
    try {
      // 1. Create auth account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: { data: { full_name: form.full_name.trim() } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Account could not be created. Please try again.');

      // 2. Create firm + user row via security-definer function (bypasses RLS during signup)
      const { error: rpcError } = await supabase.rpc('register_professional', {
        p_auth_user_id:       authData.user.id,
        p_email:              form.email.trim(),
        p_full_name:          form.full_name.trim(),
        p_phone:              form.phone.trim(),
        p_profession_type:    form.profession_type,
        p_regulatory_body:    selectedProfession?.regBody || 'Other',
        p_regulatory_number:  form.regulatory_number.trim(),
        p_firm_name:          form.firm_name.trim(),
        p_company_number:     form.company_number.trim().toUpperCase(),
        p_registered_office:  form.registered_office.trim(),
      });
      if (rpcError) throw rpcError;

      // 3. Redirect
      navigate('/professional/dashboard');

    } catch (err: any) {
      console.error('Professional signup error:', err);
      // Clean up: if auth user was created but users insert failed, surface a clear message
      setError(err.message || 'Sign-up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-[var(--teal-050)] blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-lg space-y-8 relative z-10">

          {/* Brand */}
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-3">
              <span className="material-symbols-outlined text-4xl text-[var(--teal-600)]">home_filled</span>
              <span className="font-heading font-black text-2xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
            </div>
            <h1 className="text-3xl font-black font-heading tracking-tight text-[var(--teal-900)]">
              Professional sign up
            </h1>
            <p className="text-[var(--muted)] text-sm">
              Access property packs for your active transactions — all in one place.
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-3">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-3 flex-1">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step >= s
                    ? 'bg-[var(--teal-600)] text-white'
                    : 'bg-[var(--border)] text-[var(--muted)]'
                }`}>
                  {s}
                </div>
                <span className={`text-xs font-semibold uppercase tracking-widest ${
                  step >= s ? 'text-[var(--teal-900)]' : 'text-[var(--muted)]'
                }`}>
                  {s === 1 ? 'Your details' : 'Firm details'}
                </span>
                {s < 2 && <div className="flex-1 h-px bg-[var(--border)]" />}
              </div>
            ))}
          </div>

          <Card className="p-6 sm:p-8 space-y-6">

            {error && (
              <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold animate-in fade-in slide-in-from-top-2">
                {error}
              </div>
            )}

            {step === 1 ? (
              <form onSubmit={handleStep1} className="space-y-5">
                <div className="space-y-1 pb-2 border-b border-[var(--border)]">
                  <h2 className="text-base font-black font-heading text-[var(--teal-900)]">Your details</h2>
                  <p className="text-xs text-[var(--muted)]">Tell us about yourself and your firm.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Profession type <span className="text-[#dc2626]">*</span>
                  </label>
                  <select name="profession_type" value={form.profession_type} onChange={handleChange} className="w-full" required>
                    <option value="">Select your profession…</option>
                    {PROFESSION_OPTIONS.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                      Full name <span className="text-[#dc2626]">*</span>
                    </label>
                    <input type="text" name="full_name" value={form.full_name} onChange={handleChange} className="w-full" placeholder="Jane Smith" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                      Phone number
                    </label>
                    <input type="tel" name="phone" value={form.phone} onChange={handleChange} className="w-full" placeholder="07123 456 789" />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Email address <span className="text-[#dc2626]">*</span>
                  </label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} className="w-full" placeholder="jane@smithsolicitors.co.uk" required />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Password <span className="text-[#dc2626]">*</span>
                  </label>
                  <input type="password" name="password" value={form.password} onChange={handleChange} className="w-full" placeholder="Create a password" required minLength={10} />
                  <p className="text-[11px] text-[var(--muted)] leading-relaxed">
                    Must be at least 10 characters and include one capital letter, one number, and one special character (e.g. ! @ # $).
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Company registration number <span className="text-[#dc2626]">*</span>
                  </label>
                  <input type="text" name="company_number" value={form.company_number} onChange={handleChange} className="w-full" placeholder="e.g. 12345678" required />
                  <p className="text-[11px] text-[var(--muted)]">
                    Your Companies House registration number. This links your account to your firm.
                  </p>
                </div>

                <Button type="submit" variant="primary" className="w-full h-14 rounded-2xl font-heading font-bold text-lg" disabled={loading}>
                  {loading ? 'Checking…' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1 pb-2 border-b border-[var(--border)]">
                  <h2 className="text-base font-black font-heading text-[var(--teal-900)]">Firm details</h2>
                  <p className="text-xs text-[var(--muted)]">
                    {existingFirmName
                      ? `We found an existing account for this company number — you'll be joining ${existingFirmName}.`
                      : 'Tell us about your firm. This information is used to identify you in property pack records.'}
                  </p>
                </div>

                {existingFirmName && (
                  <div className="p-4 bg-[var(--teal-050)] border border-[var(--border)] rounded-xl flex items-center gap-3">
                    <span className="material-symbols-outlined text-[var(--teal-600)]">corporate_fare</span>
                    <div>
                      <p className="text-xs font-bold text-[var(--teal-900)] uppercase tracking-widest">Joining existing firm</p>
                      <p className="text-sm font-semibold text-[var(--teal-900)]">{existingFirmName}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Firm / company name <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="firm_name"
                    value={form.firm_name}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g. Smith &amp; Co Solicitors"
                    readOnly={!!existingFirmName}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    Registered office address <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="registered_office"
                    value={form.registered_office}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="e.g. 1 High Street, London, EC1A 1BB"
                    readOnly={!!existingFirmName}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">
                    {selectedProfession?.regLabel || 'Registration number'} <span className="text-[#dc2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="regulatory_number"
                    value={form.regulatory_number}
                    onChange={handleChange}
                    className="w-full"
                    placeholder={`Your ${selectedProfession?.regBody || ''} number`}
                    required
                  />
                  <p className="text-[11px] text-[var(--muted)]">
                    This is stored against your account and displayed in property pack records.
                  </p>
                </div>

                <div className="p-4 bg-[var(--page)] border border-[var(--border)] rounded-xl space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="confirmed"
                      checked={form.confirmed}
                      onChange={handleChange}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="text-xs text-[var(--muted)] leading-relaxed">
                      I confirm that the details I have provided above are accurate. I understand that HomeSalesReady does not verify registration numbers and that I take full responsibility for the accuracy of the information submitted.
                    </span>
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 px-6 rounded-xl font-bold"
                    onClick={() => { setStep(1); setError(null); }}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    className="flex-1 h-12 rounded-xl font-heading font-bold text-base"
                    disabled={loading}
                  >
                    {loading ? 'Creating account…' : 'Create account'}
                  </Button>
                </div>
              </form>
            )}

          </Card>

          <div className="text-center">
            <p className="text-[var(--muted)] text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-[var(--teal-600)] font-semibold hover:underline">Log in</Link>
            </p>
          </div>

        </div>
      </div>
      <Footer />
    </div>
  );
}
