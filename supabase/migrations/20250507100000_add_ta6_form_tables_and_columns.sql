-- Sprint 8 — TA6 property information form
-- Adds new columns to material_information and three child tables.

-- ── 1. New columns on material_information ──────────────────────────────────

ALTER TABLE public.material_information
  ADD COLUMN IF NOT EXISTS built_form                      text,
  ADD COLUMN IF NOT EXISTS reception_count                 integer,
  ADD COLUMN IF NOT EXISTS tenure_detail                   jsonb,
  ADD COLUMN IF NOT EXISTS pdtf_data                       jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS has_boundary_disputes           boolean,
  ADD COLUMN IF NOT EXISTS boundary_disputes               text,
  ADD COLUMN IF NOT EXISTS has_neighbour_disputes          boolean,
  ADD COLUMN IF NOT EXISTS neighbour_disputes              text,
  ADD COLUMN IF NOT EXISTS has_planning_notices            boolean,
  ADD COLUMN IF NOT EXISTS heating_type                    text,
  ADD COLUMN IF NOT EXISTS heating_age_years               integer,
  ADD COLUMN IF NOT EXISTS sewerage                        text,
  ADD COLUMN IF NOT EXISTS epc_expiry_date                 date,
  ADD COLUMN IF NOT EXISTS non_standard_construction       boolean,
  ADD COLUMN IF NOT EXISTS non_standard_construction_details text,
  ADD COLUMN IF NOT EXISTS has_chancel_repair              boolean,
  ADD COLUMN IF NOT EXISTS chancel_repair                  text,
  ADD COLUMN IF NOT EXISTS has_restrictions                boolean,
  ADD COLUMN IF NOT EXISTS has_easements                   boolean,
  ADD COLUMN IF NOT EXISTS has_covenants                   boolean;

-- ── 2. property_occupiers ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_occupiers (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id               uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  occupier_type             text NOT NULL,
  will_vacate_on_completion boolean,
  notes                     text,
  created_at                timestamptz DEFAULT now()
);

ALTER TABLE public.property_occupiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller can manage own property occupiers"
  ON public.property_occupiers
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ── 3. property_alterations ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_alterations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  alteration_type          text NOT NULL,
  description              text,
  year_completed           integer,
  building_regs_obtained   text,
  planning_obtained        text,
  works_by_current_owner   boolean,
  created_at               timestamptz DEFAULT now()
);

ALTER TABLE public.property_alterations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller can manage own property alterations"
  ON public.property_alterations
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- ── 4. property_guarantees ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.property_guarantees (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  guarantee_type  text NOT NULL,
  provider        text,
  start_date      date,
  expiry_date     date,
  transferable    text,
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE public.property_guarantees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Seller can manage own property guarantees"
  ON public.property_guarantees
  FOR ALL
  TO authenticated
  USING (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    property_id IN (
      SELECT p.id FROM public.properties p
      JOIN public.users u ON u.id = p.seller_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );
