import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLpe1 } from '../hooks/useLpe1'
import { RequestLpe1Modal } from '../components/lpe1/RequestLpe1Modal'

// ── Sub-components (same design tokens as PropertyInformation) ────────────────

function YesNoToggle({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  const base = 'px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors focus:outline-none';
  const active = 'bg-[#17afaf] text-white border-[#17afaf]';
  const inactive = 'bg-white text-[var(--teal-900)] border-[var(--border)] hover:border-[#17afaf] hover:bg-[var(--teal-050)]';
  return (
    <div className="flex gap-2">
      <button type="button" onClick={() => onChange(true)} className={`${base} ${value === true ? active : inactive}`}>Yes</button>
      <button type="button" onClick={() => onChange(false)} className={`${base} ${value === false ? active : inactive}`}>No</button>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-[var(--teal-900)]">{label}</label>
      {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      {children}
    </div>
  );
}

function ConditionalPanel({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <div className="mt-4 pl-4 border-l-2 border-[#17afaf] space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
      {children}
    </div>
  );
}

const STEP_NAMES = [
  'The Lease',
  'Service Charge & Management',
  'Building & Insurance',
  'Freeholder & Notices',
  'Commonhold & Declaration',
];

const selectClass = 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40';
const inputClass = 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40';
const textareaClass = 'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40 min-h-[80px]';

const LEASEHOLD_TENURES = ['Leasehold', 'Shared freehold'];

// ── Main component ────────────────────────────────────────────────────────────

export default function LeaseholdInformation() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { lpe1, loading: lpe1Loading, reload: reloadLpe1 } = useLpe1(propertyId)
  const [showLpe1Modal, setShowLpe1Modal] = useState(false)

  const [pdtfData, setPdtfData] = useState<Record<string, unknown>>({});

  // ── Step 1 state — The Lease ─────────────────────────────────────────────────
  const [leaseYearsRemaining, setLeaseYearsRemaining] = useState('');
  const [originalLeaseTerm, setOriginalLeaseTerm] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState('');
  const [hasLeaseExtension, setHasLeaseExtension] = useState<boolean | null>(null);
  const [leaseExtensionDetails, setLeaseExtensionDetails] = useState('');
  const [groundRentAmount, setGroundRentAmount] = useState('');
  const [groundRentReviewPeriod, setGroundRentReviewPeriod] = useState('');
  const [groundRentReviewBasis, setGroundRentReviewBasis] = useState('');
  const [isGroundRentZero, setIsGroundRentZero] = useState<boolean | null>(null);

  // ── Step 2 state — Service Charge & Management ───────────────────────────────
  const [serviceChargeAmount, setServiceChargeAmount] = useState('');
  const [serviceChargePeriod, setServiceChargePeriod] = useState('');
  const [serviceChargeReviewDate, setServiceChargeReviewDate] = useState('');
  const [managingAgent, setManagingAgent] = useState('');
  const [managingAgentContact, setManagingAgentContact] = useState('');
  const [managementCompanyName, setManagementCompanyName] = useState('');
  const [hasRightToManage, setHasRightToManage] = useState<boolean | null>(null);
  const [hasServiceChargeDispute, setHasServiceChargeDispute] = useState<boolean | null>(null);
  const [serviceChargeDisputeDetails, setServiceChargeDisputeDetails] = useState('');

  // ── Step 3 state — Building & Insurance ─────────────────────────────────────
  const [buildingInsuranceBy, setBuildingInsuranceBy] = useState('');
  const [buildingInsuranceProvider, setBuildingInsuranceProvider] = useState('');
  const [hasFireSafetyCertificate, setHasFireSafetyCertificate] = useState<boolean | null>(null);
  const [hasCladding, setHasCladding] = useState<boolean | null>(null);
  const [claddingDetails, setCladdingDetails] = useState('');
  const [hasEWS1, setHasEWS1] = useState<boolean | null>(null);
  const [ewsRating, setEwsRating] = useState('');
  const [buildingOverSixStoreys, setBuildingOverSixStoreys] = useState<boolean | null>(null);

  // ── Step 4 state — Freeholder & Notices ─────────────────────────────────────
  const [freeholderName, setFreeholderName] = useState('');
  const [freeholderContact, setFreeholderContact] = useState('');
  const [hasShareOfFreehold, setHasShareOfFreehold] = useState<boolean | null>(null);
  const [hasSection20Notice, setHasSection20Notice] = useState<boolean | null>(null);
  const [section20Details, setSection20Details] = useState('');
  const [hasBreachOfLease, setHasBreachOfLease] = useState<boolean | null>(null);
  const [breachDetails, setBreachDetails] = useState('');
  const [hasPendingLeaseholdClaims, setHasPendingLeaseholdClaims] = useState<boolean | null>(null);
  const [pendingClaimsDetails, setPendingClaimsDetails] = useState('');

  // ── Step 5 state — Commonhold & Declaration ──────────────────────────────────
  const [isCommonhold, setIsCommonhold] = useState<boolean | null>(null);
  const [commonholdAssociationName, setCommonholdAssociationName] = useState('');
  const [commonholdAnnualContribution, setCommonholdAnnualContribution] = useState('');
  const [confirmsLeaseholdAccuracy, setConfirmsLeaseholdAccuracy] = useState(false);

  // ── Load data on mount ───────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const [{ data: prop }, { data: mi }, { data: decl }] = await Promise.all([
        supabase.from('properties').select('tenure').eq('id', propertyId).maybeSingle(),
        supabase.from('material_information').select('*').eq('property_id', propertyId).maybeSingle(),
        supabase.from('seller_declarations').select('*').eq('property_id', propertyId).maybeSingle(),
      ]);

      // Gate: redirect if not leasehold
      if (!prop || !LEASEHOLD_TENURES.includes(prop.tenure || '')) {
        showToast('error', 'TA7 only applies to leasehold properties.');
        setTimeout(() => navigate('/seller/dashboard'), 1800);
        return;
      }

      // Pre-populate from tenure_detail (set in TA6 step 1)
      const td = ((mi as any)?.tenure_detail ?? {}) as Record<string, unknown>;
      if (td.leaseYearsRemaining) setLeaseYearsRemaining(String(td.leaseYearsRemaining));
      if (td.originalLeaseTerm) setOriginalLeaseTerm(String(td.originalLeaseTerm));
      if (td.leaseStartDate) setLeaseStartDate(String(td.leaseStartDate));
      if (td.hasLeaseExtension !== undefined) setHasLeaseExtension(td.hasLeaseExtension as boolean);
      if (td.leaseExtensionDetails) setLeaseExtensionDetails(String(td.leaseExtensionDetails));
      if (td.groundRentAmount) setGroundRentAmount(String(td.groundRentAmount));
      if (td.groundRentReviewPeriod) setGroundRentReviewPeriod(String(td.groundRentReviewPeriod));
      if (td.groundRentReviewBasis) setGroundRentReviewBasis(String(td.groundRentReviewBasis));
      if (td.isGroundRentZero !== undefined) setIsGroundRentZero(td.isGroundRentZero as boolean);
      // Pre-fill shareOfFreehold from TA6
      if (td.shareOfFreehold !== undefined) setHasShareOfFreehold(td.shareOfFreehold as boolean);

      // Pre-populate from pdtf_data
      const pd = ((mi as any)?.pdtf_data ?? {}) as Record<string, Record<string, unknown>>;
      setPdtfData(pd as Record<string, unknown>);

      const sc = (pd['/propertyPack/leasehold/serviceCharge'] ?? {}) as Record<string, unknown>;
      if (sc.serviceChargeAmount) setServiceChargeAmount(String(sc.serviceChargeAmount));
      if (sc.serviceChargePeriod) setServiceChargePeriod(String(sc.serviceChargePeriod));
      if (sc.serviceChargeReviewDate) setServiceChargeReviewDate(String(sc.serviceChargeReviewDate));
      if (sc.managingAgent) setManagingAgent(String(sc.managingAgent));
      if (sc.managingAgentContact) setManagingAgentContact(String(sc.managingAgentContact));
      if (sc.managementCompanyName) setManagementCompanyName(String(sc.managementCompanyName));
      if (sc.hasRightToManage !== undefined) setHasRightToManage(sc.hasRightToManage as boolean);
      if (sc.hasServiceChargeDispute !== undefined) setHasServiceChargeDispute(sc.hasServiceChargeDispute as boolean);
      if (sc.serviceChargeDisputeDetails) setServiceChargeDisputeDetails(String(sc.serviceChargeDisputeDetails));

      const bld = (pd['/propertyPack/leasehold/building'] ?? {}) as Record<string, unknown>;
      if (bld.buildingInsuranceBy) setBuildingInsuranceBy(String(bld.buildingInsuranceBy));
      if (bld.buildingInsuranceProvider) setBuildingInsuranceProvider(String(bld.buildingInsuranceProvider));
      if (bld.hasFireSafetyCertificate !== undefined) setHasFireSafetyCertificate(bld.hasFireSafetyCertificate as boolean);
      if (bld.hasCladding !== undefined) setHasCladding(bld.hasCladding as boolean);
      if (bld.claddingDetails) setCladdingDetails(String(bld.claddingDetails));
      if (bld.hasEWS1 !== undefined) setHasEWS1(bld.hasEWS1 as boolean);
      if (bld.ewsRating) setEwsRating(String(bld.ewsRating));
      if (bld.buildingOverSixStoreys !== undefined) setBuildingOverSixStoreys(bld.buildingOverSixStoreys as boolean);

      const fh = (pd['/propertyPack/leasehold/freeholder'] ?? {}) as Record<string, unknown>;
      if (fh.freeholderName) setFreeholderName(String(fh.freeholderName));
      if (fh.freeholderContact) setFreeholderContact(String(fh.freeholderContact));
      if (fh.hasShareOfFreehold !== undefined) setHasShareOfFreehold(fh.hasShareOfFreehold as boolean);
      if (fh.hasSection20Notice !== undefined) setHasSection20Notice(fh.hasSection20Notice as boolean);
      if (fh.section20Details) setSection20Details(String(fh.section20Details));
      if (fh.hasBreachOfLease !== undefined) setHasBreachOfLease(fh.hasBreachOfLease as boolean);
      if (fh.breachDetails) setBreachDetails(String(fh.breachDetails));
      if (fh.hasPendingLeaseholdClaims !== undefined) setHasPendingLeaseholdClaims(fh.hasPendingLeaseholdClaims as boolean);
      if (fh.pendingClaimsDetails) setPendingClaimsDetails(String(fh.pendingClaimsDetails));

      const ch = (pd['/propertyPack/leasehold/commonhold'] ?? {}) as Record<string, unknown>;
      if (ch.isCommonhold !== undefined) setIsCommonhold(ch.isCommonhold as boolean);
      if (ch.commonholdAssociationName) setCommonholdAssociationName(String(ch.commonholdAssociationName));
      if (ch.commonholdAnnualContribution) setCommonholdAnnualContribution(String(ch.commonholdAnnualContribution));

      if (decl) {
        setConfirmsLeaseholdAccuracy((decl as any).confirms_leasehold_accuracy ?? false);
      }
    } catch (err) {
      console.error('LeaseholdInformation load error:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Save logic ───────────────────────────────────────────────────────────────

  const buildPdtfMerge = (updates: Record<string, unknown>) => ({
    ...pdtfData,
    ...updates,
  });

  const saveStep = async (step: number, andExit = false) => {
    if (!propertyId) return;
    setSaving(true);
    try {
      let miPayload: Record<string, unknown> = { property_id: propertyId, updated_at: new Date().toISOString() };

      if (step === 1) {
        const existingTd = (pdtfData as any)?.['__tenure_detail__'] ?? {};
        const merged = {
          ...existingTd,
          leaseYearsRemaining: leaseYearsRemaining ? Number(leaseYearsRemaining) : null,
          originalLeaseTerm: originalLeaseTerm ? Number(originalLeaseTerm) : null,
          leaseStartDate: leaseStartDate || null,
          hasLeaseExtension,
          leaseExtensionDetails: hasLeaseExtension ? leaseExtensionDetails : null,
          groundRentAmount: groundRentAmount ? Number(groundRentAmount) : null,
          groundRentReviewPeriod: groundRentReviewPeriod || null,
          groundRentReviewBasis: groundRentReviewBasis || null,
          isGroundRentZero,
        };
        // Fetch existing tenure_detail first to preserve TA6 fields
        const { data: existing } = await supabase
          .from('material_information')
          .select('tenure_detail')
          .eq('property_id', propertyId)
          .maybeSingle();
        const existingTenureDetail = (existing?.tenure_detail as Record<string, unknown>) ?? {};
        miPayload = { ...miPayload, tenure_detail: { ...existingTenureDetail, ...merged } };
      }

      if (step === 2) {
        const scObj = {
          serviceChargeAmount: serviceChargeAmount ? Number(serviceChargeAmount) : null,
          serviceChargePeriod: serviceChargePeriod || null,
          serviceChargeReviewDate: serviceChargeReviewDate || null,
          managingAgent: managingAgent || null,
          managingAgentContact: managingAgentContact || null,
          managementCompanyName: managementCompanyName || null,
          hasRightToManage,
          hasServiceChargeDispute,
          serviceChargeDisputeDetails: hasServiceChargeDispute ? serviceChargeDisputeDetails : null,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/leasehold/serviceCharge': scObj });
        miPayload = { ...miPayload, pdtf_data: newPdtf };
        setPdtfData(newPdtf);
      }

      if (step === 3) {
        const bldObj = {
          buildingInsuranceBy: buildingInsuranceBy || null,
          buildingInsuranceProvider: buildingInsuranceProvider || null,
          hasFireSafetyCertificate,
          hasCladding,
          claddingDetails: hasCladding ? claddingDetails : null,
          hasEWS1,
          ewsRating: hasEWS1 ? ewsRating : null,
          buildingOverSixStoreys,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/leasehold/building': bldObj });
        miPayload = { ...miPayload, pdtf_data: newPdtf };
        setPdtfData(newPdtf);
      }

      if (step === 4) {
        const fhObj = {
          freeholderName: freeholderName || null,
          freeholderContact: freeholderContact || null,
          hasShareOfFreehold,
          hasSection20Notice,
          section20Details: hasSection20Notice ? section20Details : null,
          hasBreachOfLease,
          breachDetails: hasBreachOfLease ? breachDetails : null,
          hasPendingLeaseholdClaims,
          pendingClaimsDetails: hasPendingLeaseholdClaims ? pendingClaimsDetails : null,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/leasehold/freeholder': fhObj });
        miPayload = { ...miPayload, pdtf_data: newPdtf };
        setPdtfData(newPdtf);
      }

      if (step === 5) {
        const chObj = {
          isCommonhold,
          commonholdAssociationName: isCommonhold ? commonholdAssociationName : null,
          commonholdAnnualContribution: isCommonhold && commonholdAnnualContribution ? Number(commonholdAnnualContribution) : null,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/leasehold/commonhold': chObj });
        miPayload = { ...miPayload, pdtf_data: newPdtf };
        setPdtfData(newPdtf);

        if (confirmsLeaseholdAccuracy) {
          const { data: existing } = await supabase
            .from('seller_declarations')
            .select('id')
            .eq('property_id', propertyId)
            .maybeSingle();

          const declPayload = {
            property_id: propertyId,
            confirms_leasehold_accuracy: true,
            signed_at: new Date().toISOString(),
          };
          if ((existing as any)?.id) {
            await supabase.from('seller_declarations').update(declPayload).eq('id', (existing as any).id);
          } else {
            await supabase.from('seller_declarations').insert({
              ...declPayload,
              confirms_accuracy: false,
              confirms_ai_review: false,
            });
          }
        }
      }

      const { error: miErr } = await supabase
        .from('material_information')
        .upsert(miPayload, { onConflict: 'property_id' });
      if (miErr) throw miErr;

      showToast('success', 'Saved');

      if (andExit) {
        navigate('/seller/dashboard');
        return;
      }
      if (step === 5) {
        showToast('success', 'Leasehold information saved');
        setTimeout(() => navigate('/seller/dashboard'), 1200);
        return;
      }
      setCurrentStep((s) => Math.min(s + 1, 5));
    } catch (err: any) {
      console.error('LeaseholdInformation save error:', err);
      showToast('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Step components ──────────────────────────────────────────────────────────

  function Step1() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Years remaining on lease">
            <input type="number" className={inputClass} value={leaseYearsRemaining} onChange={(e) => setLeaseYearsRemaining(e.target.value)} placeholder="e.g. 87" />
          </FieldGroup>
          <FieldGroup label="Original lease term (years)">
            <input type="number" className={inputClass} value={originalLeaseTerm} onChange={(e) => setOriginalLeaseTerm(e.target.value)} placeholder="e.g. 125" />
          </FieldGroup>
          <FieldGroup label="Lease start date">
            <input type="date" className={inputClass} value={leaseStartDate} onChange={(e) => setLeaseStartDate(e.target.value)} />
          </FieldGroup>
          <FieldGroup label="Ground rent (£/year)">
            <input type="number" className={inputClass} value={groundRentAmount} onChange={(e) => setGroundRentAmount(e.target.value)} placeholder="e.g. 250" />
          </FieldGroup>
        </div>

        <FieldGroup label="Has the lease been extended?">
          <YesNoToggle value={hasLeaseExtension} onChange={setHasLeaseExtension} />
          <ConditionalPanel show={hasLeaseExtension === true}>
            <FieldGroup label="Extension details">
              <textarea className={textareaClass} value={leaseExtensionDetails} onChange={(e) => setLeaseExtensionDetails(e.target.value)} placeholder="Describe the extension…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Is the ground rent currently zero (peppercorn)?">
          <YesNoToggle value={isGroundRentZero} onChange={setIsGroundRentZero} />
        </FieldGroup>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Ground rent review period">
            <input type="text" className={inputClass} value={groundRentReviewPeriod} onChange={(e) => setGroundRentReviewPeriod(e.target.value)} placeholder="e.g. Every 10 years" />
          </FieldGroup>
          <FieldGroup label="Ground rent review basis">
            <select className={selectClass} value={groundRentReviewBasis} onChange={(e) => setGroundRentReviewBasis(e.target.value)}>
              <option value="">Select…</option>
              {['Fixed amount', 'RPI linked', 'Doubling', 'Other'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>
        </div>
      </div>
    );
  }

  function Step2() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Annual service charge (£)">
            <input type="number" className={inputClass} value={serviceChargeAmount} onChange={(e) => setServiceChargeAmount(e.target.value)} placeholder="e.g. 2400" />
          </FieldGroup>
          <FieldGroup label="Payment frequency">
            <select className={selectClass} value={serviceChargePeriod} onChange={(e) => setServiceChargePeriod(e.target.value)}>
              <option value="">Select…</option>
              {['Monthly', 'Quarterly', 'Annually'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Service charge review date">
            <input type="date" className={inputClass} value={serviceChargeReviewDate} onChange={(e) => setServiceChargeReviewDate(e.target.value)} />
          </FieldGroup>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Managing agent name">
            <input type="text" className={inputClass} value={managingAgent} onChange={(e) => setManagingAgent(e.target.value)} placeholder="Agent name" />
          </FieldGroup>
          <FieldGroup label="Managing agent contact">
            <input type="text" className={inputClass} value={managingAgentContact} onChange={(e) => setManagingAgentContact(e.target.value)} placeholder="Phone or email" />
          </FieldGroup>
          <FieldGroup label="Management company name">
            <input type="text" className={inputClass} value={managementCompanyName} onChange={(e) => setManagementCompanyName(e.target.value)} placeholder="Company name" />
          </FieldGroup>
        </div>

        <FieldGroup label="Does the building have a Right to Manage company?">
          <YesNoToggle value={hasRightToManage} onChange={setHasRightToManage} />
        </FieldGroup>

        <FieldGroup label="Any current service charge disputes?">
          <YesNoToggle value={hasServiceChargeDispute} onChange={setHasServiceChargeDispute} />
          <ConditionalPanel show={hasServiceChargeDispute === true}>
            <FieldGroup label="Dispute details">
              <textarea className={textareaClass} value={serviceChargeDisputeDetails} onChange={(e) => setServiceChargeDisputeDetails(e.target.value)} placeholder="Describe the dispute…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>
      </div>
    );
  }

  function Step3() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Building insurance arranged by">
            <select className={selectClass} value={buildingInsuranceBy} onChange={(e) => setBuildingInsuranceBy(e.target.value)}>
              <option value="">Select…</option>
              {['Freeholder', 'Management company', 'Leaseholder', 'Other'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>
          <FieldGroup label="Building insurance provider">
            <input type="text" className={inputClass} value={buildingInsuranceProvider} onChange={(e) => setBuildingInsuranceProvider(e.target.value)} placeholder="Provider name" />
          </FieldGroup>
        </div>

        <FieldGroup label="Is there a current fire safety certificate?">
          <YesNoToggle value={hasFireSafetyCertificate} onChange={setHasFireSafetyCertificate} />
        </FieldGroup>

        <FieldGroup label="Is the building six storeys or more?">
          <YesNoToggle value={buildingOverSixStoreys} onChange={setBuildingOverSixStoreys} />
        </FieldGroup>

        <FieldGroup label="Does the building have cladding?">
          <YesNoToggle value={hasCladding} onChange={setHasCladding} />
          <ConditionalPanel show={hasCladding === true}>
            <FieldGroup label="Cladding type and remediation status" hint="Describe the cladding material and any remediation or assessment work carried out.">
              <textarea className={textareaClass} value={claddingDetails} onChange={(e) => setCladdingDetails(e.target.value)} placeholder="e.g. ACM panels — remediation completed 2023" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Is there an EWS1 form for the building?">
          <YesNoToggle value={hasEWS1} onChange={setHasEWS1} />
          <ConditionalPanel show={hasEWS1 === true}>
            <FieldGroup label="EWS1 rating">
              <select className={selectClass} value={ewsRating} onChange={(e) => setEwsRating(e.target.value)}>
                <option value="">Select…</option>
                {['A1', 'A2', 'B1', 'B2'].map((v) => <option key={v}>{v}</option>)}
              </select>
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>
      </div>
    );
  }

  function Step4() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FieldGroup label="Freeholder name">
            <input type="text" className={inputClass} value={freeholderName} onChange={(e) => setFreeholderName(e.target.value)} placeholder="Name of freeholder" />
          </FieldGroup>
          <FieldGroup label="Freeholder contact details">
            <input type="text" className={inputClass} value={freeholderContact} onChange={(e) => setFreeholderContact(e.target.value)} placeholder="Phone or email" />
          </FieldGroup>
        </div>

        <FieldGroup label="Do you own a share of the freehold?">
          <YesNoToggle value={hasShareOfFreehold} onChange={setHasShareOfFreehold} />
        </FieldGroup>

        <FieldGroup label="Has a Section 20 notice been served in the last 3 years?" hint="Section 20 relates to major works requiring leaseholder consultation.">
          <YesNoToggle value={hasSection20Notice} onChange={setHasSection20Notice} />
          <ConditionalPanel show={hasSection20Notice === true}>
            <FieldGroup label="Section 20 details">
              <textarea className={textareaClass} value={section20Details} onChange={(e) => setSection20Details(e.target.value)} placeholder="Describe the works and notices…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Any known breach of lease notices?">
          <YesNoToggle value={hasBreachOfLease} onChange={setHasBreachOfLease} />
          <ConditionalPanel show={hasBreachOfLease === true}>
            <FieldGroup label="Breach details">
              <textarea className={textareaClass} value={breachDetails} onChange={(e) => setBreachDetails(e.target.value)} placeholder="Describe the breach and current status…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Any pending leasehold tribunal claims?">
          <YesNoToggle value={hasPendingLeaseholdClaims} onChange={setHasPendingLeaseholdClaims} />
          <ConditionalPanel show={hasPendingLeaseholdClaims === true}>
            <FieldGroup label="Claim details">
              <textarea className={textareaClass} value={pendingClaimsDetails} onChange={(e) => setPendingClaimsDetails(e.target.value)} placeholder="Describe the claim…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>
      </div>
    );
  }

  function Step5() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Is the property commonhold?" hint="Commonhold is a form of freehold ownership for flats. Most flats are leasehold.">
          <YesNoToggle value={isCommonhold} onChange={setIsCommonhold} />
          <ConditionalPanel show={isCommonhold === true}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldGroup label="Commonhold association name">
                <input type="text" className={inputClass} value={commonholdAssociationName} onChange={(e) => setCommonholdAssociationName(e.target.value)} placeholder="Association name" />
              </FieldGroup>
              <FieldGroup label="Annual commonhold contribution (£)">
                <input type="number" className={inputClass} value={commonholdAnnualContribution} onChange={(e) => setCommonholdAnnualContribution(e.target.value)} placeholder="e.g. 1800" />
              </FieldGroup>
            </div>
          </ConditionalPanel>
        </FieldGroup>

        <div className="border-t border-[var(--border)] pt-6">
          <label className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] cursor-pointer hover:bg-[var(--teal-050)]/70 transition-colors">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={confirmsLeaseholdAccuracy}
                onChange={(e) => setConfirmsLeaseholdAccuracy(e.target.checked)}
                className="size-5 rounded border-2 border-[var(--border)] accent-[#17afaf] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--teal-900)]">Seller's declaration</p>
              <p className="text-xs text-[var(--muted)] leading-relaxed italic">
                "I confirm the leasehold information provided is accurate to the best of my knowledge."
              </p>
            </div>
          </label>
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin size-10 border-4 border-[#17afaf] border-t-transparent rounded-full" />
      </div>
    );
  }

  const pct = Math.round(((currentStep - 1) / 5) * 100);

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 pb-32 space-y-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-3 duration-300 ${
          toast.type === 'success'
            ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
            : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]'
        }`}>
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#17afaf]">Leasehold Information Form — TA7</p>
        <h1 className="text-3xl font-black font-heading text-[var(--teal-900)] tracking-tight">
          {STEP_NAMES[currentStep - 1]}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
          <span>Step {currentStep} of 5</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div className="h-full bg-[#17afaf] rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, 4)}%` }} />
        </div>
        <div className="flex gap-1 pt-1">
          {STEP_NAMES.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i + 1)}
              title={name}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i + 1 < currentStep ? 'bg-[#17afaf]' : i + 1 === currentStep ? 'bg-[#17afaf]/60' : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* LPE1 Request — leasehold properties only */}
      {!lpe1Loading && (
        lpe1 ? (
          <div className={`rounded-2xl border px-5 py-4 flex items-start gap-4 ${
            lpe1.status === 'complete'
              ? 'bg-[#d1fae5] border-[#a7f3d0]'
              : 'bg-[var(--teal-050)] border-[#ddeaeb]'
          }`}>
            <span className={`material-symbols-outlined text-xl mt-0.5 ${
              lpe1.status === 'complete' ? 'text-[#065f46]' : 'text-[#17afaf]'
            }`}>
              {lpe1.status === 'complete' ? 'check_circle' : 'schedule'}
            </span>
            <div className="space-y-0.5">
              {lpe1.status === 'complete' ? (
                <>
                  <p className="text-sm font-semibold text-[#065f46]">LPE1 complete</p>
                  <p className="text-xs text-[#065f46]/80">
                    Completed by {lpe1.completed_by_name}
                    {lpe1.completed_by_company ? ` · ${lpe1.completed_by_company}` : ''}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold text-[var(--teal-900)]">LPE1 request sent</p>
                  <p className="text-xs text-[var(--muted)]">
                    Sent to {lpe1.completed_by_name}
                    {lpe1.completed_by_company ? ` · ${lpe1.completed_by_company}` : ''}
                    {lpe1.requested_at ? ` on ${new Date(lpe1.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
                    . We'll notify you when it's complete.
                  </p>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#ddeaeb] bg-[var(--teal-050)] px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 space-y-0.5">
              <p className="text-sm font-semibold text-[var(--teal-900)]">LPE1 — Leasehold Property Enquiries</p>
              <p className="text-xs text-[var(--muted)]">
                Request management information directly from your managing agent. Removes the typical 2–3 week delay and avoids the £100–500 fee.
              </p>
            </div>
            <Button variant="primary" onClick={() => setShowLpe1Modal(true)} className="shrink-0">
              <span className="material-symbols-outlined text-base mr-1">send</span>
              Request LPE1
            </Button>
          </div>
        )
      )}

      {/* LPE1 Modal */}
      {showLpe1Modal && (
        <RequestLpe1Modal
          propertyId={propertyId!}
          prefillName={managingAgent}
          prefillEmail={
            // managingAgentContact is "phone or email" — only pre-fill if it looks like an email
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managingAgentContact) ? managingAgentContact : ''
          }
          prefillCompany={managementCompanyName}
          onSuccess={() => {
            setShowLpe1Modal(false)
            reloadLpe1()
            showToast('success', 'LPE1 request sent successfully')
          }}
          onClose={() => setShowLpe1Modal(false)}
        />
      )}

      {/* Step card */}
      <Card className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="size-9 rounded-xl bg-[#17afaf] text-white flex items-center justify-center font-heading font-black text-sm shrink-0">
            {currentStep}
          </div>
          <h2 className="font-heading font-black text-xl text-[var(--teal-900)]">
            {STEP_NAMES[currentStep - 1]}
          </h2>
        </div>

        {currentStep === 1 && <Step1 />}
        {currentStep === 2 && <Step2 />}
        {currentStep === 3 && <Step3 />}
        {currentStep === 4 && <Step4 />}
        {currentStep === 5 && <Step5 />}
      </Card>

      {/* Navigation */}
      <div className="flex flex-col sm:flex-row gap-3">
        {currentStep > 1 && (
          <Button variant="outline" onClick={() => setCurrentStep((s) => s - 1)} disabled={saving}>
            <span className="material-symbols-outlined text-base mr-1">arrow_back</span>
            Back
          </Button>
        )}
        <div className="flex-1" />
        <Button variant="secondary" onClick={() => saveStep(currentStep, true)} disabled={saving}>
          {saving ? 'Saving…' : 'Save & exit'}
        </Button>
        <Button variant="primary" onClick={() => saveStep(currentStep, false)} disabled={saving}>
          {saving ? 'Saving…' : currentStep === 5 ? 'Complete & submit' : 'Save & continue'}
          {!saving && currentStep < 5 && <span className="material-symbols-outlined text-base ml-1">arrow_forward</span>}
        </Button>
      </div>
    </div>
  );
}
