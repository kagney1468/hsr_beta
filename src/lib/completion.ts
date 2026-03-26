import { supabase } from './supabase';

/** Fields saved from PropertyProfile → material_information (all contribute to the 50% MI score). */
export const MATERIAL_COMPLETION_FIELDS = [
  'water_supply',
  'electricity_supply',
  'broadband_speed',
  'mobile_signal',
  'restrictions',
  'rights_easements',
  'flood_risk',
  'coastal_erosion',
  'planning_permissions',
  'coalfield_area',
  'disputes',
  'building_regs_required',
  'epc_rating',
  'epc_expiry',
  'construction_age_band',
] as const;

export function isLeaseholdTenure(tenure: string | null | undefined): boolean {
  return (tenure || '').toLowerCase() === 'leasehold';
}

function isFieldAnswered(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  if (typeof val === 'boolean') return true;
  if (typeof val === 'string') return val.trim() !== '';
  return true;
}

export type PackCompletionInput = {
  property: Record<string, unknown> | null;
  materialInfo: Record<string, unknown> | null;
  documents: { document_type?: string | null }[] | null;
};

/**
 * 50% material information (answered questions / total).
 * 50% mandatory documents: Title Deeds, EPC (upload OR API rating on material/properties), Leasehold docs only if leasehold.
 */
export function computePackCompletion({
  property,
  materialInfo,
  documents,
}: PackCompletionInput): number {
  const docs = documents || [];
  const mi = materialInfo || {};
  const prop = property || {};

  const materialAnswered = MATERIAL_COMPLETION_FIELDS.filter((f) =>
    isFieldAnswered(mi[f as string])
  ).length;
  const materialPct =
    MATERIAL_COMPLETION_FIELDS.length > 0
      ? (materialAnswered / MATERIAL_COMPLETION_FIELDS.length) * 50
      : 0;

  const leasehold = isLeaseholdTenure(prop.tenure as string);

  const hasTitle = docs.some((d) => d.document_type === 'title_deeds');
  const hasEpcDoc = docs.some((d) => d.document_type === 'epc');
  const epcFromApi =
    !!(mi.epc_rating && String(mi.epc_rating).trim()) ||
    !!(prop.epc_rating && String(prop.epc_rating).trim());
  const epcComplete = hasEpcDoc || epcFromApi;

  const hasLeaseholdDocs = docs.some((d) => d.document_type === 'leasehold');

  let requiredSlots = 2;
  let satisfied = 0;
  if (hasTitle) satisfied++;
  if (epcComplete) satisfied++;
  if (leasehold) {
    requiredSlots++;
    if (hasLeaseholdDocs) satisfied++;
  }

  const docPct = requiredSlots > 0 ? (satisfied / requiredSlots) * 50 : 0;

  return Math.min(100, Math.round(materialPct + docPct));
}

export async function updatePackCompletion(propertyId: string): Promise<number> {
  const { data: prop } = await supabase.from('properties').select('*').eq('id', propertyId).maybeSingle();
  if (!prop) return 0;

  const { data: matInfo } = await supabase
    .from('material_information')
    .select('*')
    .eq('property_id', propertyId)
    .maybeSingle();

  const { data: docs } = await supabase.from('documents').select('document_type').eq('property_id', propertyId);

  const finalPercentage = computePackCompletion({
    property: prop as Record<string, unknown>,
    materialInfo: (matInfo || null) as Record<string, unknown> | null,
    documents: docs || [],
  });

  await supabase
    .from('properties')
    .update({ pack_completion_percentage: finalPercentage, updated_at: new Date().toISOString() })
    .eq('id', propertyId);

  return finalPercentage;
}
