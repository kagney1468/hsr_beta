-- Sprint 8 — TA7 leasehold form
-- Adds confirms_leasehold_accuracy to seller_declarations

ALTER TABLE public.seller_declarations
  ADD COLUMN IF NOT EXISTS confirms_leasehold_accuracy boolean DEFAULT false;
