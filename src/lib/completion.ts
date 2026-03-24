import { supabase } from './supabase';

export async function updatePackCompletion(propertyId: string) {
  // Fetch property
  const { data: prop } = await supabase.from('properties').select('*').eq('id', propertyId).single();
  if (!prop) return 0;

  // Fetch Material Info
  const { data: matInfo } = await supabase.from('material_information').select('*').eq('property_id', propertyId).single();

  // Fetch Documents
  const { data: docs } = await supabase.from('documents').select('document_type').eq('property_id', propertyId);

  let score = 0;

  // 1. Mandatory Documents (50%)
  const mandatoryDocs = ['Title Deeds'];
  if (prop.tenure === 'Leasehold') {
    mandatoryDocs.push('Leasehold Documents');
  }
  // EPC logic: counts if doc exists OR epc_rating is present from API
  const hasEpcDoc = docs?.some(d => d.document_type === 'EPC Certificate');
  const hasEpcApi = !!(matInfo?.epc_rating);
  const epcComplete = hasEpcDoc || hasEpcApi;
  const totalMandatory = mandatoryDocs.length + 1; // +1 for the EPC

  let uploadedCount = epcComplete ? 1 : 0;
  mandatoryDocs.forEach(type => {
    if (docs?.some(d => d.document_type === type)) {
      uploadedCount++;
    }
  });

  score += (uploadedCount / totalMandatory) * 50;

  // 2. Material Information (50%)
  const miFields = [
    'water_supply', 'electricity_supply', 'broadband_speed', 'mobile_signal',
    'parking', 'flooding_risk', 'flood_risk', 'building_safety', 
    'planning_history', 'planning_permissions', 'disputes_notices', 
    'building_reg_works', 'disputes', 'restrictions', 'rights_easements', 
    'coastal_erosion', 'coalfield_area'
  ];
  
  let answeredCount = 0;
  if (matInfo) {
    miFields.forEach(f => {
      if (matInfo[f] !== null && matInfo[f] !== '') answeredCount++;
    });
  }

  score += (answeredCount / miFields.length) * 50;
  const finalPercentage = Math.round(score);

  // Update property
  await supabase.from('properties').update({ pack_completion_percentage: finalPercentage }).eq('id', propertyId);

  return finalPercentage;
}
