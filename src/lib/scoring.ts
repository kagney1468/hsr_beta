export interface PackScoreInput {
  property: {
    address?: string;
    property_type?: string;
  };
  documents: { category: string }[];
  declaration?: { confirms_accuracy: boolean };
}

export const calculatePackScore = (input: PackScoreInput) => {
  let score = 0;
  
  // 1. Basic Info (20%)
  if (input.property.address && input.property.property_type) {
    score += 20;
  }
  
  // 2. ID (20%)
  if (input.documents.some(d => d.category === 'Proof of ID')) {
    score += 20;
  }
  
  // 3. Title Deeds (20%)
  if (input.documents.some(d => d.category === 'Title Deeds')) {
    score += 20;
  }
  
  // 4. Quantity/Material Docs (20%)
  if (input.documents.length >= 4) {
    score += 20;
  }
  
  // 5. Final Declaration (20%)
  if (input.declaration?.confirms_accuracy) {
    score += 20;
  }
  
  return score;
};
