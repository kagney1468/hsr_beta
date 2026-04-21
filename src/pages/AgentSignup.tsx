import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { getAuthRedirectUrl } from '../lib/ensureUserProfile';
import { formatAuthError } from '../lib/authErrors';
import AgentRegistrationForm, { AgentFirmData, AgentSignatoryData, AgentTermsData } from '../components/AgentRegistrationForm';

export default function AgentSignup() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [submittedName, setSubmittedName] = useState('');
  const [submittedAgency, setSubmittedAgency] = useState('');
  const [submittedTitle, setSubmittedTitle] = useState('');

  async function handleSubmit(firm: AgentFirmData, signatory: AgentSignatoryData, terms: AgentTermsData) {
    setIsSubmitting(true);
    setSubmitError(null);
    const now = new Date().toISOString();
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: firm.email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          shouldCreateUser: true,
          data: {
            full_name: signatory.fullName,
            agency_name: firm.agencyName,
            phone: firm.phone,
            role: 'agent',
            trading_address_line1: firm.addressLine1,
            trading_address_line2: firm.addressLine2 || null,
            trading_address_town: firm.town,
            trading_address_county: firm.county || null,
            trading_address_postcode: firm.postcode,
            company_registration_number: firm.companyRegNumber,
            vat_number: firm.vatNumber || null,
            naea_number: firm.naeaNumber || null,
            authorised_signatory_name: signatory.fullName,
            authorised_signatory_title: signatory.jobTitle,
            terms_agreed: true,
            terms_agreed_at: now,
            terms_version: 'v1.0',
            dpa_agreed: true,
            dpa_agreed_at: now,
          },
        },
      });
      if (error) throw error;
      setSubmittedEmail(firm.email);
      setSubmittedName(signatory.fullName);
      setSubmittedAgency(firm.agencyName);
      setSubmittedTitle(signatory.jobTitle);
      setSuccess(true);
    } catch (err: unknown) {
      setSubmitError(formatAuthError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-[var(--page)] flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-10 text-center space-y-6">
          <div className="size-20 bg-[var(--teal-050)] text-[var(--teal-600)] border border-[var(--border)] flex items-center justify-center rounded-3xl mx-auto">
            <span className="material-symbols-outlined text-4xl">verified</span>
          </div>
          <h2 className="text-3xl font-black font-heading text-[var(--teal-900)]">Application submitted</h2>
          <p className="text-[var(--muted)] text-sm leading-relaxed">
            We've sent a secure sign-in link to <strong className="text-[var(--teal-900)]">{submittedEmail}</strong>.
          </p>
          <div className="p-4 rounded-xl bg-[var(--teal-050)] border border-[var(--border)] text-left space-y-2">
            <p className="text-[10px] font-black text-[var(--muted)] uppercase tracking-widest">Agreement summary</p>
            <p className="text-sm text-[var(--text)]"><strong>{submittedName}</strong> ({submittedTitle})</p>
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

  return (
    <div className="min-h-screen bg-[var(--page)] flex flex-col items-center justify-start py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[var(--teal-050)] blur-[140px] rounded-full pointer-events-none opacity-60" />
      <AgentRegistrationForm
        showEmail={true}
        heading="Agent registration"
        subheading="Register your firm to manage property packs for your sellers."
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitError={submitError}
      />
      <div className="mt-6 text-center relative z-10">
        <p className="text-sm text-[var(--muted)]">
          Already registered? <Link to="/login" className="text-[var(--teal-600)] font-semibold hover:underline">Log in here</Link>
        </p>
      </div>
      <Footer />
    </div>
  );
}
