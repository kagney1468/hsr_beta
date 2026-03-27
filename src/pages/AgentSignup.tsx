import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';
import { formatAuthError } from '../lib/authErrors';

// ── Types ───────────────────────────────────────────────────────────────────

interface FirmData {
  agencyName: string;
  addressLine1: string;
  addressLine2: string;
  town: string;
  county: string;
  postcode: string;
  phone: string;
  email: string;
  companyRegNumber: string;
  vatNumber: string;
  naeaNumber: string;
}

interface SignatoryData {
  fullName: string;
  jobTitle: string;
  isAuthorised: boolean;
}

interface TermsData {
  agreedToS: boolean;
  agreedDpa: boolean;
  confirmedAccuracy: boolean;
  signatureName: string;
}

const JOB_TITLES = ['Director', 'Partner', 'Authorised Representative'];

// ── Step progress indicator ──────────────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Firm Details' },
  { n: 2, label: 'Authorised Signatory' },
  { n: 3, label: 'Terms & Agreement' },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.n}>
          <div className="flex flex-col items-center gap-1.5">
            <div className={`size-9 rounded-full flex items-center justify-center font-black font-heading text-sm transition-all ${
              step.n < current
                ? 'bg-[var(--teal-600)] text-white'
                : step.n === current
                ? 'bg-[var(--teal-900)] text-white ring-4 ring-[var(--teal-050)]'
                : 'bg-[var(--teal-050)] border border-[var(--border)] text-[var(--muted)]'
            }`}>
              {step.n < current
                ? <span className="material-symbols-outlined text-[16px]">check</span>
                : step.n}
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-widest whitespace-nowrap ${
              step.n === current ? 'text-[var(--teal-900)]' : 'text-[var(--muted)]'
            }`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`h-0.5 w-16 mx-1 mb-5 rounded-full transition-all ${
              step.n < current ? 'bg-[var(--teal-600)]' : 'bg-[var(--border)]'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Field helper ─────────────────────────────────────────────────────────────

function Field({
  label,
  required,
  optional,
  recommended,
  children,
}: {
  label: string;
  required?: boolean;
  optional?: boolean;
  recommended?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
        {label}
        {required && <span className="text-red-500">*</span>}
        {optional && <span className="text-[9px] font-medium normal-case tracking-normal text-[var(--muted)] border border-[var(--border)] rounded px-1.5 py-0.5">Optional</span>}
        {recommended && <span className="text-[9px] font-medium normal-case tracking-normal text-amber-600 border border-amber-200 bg-amber-50 rounded px-1.5 py-0.5">Recommended</span>}
      </label>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AgentSignup() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [firm, setFirm] = useState<FirmData>({
    agencyName: '',
    addressLine1: '',
    addressLine2: '',
    town: '',
    county: '',
    postcode: '',
    phone: '',
    email: '',
    companyRegNumber: '',
    vatNumber: '',
    naeaNumber: '',
  });

  const [signatory, setSignatory] = useState<SignatoryData>({
    fullName: '',
    jobTitle: 'Director',
    isAuthorised: false,
  });

  const [terms, setTerms] = useState<TermsData>({
    agreedToS: false,
    agreedDpa: false,
    confirmedAccuracy: false,
    signatureName: '',
  });

  const setFirmField = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFirm(f => ({ ...f, [e.target.name]: e.target.value }));

  const setSignatoryField = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setSignatory(s => ({ ...s, [e.target.name]: e.target.value }));

  // ── Step validation ─────────────────────────────────────────────────────

  function validateStep1(): string | null {
    if (!firm.agencyName.trim()) return 'Agency/firm name is required.';
    if (!firm.addressLine1.trim()) return 'Trading address line 1 is required.';
    if (!firm.town.trim()) return 'Town is required.';
    if (!firm.postcode.trim()) return 'Postcode is required.';
    if (!firm.phone.trim()) return 'Main telephone number is required.';
    if (!firm.email.trim()) return 'Main email address is required.';
    if (!firm.companyRegNumber.trim()) return 'Company registration number is required.';
    return null;
  }

  function validateStep2(): string | null {
    if (!signatory.fullName.trim()) return 'Full name is required.';
    if (!JOB_TITLES.includes(signatory.jobTitle)) return 'Please select a valid job title.';
    if (!signatory.isAuthorised) return 'You must confirm you are authorised to enter into agreements on behalf of the firm.';
    return null;
  }

  function handleStep1Next(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(null);
    setStep(2);
  }

  function handleStep2Next(e: React.FormEvent) {
    e.preventDefault();
    const err = validateStep2();
    if (err) { setError(err); return; }
    setError(null);
    setStep(3);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!terms.agreedToS || !terms.agreedDpa || !terms.confirmedAccuracy) {
      setError('Please tick all three required boxes before signing.');
      return;
    }
    if (!terms.signatureName.trim()) {
      setError('Please type your full name as your electronic signature.');
      return;
    }

    setLoading(true);
    setError(null);

    const now = new Date().toISOString();

    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: firm.email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          shouldCreateUser: true,
          data: {
            // core identity
            full_name: signatory.fullName,
            agency_name: firm.agencyName,
            phone: firm.phone,
            role: 'agent',
            // firm details
            trading_address_line1: firm.addressLine1,
            trading_address_line2: firm.addressLine2 || null,
            trading_address_town: firm.town,
            trading_address_county: firm.county || null,
            trading_address_postcode: firm.postcode,
            company_registration_number: firm.companyRegNumber,
            vat_number: firm.vatNumber || null,
            naea_number: firm.naeaNumber || null,
            // signatory
            authorised_signatory_name: signatory.fullName,
            authorised_signatory_title: signatory.jobTitle,
            // terms
            terms_agreed: true,
            terms_agreed_at: now,
            terms_version: 'v1.0',
            dpa_agreed: true,
            dpa_agreed_at: now,
          },
        },
      });

      if (otpError) throw otpError;
      setSuccess(true);
    } catch (err: unknown) {
      console.error('Agent signup error:', err);
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  const termsAllTicked = terms.agreedToS && terms.agreedDpa && terms.confirmedAccuracy;
  const canSign = termsAllTicked && terms.signatureName.trim().length > 0;

  // ── Success screen ──────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-10 text-center space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">verified</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Application submitted</h2>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            Your firm registration has been recorded. We've sent a secure sign-in link to{' '}
            <strong className="text-[var(--teal-900)]">{firm.email}</strong>.
          </p>
          <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-left space-y-2">
            <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Agreement summary</p>
            <p className="text-sm text-[var(--text)]"><strong>{signatory.fullName}</strong> ({signatory.jobTitle})</p>
            <p className="text-sm text-[var(--text)]">Terms of Service v1.0 — agreed</p>
            <p className="text-sm text-[var(--text)]">Data Processing Agreement — agreed</p>
            <p className="text-[11px] text-[var(--muted)]">Recorded at {new Date().toLocaleString('en-GB')}</p>
          </div>
          <Button variant="primary" className="w-full h-12 rounded-xl" onClick={() => navigate('/login')}>
            Return to Login
          </Button>
        </Card>
      </div>
    );
  }

  // ── Layout wrapper ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-start py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[var(--teal-050)] blur-[140px] rounded-full pointer-events-none opacity-60" />

      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Brand */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-[var(--teal-600)] mb-3">
            <span className="material-symbols-outlined text-3xl">home_filled</span>
            <span className="font-heading font-black text-xl tracking-tight text-[var(--teal-900)]">HomeSalesReady</span>
          </div>
          <h1 className="text-4xl font-black font-heading text-[var(--teal-900)] tracking-tight">Agent registration</h1>
          <p className="text-[var(--muted)] text-sm">Register your firm to manage property packs for your sellers.</p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Error banner */}
        {error && (
          <div className="p-4 bg-[#fee2e2] border border-[#fecaca] text-[#b91c1c] rounded-xl text-sm font-semibold animate-in fade-in duration-200">
            {error}
          </div>
        )}

        {/* ── STEP 1: FIRM DETAILS ─────────────────────────────────── */}
        {step === 1 && (
          <Card className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">Firm Details</h2>
              <p className="text-sm text-[var(--muted)] mt-1">Enter the registered details of your estate agency firm.</p>
            </div>

            <form onSubmit={handleStep1Next} className="space-y-5">
              <Field label="Agency / Firm Name" required>
                <input type="text" name="agencyName" required value={firm.agencyName} onChange={setFirmField} className="w-full" placeholder="e.g. Hargreaves & Co Estate Agents" />
              </Field>

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-4">Trading Address</p>
                <div className="space-y-4">
                  <Field label="Address Line 1" required>
                    <input type="text" name="addressLine1" required value={firm.addressLine1} onChange={setFirmField} className="w-full" placeholder="e.g. 24 High Street" />
                  </Field>
                  <Field label="Address Line 2" optional>
                    <input type="text" name="addressLine2" value={firm.addressLine2} onChange={setFirmField} className="w-full" placeholder="Suite, building, floor…" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Town" required>
                      <input type="text" name="town" required value={firm.town} onChange={setFirmField} className="w-full" placeholder="e.g. Bristol" />
                    </Field>
                    <Field label="County" optional>
                      <input type="text" name="county" value={firm.county} onChange={setFirmField} className="w-full" placeholder="e.g. Somerset" />
                    </Field>
                  </div>
                  <Field label="Postcode" required>
                    <input type="text" name="postcode" required value={firm.postcode} onChange={setFirmField} className="w-full uppercase" placeholder="e.g. BS1 5TR" />
                  </Field>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-4">Contact Information</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Main Telephone" required>
                      <input type="tel" name="phone" required value={firm.phone} onChange={setFirmField} className="w-full" placeholder="01234 567890" />
                    </Field>
                    <Field label="Main Email Address" required>
                      <input type="email" name="email" required value={firm.email} onChange={setFirmField} className="w-full" placeholder="info@youragency.com" />
                    </Field>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border)]">
                <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest mb-4">Registration & Membership</p>
                <div className="space-y-4">
                  <Field label="Company Registration Number" required>
                    <input type="text" name="companyRegNumber" required value={firm.companyRegNumber} onChange={setFirmField} className="w-full font-mono" placeholder="e.g. 12345678" />
                    <p className="text-[10px] text-[var(--muted)] mt-1">Find this on Companies House at companies-house.service.gov.uk</p>
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="VAT Number" optional>
                      <input type="text" name="vatNumber" value={firm.vatNumber} onChange={setFirmField} className="w-full font-mono" placeholder="GB123456789" />
                    </Field>
                    <Field label="NAEA / ARLA Number" recommended>
                      <input type="text" name="naeaNumber" value={firm.naeaNumber} onChange={setFirmField} className="w-full font-mono" placeholder="e.g. N012345" />
                    </Field>
                  </div>
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full h-14 rounded-2xl font-black font-heading text-base mt-2">
                Continue to Step 2
                <span className="material-symbols-outlined text-[18px] ml-2">arrow_forward</span>
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-[var(--muted)]">
                Already registered? <Link to="/login" className="text-[var(--teal-600)] font-semibold hover:underline">Log in here</Link>
              </p>
            </div>
          </Card>
        )}

        {/* ── STEP 2: AUTHORISED SIGNATORY ────────────────────────── */}
        {step === 2 && (
          <Card className="p-8 space-y-6">
            <div>
              <h2 className="text-xl font-black font-heading text-[var(--teal-900)]">Authorised Signatory</h2>
              <p className="text-sm text-[var(--muted)] mt-1">
                The person agreeing to terms must be authorised to bind <strong>{firm.agencyName}</strong> to agreements.
              </p>
            </div>

            <form onSubmit={handleStep2Next} className="space-y-5">
              <Field label="Full Name" required>
                <input
                  type="text"
                  name="fullName"
                  required
                  value={signatory.fullName}
                  onChange={setSignatoryField}
                  className="w-full"
                  placeholder="e.g. James Hargreaves"
                />
              </Field>

              <Field label="Job Title" required>
                <select
                  name="jobTitle"
                  value={signatory.jobTitle}
                  onChange={setSignatoryField}
                  className="w-full"
                >
                  {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <p className="text-[10px] text-[var(--muted)] mt-1">
                  Must be a Director, Partner, or formally appointed Authorised Representative of the firm.
                </p>
              </Field>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                signatory.isAuthorised
                  ? 'bg-[var(--teal-050)] border-[var(--teal-600)]/30'
                  : 'bg-white border-[var(--border)] hover:border-[var(--teal-500)]/40'
              }`}>
                <input
                  type="checkbox"
                  checked={signatory.isAuthorised}
                  onChange={e => setSignatory(s => ({ ...s, isAuthorised: e.target.checked }))}
                  className="mt-0.5 size-4 accent-[var(--teal-600)] shrink-0"
                />
                <span className="text-sm text-[var(--text)] leading-relaxed">
                  I confirm I am authorised to enter into agreements on behalf of{' '}
                  <strong className="text-[var(--teal-900)]">{firm.agencyName || 'the firm'}</strong> and that the information provided is true and accurate.
                </span>
              </label>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setError(null); setStep(1); }}
                  className="h-14 px-6 rounded-2xl font-bold border-[var(--border)]"
                >
                  <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
                  Back
                </Button>
                <Button type="submit" variant="primary" className="flex-1 h-14 rounded-2xl font-black font-heading text-base">
                  Continue to Terms
                  <span className="material-symbols-outlined text-[18px] ml-2">arrow_forward</span>
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* ── STEP 3: TERMS & AGREEMENT ────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Terms of Service */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[var(--teal-600)]">gavel</span>
                </div>
                <div>
                  <h3 className="font-black font-heading text-[var(--teal-900)]">Terms of Service</h3>
                  <Link to="/terms-of-service" target="_blank" className="text-[10px] text-[var(--teal-600)] font-bold uppercase tracking-widest hover:underline">
                    Read full Terms →
                  </Link>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-sm text-[var(--text)] space-y-2 leading-relaxed">
                <p>By agreeing you confirm that: your firm will use HomeSalesReady solely for legitimate property transaction purposes; you will not misuse the platform or share access credentials; you accept responsibility for your sellers' use of the platform; HomeSalesReady may terminate access for breach of these terms.</p>
              </div>
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                terms.agreedToS ? 'bg-[var(--teal-050)] border-[var(--teal-600)]/30' : 'border-[var(--border)] hover:border-[var(--teal-500)]/40'
              }`}>
                <input
                  type="checkbox"
                  checked={terms.agreedToS}
                  onChange={e => setTerms(t => ({ ...t, agreedToS: e.target.checked }))}
                  className="mt-0.5 size-4 accent-[var(--teal-600)] shrink-0"
                />
                <span className="text-sm text-[var(--text)]">
                  <strong>I have read and agree to the Terms of Service</strong>
                </span>
              </label>
            </Card>

            {/* DPA */}
            <Card className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-[var(--teal-600)]">shield</span>
                </div>
                <div>
                  <h3 className="font-black font-heading text-[var(--teal-900)]">Data Processing Agreement</h3>
                  <Link to="/dpa" target="_blank" className="text-[10px] text-[var(--teal-600)] font-bold uppercase tracking-widest hover:underline">
                    Read full DPA →
                  </Link>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-sm text-[var(--text)] space-y-2 leading-relaxed">
                <p>HomeSalesReady acts as a data processor on behalf of your firm. Seller and buyer personal data is stored on UK-based servers. We process data solely for the purposes of creating property packs. You retain ownership of all client data and may request deletion at any time. We are GDPR compliant and maintain ISO 27001 security standards.</p>
              </div>
              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                terms.agreedDpa ? 'bg-[var(--teal-050)] border-[var(--teal-600)]/30' : 'border-[var(--border)] hover:border-[var(--teal-500)]/40'
              }`}>
                <input
                  type="checkbox"
                  checked={terms.agreedDpa}
                  onChange={e => setTerms(t => ({ ...t, agreedDpa: e.target.checked }))}
                  className="mt-0.5 size-4 accent-[var(--teal-600)] shrink-0"
                />
                <span className="text-sm text-[var(--text)]">
                  <strong>I have read and agree to the Data Processing Agreement</strong>
                </span>
              </label>
            </Card>

            {/* Accuracy confirmation + signature */}
            <Card className="p-6 space-y-5">
              <div>
                <h3 className="font-black font-heading text-[var(--teal-900)]">Electronic Signature</h3>
                <p className="text-sm text-[var(--muted)] mt-1">
                  Signing on behalf of <strong>{firm.agencyName}</strong> as {signatory.jobTitle}.
                </p>
              </div>

              <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                terms.confirmedAccuracy ? 'bg-[var(--teal-050)] border-[var(--teal-600)]/30' : 'border-[var(--border)] hover:border-[var(--teal-500)]/40'
              }`}>
                <input
                  type="checkbox"
                  checked={terms.confirmedAccuracy}
                  onChange={e => setTerms(t => ({ ...t, confirmedAccuracy: e.target.checked }))}
                  className="mt-0.5 size-4 accent-[var(--teal-600)] shrink-0"
                />
                <span className="text-sm text-[var(--text)]">
                  <strong>I confirm the information provided is accurate and complete</strong>, and I am authorised to sign on behalf of {firm.agencyName}.
                </span>
              </label>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)]">
                  Type your full name to sign electronically <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={terms.signatureName}
                  onChange={e => setTerms(t => ({ ...t, signatureName: e.target.value }))}
                  className={`w-full font-heading font-black text-lg transition-all ${
                    terms.signatureName ? 'border-[var(--teal-600)]/50' : ''
                  }`}
                  placeholder={signatory.fullName || 'Your full name'}
                />
                {terms.signatureName && (
                  <p className="text-[10px] text-[var(--teal-600)] font-bold">
                    ✓ Signed as: {terms.signatureName} · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setError(null); setStep(2); }}
                  className="h-14 px-6 rounded-2xl font-bold border-[var(--border)]"
                >
                  <span className="material-symbols-outlined text-[18px] mr-1">arrow_back</span>
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!canSign || loading}
                  className={`flex-1 h-14 rounded-2xl font-black font-heading text-base transition-all ${
                    !canSign ? 'opacity-40 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin size-4 border-2 border-black/20 border-t-black rounded-full" />
                      Submitting…
                    </span>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] mr-2">verified</span>
                      Submit Registration
                    </>
                  )}
                </Button>
              </div>

              {!canSign && (
                <p className="text-[11px] text-[var(--muted)] text-center">
                  Please tick all three boxes and enter your name to sign.
                </p>
              )}
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
