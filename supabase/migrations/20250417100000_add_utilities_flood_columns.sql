ALTER TABLE material_information
  ADD COLUMN IF NOT EXISTS gas_supply TEXT,
  ADD COLUMN IF NOT EXISTS drainage TEXT,
  ADD COLUMN IF NOT EXISTS water_heating TEXT,
  ADD COLUMN IF NOT EXISTS flood_risk_surface_water TEXT,
  ADD COLUMN IF NOT EXISTS flood_risk_rivers_sea TEXT,
  ADD COLUMN IF NOT EXISTS flood_risk_groundwater TEXT;
