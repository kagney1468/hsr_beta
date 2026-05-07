import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// ── Types ────────────────────────────────────────────────────────────────────

interface OccupierRow {
  id?: string;
  occupier_type: string;
  will_vacate_on_completion: boolean | null;
  notes: string;
}

interface AlterationRow {
  id?: string;
  alteration_type: string;
  description: string;
  year_completed: string;
  building_regs_obtained: string;
  planning_obtained: string;
  works_by_current_owner: boolean | null;
}

interface GuaranteeRow {
  id?: string;
  guarantee_type: string;
  provider: string;
  start_date: string;
  expiry_date: string;
  transferable: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function setPdtfField(
  current: Record<string, unknown>,
  path: string,
  value: unknown
): Record<string, unknown> {
  return { ...current, [path]: value };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function YesNoToggle({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  const base =
    'px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors focus:outline-none';
  const active = 'bg-[#17afaf] text-white border-[#17afaf]';
  const inactive =
    'bg-white text-[var(--teal-900)] border-[var(--border)] hover:border-[#17afaf] hover:bg-[var(--teal-050)]';
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`${base} ${value === true ? active : inactive}`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`${base} ${value === false ? active : inactive}`}
      >
        No
      </button>
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
  'Property & Tenure',
  'Occupiers',
  'Boundaries',
  'Disputes & Notices',
  'Alterations & Works',
  'Guarantees & Warranties',
  'Services & Environmental',
  'Restrictions & Rights',
];

const selectClass =
  'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40';
const inputClass =
  'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40';
const textareaClass =
  'w-full rounded-xl border border-[var(--border)] bg-white px-4 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[#17afaf]/40 min-h-[80px]';

// ── Main component ────────────────────────────────────────────────────────────

export default function PropertyInformation() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Shared PDTF data blob (merged on every save)
  const [pdtfData, setPdtfData] = useState<Record<string, unknown>>({});

  // ── Step 1 state ────────────────────────────────────────────────────────────
  const [builtForm, setBuiltForm] = useState('');
  const [bedroomCount, setBedroomCount] = useState<number>(3);
  const [bathroomCount, setBathroomCount] = useState<number>(1);
  const [receptionCount, setReceptionCount] = useState<number>(1);
  const [tenure, setTenure] = useState('Freehold');
  const [leaseYearsRemaining, setLeaseYearsRemaining] = useState('');
  const [groundRentAmount, setGroundRentAmount] = useState('');
  const [groundRentReviewPeriod, setGroundRentReviewPeriod] = useState('');
  const [serviceChargeAmount, setServiceChargeAmount] = useState('');
  const [managingAgent, setManagingAgent] = useState('');
  const [shareOfFreehold, setShareOfFreehold] = useState(false);

  // ── Step 2 state ────────────────────────────────────────────────────────────
  const [occupiers, setOccupiers] = useState<OccupierRow[]>([]);
  const [courtOrderRequired, setCourtOrderRequired] = useState<boolean | null>(null);

  // ── Step 3 state ────────────────────────────────────────────────────────────
  const [boundaryLeft, setBoundaryLeft] = useState('');
  const [boundaryRight, setBoundaryRight] = useState('');
  const [boundaryFront, setBoundaryFront] = useState('');
  const [boundaryRear, setBoundaryRear] = useState('');
  const [hasBoundaryDisputes, setHasBoundaryDisputes] = useState<boolean | null>(null);
  const [boundaryDisputeDetails, setBoundaryDisputeDetails] = useState('');

  // ── Step 4 state ────────────────────────────────────────────────────────────
  const [hasNeighbourDisputes, setHasNeighbourDisputes] = useState<boolean | null>(null);
  const [neighbourDisputeDetails, setNeighbourDisputeDetails] = useState('');
  const [hasPlanningNotices, setHasPlanningNotices] = useState<boolean | null>(null);
  const [planningNoticesDetails, setPlanningNoticesDetails] = useState('');
  const [hasSharedAreaCorrespondence, setHasSharedAreaCorrespondence] = useState<boolean | null>(null);
  const [sharedAreaDetails, setSharedAreaDetails] = useState('');

  // ── Step 5 state ────────────────────────────────────────────────────────────
  const [hasAlterations, setHasAlterations] = useState<boolean | null>(null);
  const [alterations, setAlterations] = useState<AlterationRow[]>([]);

  // ── Step 6 state ────────────────────────────────────────────────────────────
  const [hasGuarantees, setHasGuarantees] = useState<boolean | null>(null);
  const [guarantees, setGuarantees] = useState<GuaranteeRow[]>([]);

  // ── Step 7 state ────────────────────────────────────────────────────────────
  const [heatingType, setHeatingType] = useState('');
  const [heatingAgeYears, setHeatingAgeYears] = useState('');
  const [waterSupply, setWaterSupply] = useState('Mains');
  const [sewerage, setSewerage] = useState('Mains');
  const [epcRating, setEpcRating] = useState('');
  const [epcExpiryDate, setEpcExpiryDate] = useState('');
  const [nonStandardConstruction, setNonStandardConstruction] = useState<boolean | null>(null);
  const [nonStandardDetails, setNonStandardDetails] = useState('');
  const [hasChancelRepair, setHasChancelRepair] = useState<boolean | null>(null);

  // ── Step 8 state ────────────────────────────────────────────────────────────
  const [hasRestrictions, setHasRestrictions] = useState<boolean | null>(null);
  const [restrictionDetails, setRestrictionDetails] = useState('');
  const [hasEasements, setHasEasements] = useState<boolean | null>(null);
  const [easementDetails, setEasementDetails] = useState('');
  const [hasCovenants, setHasCovenants] = useState<boolean | null>(null);
  const [covenantDetails, setCovenantDetails] = useState('');
  const [hasSharedAccess, setHasSharedAccess] = useState<boolean | null>(null);
  const [sharedAccessDetails, setSharedAccessDetails] = useState('');
  const [confirmsAccuracy, setConfirmsAccuracy] = useState(false);

  // ── Load data on mount ──────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!propertyId) return;
    setLoading(true);
    try {
      const [
        { data: mi },
        { data: prop },
        { data: occRows },
        { data: altRows },
        { data: guarRows },
        { data: decl },
      ] = await Promise.all([
        supabase.from('material_information').select('*').eq('property_id', propertyId).maybeSingle(),
        supabase.from('properties').select('tenure,bedrooms,bathrooms,epc_rating').eq('id', propertyId).maybeSingle(),
        supabase.from('property_occupiers').select('*').eq('property_id', propertyId),
        supabase.from('property_alterations').select('*').eq('property_id', propertyId),
        supabase.from('property_guarantees').select('*').eq('property_id', propertyId),
        supabase.from('seller_declarations').select('confirms_accuracy').eq('property_id', propertyId).maybeSingle(),
      ]);

      // Step 1
      if (prop) {
        setTenure(prop.tenure || 'Freehold');
        setBedroomCount(prop.bedrooms ?? 3);
        setBathroomCount(prop.bathrooms ?? 1);
        setEpcRating(prop.epc_rating || '');
      }
      if (mi) {
        setBuiltForm((mi as any).built_form || '');
        setReceptionCount((mi as any).reception_count ?? 1);
        const td = (mi as any).tenure_detail as any;
        if (td) {
          setLeaseYearsRemaining(td.leaseYearsRemaining ?? '');
          setGroundRentAmount(td.groundRentAmount ?? '');
          setGroundRentReviewPeriod(td.groundRentReviewPeriod ?? '');
          setServiceChargeAmount(td.serviceChargeAmount ?? '');
          setManagingAgent(td.managingAgent ?? '');
          setShareOfFreehold(td.shareOfFreehold ?? false);
        }
        // Step 3
        const pd = ((mi as any).pdtf_data as Record<string, unknown>) || {};
        setPdtfData(pd);
        const bounds = pd['/propertyPack/boundaries'] as any;
        if (bounds) {
          setBoundaryLeft(bounds.left || '');
          setBoundaryRight(bounds.right || '');
          setBoundaryFront(bounds.front || '');
          setBoundaryRear(bounds.rear || '');
          setBoundaryDisputeDetails(bounds.disputeDetails || '');
        }
        setHasBoundaryDisputes((mi as any).has_boundary_disputes ?? null);
        // Step 4
        setHasNeighbourDisputes((mi as any).has_neighbour_disputes ?? null);
        const dn = pd['/propertyPack/disputesAndNotices'] as any;
        if (dn) {
          setNeighbourDisputeDetails(dn.neighbourDisputeDetails || '');
          setPlanningNoticesDetails(dn.planningNoticesDetails || '');
          setHasSharedAreaCorrespondence(dn.hasSharedAreaCorrespondence ?? null);
          setSharedAreaDetails(dn.sharedAreaDetails || '');
        }
        setHasPlanningNotices((mi as any).has_planning_notices ?? null);
        // Step 7
        setHeatingType((mi as any).heating_type || '');
        setHeatingAgeYears((mi as any).heating_age_years?.toString() || '');
        setWaterSupply(mi.water_supply || 'Mains');
        setSewerage((mi as any).sewerage || 'Mains');
        setEpcRating((mi as any).epc_rating || prop?.epc_rating || '');
        setEpcExpiryDate((mi as any).epc_expiry_date || '');
        setNonStandardConstruction((mi as any).non_standard_construction ?? null);
        setNonStandardDetails((mi as any).non_standard_construction_details || '');
        setHasChancelRepair((mi as any).has_chancel_repair ?? null);
        // Step 8
        setHasRestrictions((mi as any).has_restrictions ?? null);
        setHasEasements((mi as any).has_easements ?? null);
        setHasCovenants((mi as any).has_covenants ?? null);
        const rr = pd['/propertyPack/restrictionsAndRights'] as any;
        if (rr) {
          setRestrictionDetails(rr.restrictionDetails || '');
          setEasementDetails(rr.easementDetails || '');
          setCovenantDetails(rr.covenantDetails || '');
          setHasSharedAccess(rr.hasSharedAccess ?? null);
          setSharedAccessDetails(rr.sharedAccessDetails || '');
        }
      }
      // Step 2
      if (occRows) {
        setOccupiers(
          occRows.map((r: any) => ({
            id: r.id,
            occupier_type: r.occupier_type,
            will_vacate_on_completion: r.will_vacate_on_completion,
            notes: r.notes || '',
          }))
        );
        const existingPd = ((mi as any)?.pdtf_data as Record<string, unknown>) || {};
        setCourtOrderRequired((existingPd['/propertyPack/occupiers/courtOrderRequired'] as boolean) ?? null);
      }
      // Step 5
      if (altRows) {
        setAlterations(
          altRows.map((r: any) => ({
            id: r.id,
            alteration_type: r.alteration_type,
            description: r.description || '',
            year_completed: r.year_completed?.toString() || '',
            building_regs_obtained: r.building_regs_obtained || '',
            planning_obtained: r.planning_obtained || '',
            works_by_current_owner: r.works_by_current_owner,
          }))
        );
        setHasAlterations(altRows.length > 0 ? true : null);
      }
      // Step 6
      if (guarRows) {
        setGuarantees(
          guarRows.map((r: any) => ({
            id: r.id,
            guarantee_type: r.guarantee_type,
            provider: r.provider || '',
            start_date: r.start_date || '',
            expiry_date: r.expiry_date || '',
            transferable: r.transferable || '',
          }))
        );
        setHasGuarantees(guarRows.length > 0 ? true : null);
      }
      if (decl) {
        setConfirmsAccuracy(decl.confirms_accuracy || false);
      }
    } catch (err) {
      console.error('PropertyInformation load error:', err);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Save logic ──────────────────────────────────────────────────────────────

  const showToast = (type: 'success' | 'error', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  const buildPdtfMerge = (updates: Record<string, unknown>) => ({
    ...pdtfData,
    ...updates,
  });

  const saveStep = async (step: number, andExit = false) => {
    if (!propertyId) return;
    setSaving(true);
    try {
      let miPayload: Record<string, unknown> = { property_id: propertyId, updated_at: new Date().toISOString() };
      let propPayload: Record<string, unknown> | null = null;

      if (step === 1) {
        const leaseholdTenures = ['Leasehold', 'Shared freehold'];
        const tenureDetail = leaseholdTenures.includes(tenure)
          ? { leaseYearsRemaining, groundRentAmount, groundRentReviewPeriod, serviceChargeAmount, managingAgent, shareOfFreehold }
          : null;
        miPayload = {
          ...miPayload,
          built_form: builtForm,
          reception_count: receptionCount,
          tenure_detail: tenureDetail,
        };
        propPayload = {
          tenure,
          bedrooms: bedroomCount,
          bathrooms: bathroomCount,
        };
      }

      if (step === 2) {
        const newPdtf = buildPdtfMerge({
          '/propertyPack/occupiers/courtOrderRequired': courtOrderRequired,
        });
        miPayload = { ...miPayload, pdtf_data: newPdtf };
        setPdtfData(newPdtf);

        // Delete then insert occupiers
        await supabase.from('property_occupiers').delete().eq('property_id', propertyId);
        if (occupiers.length > 0) {
          const rows = occupiers.map(({ id: _id, ...rest }) => ({ ...rest, property_id: propertyId }));
          const { error } = await supabase.from('property_occupiers').insert(rows);
          if (error) throw error;
        }
      }

      if (step === 3) {
        const boundaryObj = {
          left: boundaryLeft,
          right: boundaryRight,
          front: boundaryFront,
          rear: boundaryRear,
          disputeDetails: boundaryDisputeDetails,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/boundaries': boundaryObj });
        miPayload = {
          ...miPayload,
          has_boundary_disputes: hasBoundaryDisputes,
          boundary_disputes: hasBoundaryDisputes === true ? 'Yes' : hasBoundaryDisputes === false ? 'No' : null,
          pdtf_data: newPdtf,
        };
        setPdtfData(newPdtf);
      }

      if (step === 4) {
        const disputesObj = {
          neighbourDisputeDetails,
          planningNoticesDetails,
          hasSharedAreaCorrespondence,
          sharedAreaDetails,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/disputesAndNotices': disputesObj });
        miPayload = {
          ...miPayload,
          has_neighbour_disputes: hasNeighbourDisputes,
          neighbour_disputes: hasNeighbourDisputes === true ? 'Yes' : hasNeighbourDisputes === false ? 'No' : null,
          has_planning_notices: hasPlanningNotices,
          pdtf_data: newPdtf,
        };
        setPdtfData(newPdtf);
      }

      if (step === 5) {
        // Delete then insert alterations
        await supabase.from('property_alterations').delete().eq('property_id', propertyId);
        if (hasAlterations && alterations.length > 0) {
          const rows = alterations.map(({ id: _id, ...rest }) => ({
            ...rest,
            property_id: propertyId,
            year_completed: rest.year_completed ? parseInt(rest.year_completed) : null,
          }));
          const { error } = await supabase.from('property_alterations').insert(rows);
          if (error) throw error;
        }
        // miPayload still gets upserted with updated_at to keep the upsert alive
      }

      if (step === 6) {
        await supabase.from('property_guarantees').delete().eq('property_id', propertyId);
        if (hasGuarantees && guarantees.length > 0) {
          const rows = guarantees.map(({ id: _id, ...rest }) => ({
            ...rest,
            property_id: propertyId,
            start_date: rest.start_date || null,
            expiry_date: rest.expiry_date || null,
          }));
          const { error } = await supabase.from('property_guarantees').insert(rows);
          if (error) throw error;
        }
      }

      if (step === 7) {
        miPayload = {
          ...miPayload,
          heating_type: heatingType,
          heating_age_years: heatingAgeYears ? parseInt(heatingAgeYears) : null,
          water_supply: waterSupply,
          sewerage,
          epc_rating: epcRating,
          epc_expiry_date: epcExpiryDate || null,
          non_standard_construction: nonStandardConstruction,
          non_standard_construction_details: nonStandardDetails,
          has_chancel_repair: hasChancelRepair,
          chancel_repair: hasChancelRepair === true ? 'Yes' : hasChancelRepair === false ? 'No' : null,
        };
        propPayload = { epc_rating: epcRating };
      }

      if (step === 8) {
        const rrObj = {
          restrictionDetails,
          easementDetails,
          covenantDetails,
          hasSharedAccess,
          sharedAccessDetails,
        };
        const newPdtf = buildPdtfMerge({ '/propertyPack/restrictionsAndRights': rrObj });
        miPayload = {
          ...miPayload,
          has_restrictions: hasRestrictions,
          has_easements: hasEasements,
          has_covenants: hasCovenants,
          pdtf_data: newPdtf,
        };
        setPdtfData(newPdtf);

        if (confirmsAccuracy) {
          const { data: existing } = await supabase
            .from('seller_declarations')
            .select('id,confirms_ai_review')
            .eq('property_id', propertyId)
            .maybeSingle();

          const declPayload = {
            property_id: propertyId,
            confirms_accuracy: true,
            confirms_ai_review: existing?.confirms_ai_review ?? false,
            signed_at: new Date().toISOString(),
          };
          if (existing?.id) {
            await supabase.from('seller_declarations').update(declPayload).eq('id', existing.id);
          } else {
            await supabase.from('seller_declarations').insert(declPayload);
          }
        }
      }

      // Upsert material_information
      const { error: miErr } = await supabase
        .from('material_information')
        .upsert(miPayload, { onConflict: 'property_id' });
      if (miErr) throw miErr;

      // Sync to properties table if needed
      if (propPayload) {
        const { error: propErr } = await supabase
          .from('properties')
          .update(propPayload)
          .eq('id', propertyId);
        if (propErr) throw propErr;
      }

      showToast('success', 'Saved');

      if (andExit) {
        navigate('/seller/dashboard');
        return;
      }
      if (step === 8) {
        showToast('success', 'Property information saved');
        setTimeout(() => navigate('/seller/dashboard'), 1200);
        return;
      }
      setCurrentStep((s) => Math.min(s + 1, 8));
    } catch (err: any) {
      console.error('PropertyInformation save error:', err);
      showToast('error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Row helpers ─────────────────────────────────────────────────────────────

  const addOccupier = () =>
    setOccupiers((prev) => [...prev, { occupier_type: 'Owner', will_vacate_on_completion: null, notes: '' }]);

  const removeOccupier = (i: number) =>
    setOccupiers((prev) => prev.filter((_, idx) => idx !== i));

  const updateOccupier = (i: number, field: keyof OccupierRow, value: unknown) =>
    setOccupiers((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const addAlteration = () =>
    setAlterations((prev) => [
      ...prev,
      { alteration_type: 'Extension', description: '', year_completed: '', building_regs_obtained: '', planning_obtained: '', works_by_current_owner: null },
    ]);

  const removeAlteration = (i: number) =>
    setAlterations((prev) => prev.filter((_, idx) => idx !== i));

  const updateAlteration = (i: number, field: keyof AlterationRow, value: unknown) =>
    setAlterations((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  const addGuarantee = () =>
    setGuarantees((prev) => [
      ...prev,
      { guarantee_type: 'NHBC', provider: '', start_date: '', expiry_date: '', transferable: '' },
    ]);

  const removeGuarantee = (i: number) =>
    setGuarantees((prev) => prev.filter((_, idx) => idx !== i));

  const updateGuarantee = (i: number, field: keyof GuaranteeRow, value: string) =>
    setGuarantees((prev) => prev.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)));

  // ── Step content ─────────────────────────────────────────────────────────────

  const leaseholdTenures = ['Leasehold', 'Shared freehold'];

  function Step1() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Type of property">
          <select className={selectClass} value={builtForm} onChange={(e) => setBuiltForm(e.target.value)}>
            <option value="">Select…</option>
            {['Detached', 'Semi-detached', 'Terraced', 'End-of-terrace', 'Flat or maisonette', 'Bungalow'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </FieldGroup>

        <div className="grid grid-cols-3 gap-4">
          <FieldGroup label="Bedrooms">
            <input type="number" min={0} max={20} className={inputClass} value={bedroomCount} onChange={(e) => setBedroomCount(parseInt(e.target.value) || 0)} />
          </FieldGroup>
          <FieldGroup label="Bathrooms">
            <input type="number" min={0} max={20} className={inputClass} value={bathroomCount} onChange={(e) => setBathroomCount(parseInt(e.target.value) || 0)} />
          </FieldGroup>
          <FieldGroup label="Reception rooms">
            <input type="number" min={0} max={20} className={inputClass} value={receptionCount} onChange={(e) => setReceptionCount(parseInt(e.target.value) || 0)} />
          </FieldGroup>
        </div>

        <FieldGroup label="Tenure" hint="How the property is owned.">
          <select className={selectClass} value={tenure} onChange={(e) => setTenure(e.target.value)}>
            {['Freehold', 'Leasehold', 'Shared freehold', 'Commonhold'].map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </FieldGroup>

        {leaseholdTenures.includes(tenure) && (
          <div className="border border-[var(--border)] rounded-2xl p-6 space-y-4 bg-[var(--teal-050)]/40">
            <p className="text-sm font-semibold text-[var(--teal-900)]">Leasehold details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldGroup label="Years remaining on lease">
                <input type="number" min={0} className={inputClass} value={leaseYearsRemaining} onChange={(e) => setLeaseYearsRemaining(e.target.value)} placeholder="e.g. 89" />
              </FieldGroup>
              <FieldGroup label="Ground rent (£/year)">
                <input type="number" min={0} className={inputClass} value={groundRentAmount} onChange={(e) => setGroundRentAmount(e.target.value)} placeholder="e.g. 250" />
              </FieldGroup>
              <FieldGroup label="Ground rent review period">
                <input type="text" className={inputClass} value={groundRentReviewPeriod} onChange={(e) => setGroundRentReviewPeriod(e.target.value)} placeholder="e.g. Every 25 years" />
              </FieldGroup>
              <FieldGroup label="Service charge (£/year)">
                <input type="number" min={0} className={inputClass} value={serviceChargeAmount} onChange={(e) => setServiceChargeAmount(e.target.value)} placeholder="e.g. 1200" />
              </FieldGroup>
              <FieldGroup label="Managing agent" hint="Name of the managing agent or management company.">
                <input type="text" className={inputClass} value={managingAgent} onChange={(e) => setManagingAgent(e.target.value)} placeholder="e.g. Jones Property Management" />
              </FieldGroup>
            </div>
            {tenure === 'Shared freehold' && (
              <FieldGroup label="Do you hold a share of the freehold?">
                <YesNoToggle value={shareOfFreehold} onChange={(v) => setShareOfFreehold(v)} />
              </FieldGroup>
            )}
          </div>
        )}
      </div>
    );
  }

  function Step2() {
    return (
      <div className="space-y-6">
        <FieldGroup
          label="Apart from yourself, who else aged 17 or over lives at the property?"
          hint="Add each person separately. Leave the list empty if no one else lives there."
        >
          {occupiers.length === 0 && (
            <p className="text-sm text-[var(--muted)] italic">No additional occupiers added.</p>
          )}
          {occupiers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] text-left">
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Will vacate on completion?</th>
                    <th className="pb-2 pr-3">Notes</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {occupiers.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3 min-w-[140px]">
                        <select className={selectClass} value={row.occupier_type} onChange={(e) => updateOccupier(i, 'occupier_type', e.target.value)}>
                          {['Owner', 'Family member', 'Tenant', 'Lodger', 'Other'].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3 min-w-[160px]">
                        <YesNoToggle value={row.will_vacate_on_completion} onChange={(v) => updateOccupier(i, 'will_vacate_on_completion', v)} />
                      </td>
                      <td className="py-2 pr-3 min-w-[160px]">
                        <input type="text" className={inputClass} value={row.notes} onChange={(e) => updateOccupier(i, 'notes', e.target.value)} placeholder="Optional notes" />
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeOccupier(i)} className="text-red-500 hover:text-red-700 transition-colors p-1" aria-label="Remove">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            onClick={addOccupier}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#17afaf] border border-[#17afaf] hover:bg-[var(--teal-050)] transition-colors mt-2"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add occupier
          </button>
        </FieldGroup>

        <FieldGroup label="Do you need a court order to sell the property?">
          <YesNoToggle value={courtOrderRequired} onChange={setCourtOrderRequired} />
        </FieldGroup>
      </div>
    );
  }

  const boundaryOptions = ['We do', 'Neighbour does', 'Shared', 'Not known'];

  function Step3() {
    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold text-[var(--teal-900)] mb-1">Who owns or maintains each boundary?</p>
          <p className="text-xs text-[var(--muted)] mb-4">Identify boundaries as if standing inside the property looking out from the front door.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Left boundary', value: boundaryLeft, set: setBoundaryLeft },
              { label: 'Right boundary', value: boundaryRight, set: setBoundaryRight },
              { label: 'Front boundary', value: boundaryFront, set: setBoundaryFront },
              { label: 'Rear boundary', value: boundaryRear, set: setBoundaryRear },
            ].map(({ label, value, set }) => (
              <FieldGroup key={label} label={label}>
                <select className={selectClass} value={value} onChange={(e) => set(e.target.value)}>
                  <option value="">Select…</option>
                  {boundaryOptions.map((v) => <option key={v}>{v}</option>)}
                </select>
              </FieldGroup>
            ))}
          </div>
        </div>

        <FieldGroup label="Are there any boundary disputes?">
          <YesNoToggle value={hasBoundaryDisputes} onChange={setHasBoundaryDisputes} />
          <ConditionalPanel show={hasBoundaryDisputes === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={boundaryDisputeDetails} onChange={(e) => setBoundaryDisputeDetails(e.target.value)} placeholder="Describe the dispute…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>
      </div>
    );
  }

  function Step4() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Have there been any disputes or complaints with neighbours?">
          <YesNoToggle value={hasNeighbourDisputes} onChange={setHasNeighbourDisputes} />
          <ConditionalPanel show={hasNeighbourDisputes === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={neighbourDisputeDetails} onChange={(e) => setNeighbourDisputeDetails(e.target.value)} placeholder="Describe the dispute or complaint…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Are you aware of any planning applications that could affect the property?">
          <YesNoToggle value={hasPlanningNotices} onChange={setHasPlanningNotices} />
          <ConditionalPanel show={hasPlanningNotices === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={planningNoticesDetails} onChange={(e) => setPlanningNoticesDetails(e.target.value)} placeholder="Describe the planning application…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Has there been any correspondence with neighbours about shared areas (drives, paths, fences)?">
          <YesNoToggle value={hasSharedAreaCorrespondence} onChange={setHasSharedAreaCorrespondence} />
          <ConditionalPanel show={hasSharedAreaCorrespondence === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={sharedAreaDetails} onChange={(e) => setSharedAreaDetails(e.target.value)} placeholder="Describe the correspondence…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>
      </div>
    );
  }

  function Step5() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Have any alterations or building works been carried out at the property?">
          <YesNoToggle value={hasAlterations} onChange={setHasAlterations} />
        </FieldGroup>

        <ConditionalPanel show={hasAlterations === true}>
          {alterations.length > 0 && (
            <div className="space-y-4">
              {alterations.map((row, i) => (
                <div key={i} className="rounded-2xl border border-[var(--border)] bg-white p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-widest text-[var(--muted)]">Works {i + 1}</span>
                    <button type="button" onClick={() => removeAlteration(i)} className="text-red-500 hover:text-red-700 p-1">
                      <span className="material-symbols-outlined text-xl">delete</span>
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Type of works">
                      <select className={selectClass} value={row.alteration_type} onChange={(e) => updateAlteration(i, 'alteration_type', e.target.value)}>
                        {['Extension', 'Loft conversion', 'Structural work', 'Electrical', 'Plumbing', 'Windows', 'Heating', 'Other'].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Year completed">
                      <input type="number" className={inputClass} value={row.year_completed} onChange={(e) => updateAlteration(i, 'year_completed', e.target.value)} placeholder="e.g. 2019" />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Description">
                    <textarea className={textareaClass} value={row.description} onChange={(e) => updateAlteration(i, 'description', e.target.value)} placeholder="Describe the works carried out" />
                  </FieldGroup>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FieldGroup label="Building regs obtained">
                      <select className={selectClass} value={row.building_regs_obtained} onChange={(e) => updateAlteration(i, 'building_regs_obtained', e.target.value)}>
                        <option value="">Select…</option>
                        {['Yes', 'No', 'Not required'].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Planning permission obtained">
                      <select className={selectClass} value={row.planning_obtained} onChange={(e) => updateAlteration(i, 'planning_obtained', e.target.value)}>
                        <option value="">Select…</option>
                        {['Yes', 'No', 'Not required'].map((v) => <option key={v}>{v}</option>)}
                      </select>
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Carried out by current owner?">
                    <YesNoToggle value={row.works_by_current_owner} onChange={(v) => updateAlteration(i, 'works_by_current_owner', v)} />
                  </FieldGroup>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={addAlteration}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#17afaf] border border-[#17afaf] hover:bg-[var(--teal-050)] transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add works
          </button>
        </ConditionalPanel>
      </div>
    );
  }

  function Step6() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Are there any valid guarantees or warranties for work carried out at the property?">
          <YesNoToggle value={hasGuarantees} onChange={setHasGuarantees} />
        </FieldGroup>

        <ConditionalPanel show={hasGuarantees === true}>
          {guarantees.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] text-left">
                    <th className="pb-2 pr-3">Type</th>
                    <th className="pb-2 pr-3">Provider</th>
                    <th className="pb-2 pr-3">Start date</th>
                    <th className="pb-2 pr-3">Expiry date</th>
                    <th className="pb-2 pr-3">Transferable?</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {guarantees.map((row, i) => (
                    <tr key={i} className="border-t border-[var(--border)]">
                      <td className="py-2 pr-3 min-w-[140px]">
                        <select className={selectClass} value={row.guarantee_type} onChange={(e) => updateGuarantee(i, 'guarantee_type', e.target.value)}>
                          {['NHBC', 'FENSA', 'Gas Safe', 'Electrical', 'Damp-proof', 'Timber treatment', 'Solar panels', 'Other'].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="py-2 pr-3 min-w-[140px]">
                        <input type="text" className={inputClass} value={row.provider} onChange={(e) => updateGuarantee(i, 'provider', e.target.value)} placeholder="Provider name" />
                      </td>
                      <td className="py-2 pr-3 min-w-[130px]">
                        <input type="date" className={inputClass} value={row.start_date} onChange={(e) => updateGuarantee(i, 'start_date', e.target.value)} />
                      </td>
                      <td className="py-2 pr-3 min-w-[130px]">
                        <input type="date" className={inputClass} value={row.expiry_date} onChange={(e) => updateGuarantee(i, 'expiry_date', e.target.value)} />
                      </td>
                      <td className="py-2 pr-3 min-w-[130px]">
                        <select className={selectClass} value={row.transferable} onChange={(e) => updateGuarantee(i, 'transferable', e.target.value)}>
                          <option value="">Select…</option>
                          {['Yes', 'No', 'Unknown'].map((v) => <option key={v}>{v}</option>)}
                        </select>
                      </td>
                      <td className="py-2">
                        <button type="button" onClick={() => removeGuarantee(i)} className="text-red-500 hover:text-red-700 p-1">
                          <span className="material-symbols-outlined text-xl">delete</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <button
            type="button"
            onClick={addGuarantee}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-[#17afaf] border border-[#17afaf] hover:bg-[var(--teal-050)] transition-colors"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add guarantee
          </button>
        </ConditionalPanel>
      </div>
    );
  }

  function Step7() {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FieldGroup label="Heating system type">
            <select className={selectClass} value={heatingType} onChange={(e) => setHeatingType(e.target.value)}>
              <option value="">Select…</option>
              {['Gas central', 'Electric', 'Oil', 'Heat pump', 'Solid fuel', 'Other'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="Age of heating system (years)">
            <input type="number" min={0} className={inputClass} value={heatingAgeYears} onChange={(e) => setHeatingAgeYears(e.target.value)} placeholder="e.g. 5" />
          </FieldGroup>

          <FieldGroup label="Water supply">
            <select className={selectClass} value={waterSupply} onChange={(e) => setWaterSupply(e.target.value)}>
              {['Mains', 'Private', 'Shared private'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="Sewerage / drainage">
            <select className={selectClass} value={sewerage} onChange={(e) => setSewerage(e.target.value)}>
              {['Mains', 'Septic tank', 'Cesspit', 'Package treatment'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="EPC energy rating">
            <select className={selectClass} value={epcRating} onChange={(e) => setEpcRating(e.target.value)}>
              <option value="">Select…</option>
              {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'Exempt', 'Not required'].map((v) => <option key={v}>{v}</option>)}
            </select>
          </FieldGroup>

          <FieldGroup label="EPC expiry date">
            <input type="date" className={inputClass} value={epcExpiryDate} onChange={(e) => setEpcExpiryDate(e.target.value)} />
          </FieldGroup>
        </div>

        <FieldGroup label="Is the property built in a non-standard form of construction?" hint="Non-standard includes timber frame, steel frame, concrete construction, prefabricated panels, etc.">
          <YesNoToggle value={nonStandardConstruction} onChange={setNonStandardConstruction} />
          <ConditionalPanel show={nonStandardConstruction === true}>
            <FieldGroup label="Please describe the construction type">
              <textarea className={textareaClass} value={nonStandardDetails} onChange={(e) => setNonStandardDetails(e.target.value)} placeholder="e.g. Timber frame, Wimpey no-fines concrete…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Is the property in a chancel repair liability area?" hint="Some properties in older parishes are subject to historical obligations to contribute to church repairs.">
          <YesNoToggle value={hasChancelRepair} onChange={setHasChancelRepair} />
        </FieldGroup>
      </div>
    );
  }

  function Step8() {
    return (
      <div className="space-y-6">
        <FieldGroup label="Are there any restrictions on the use or development of the property?" hint="For example, restrictions in the title preventing certain uses or alterations.">
          <YesNoToggle value={hasRestrictions} onChange={setHasRestrictions} />
          <ConditionalPanel show={hasRestrictions === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={restrictionDetails} onChange={(e) => setRestrictionDetails(e.target.value)} placeholder="Describe the restriction…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Are there any easements, rights of way, or rights benefiting or burdening the property?">
          <YesNoToggle value={hasEasements} onChange={setHasEasements} />
          <ConditionalPanel show={hasEasements === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={easementDetails} onChange={(e) => setEasementDetails(e.target.value)} placeholder="Describe the easement or right of way…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Are there any covenants affecting the property?">
          <YesNoToggle value={hasCovenants} onChange={setHasCovenants} />
          <ConditionalPanel show={hasCovenants === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={covenantDetails} onChange={(e) => setCovenantDetails(e.target.value)} placeholder="Describe the covenant…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        <FieldGroup label="Are there any shared access arrangements with neighbouring properties?">
          <YesNoToggle value={hasSharedAccess} onChange={setHasSharedAccess} />
          <ConditionalPanel show={hasSharedAccess === true}>
            <FieldGroup label="Please give details">
              <textarea className={textareaClass} value={sharedAccessDetails} onChange={(e) => setSharedAccessDetails(e.target.value)} placeholder="Describe the shared access…" />
            </FieldGroup>
          </ConditionalPanel>
        </FieldGroup>

        {/* Declaration */}
        <div className="border-t border-[var(--border)] pt-6">
          <label className="flex items-start gap-4 p-5 rounded-2xl bg-[var(--teal-050)] border border-[var(--border)] cursor-pointer hover:bg-[var(--teal-050)]/70 transition-colors">
            <div className="pt-0.5">
              <input
                type="checkbox"
                checked={confirmsAccuracy}
                onChange={(e) => setConfirmsAccuracy(e.target.checked)}
                className="size-5 rounded border-2 border-[var(--border)] accent-[#17afaf] cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-[var(--teal-900)]">Seller's declaration</p>
              <p className="text-xs text-[var(--muted)] leading-relaxed italic">
                "I confirm the information provided is accurate to the best of my knowledge. I will notify my solicitor and estate agent of any changes before exchange of contracts."
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

  const pct = Math.round(((currentStep - 1) / 8) * 100);

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-10 pb-32 space-y-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-lg text-sm font-semibold animate-in slide-in-from-top-3 duration-300 ${
            toast.type === 'success'
              ? 'bg-[#d1fae5] text-[#065f46] border border-[#a7f3d0]'
              : 'bg-[#fee2e2] text-[#b91c1c] border border-[#fecaca]'
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-widest text-[#17afaf]">Property Information Form — TA6</p>
        <h1 className="text-3xl font-black font-heading text-[var(--teal-900)] tracking-tight">
          {STEP_NAMES[currentStep - 1]}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-[var(--muted)]">
          <span>Step {currentStep} of 8</span>
          <span>{pct}% complete</span>
        </div>
        <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#17afaf] rounded-full transition-all duration-500"
            style={{ width: `${Math.max(pct, 4)}%` }}
          />
        </div>
        <div className="flex gap-1 pt-1">
          {STEP_NAMES.map((name, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrentStep(i + 1)}
              title={name}
              className={`flex-1 h-1 rounded-full transition-colors ${
                i + 1 < currentStep
                  ? 'bg-[#17afaf]'
                  : i + 1 === currentStep
                  ? 'bg-[#17afaf]/60'
                  : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
      </div>

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
        {currentStep === 6 && <Step6 />}
        {currentStep === 7 && <Step7 />}
        {currentStep === 8 && <Step8 />}
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
          {saving ? 'Saving…' : currentStep === 8 ? 'Complete & submit' : 'Save & continue'}
          {!saving && currentStep < 8 && <span className="material-symbols-outlined text-base ml-1">arrow_forward</span>}
        </Button>
      </div>
    </div>
  );
}
