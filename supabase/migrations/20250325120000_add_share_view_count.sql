-- Pack link analytics: count opens of valid share URLs (public pack page).
ALTER TABLE public.shares
  ADD COLUMN IF NOT EXISTS view_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.shares.view_count IS 'Incremented when someone opens a valid /pack/:token link.';

-- Callable by anon so viewers without login can bump counts; only increments, no data leak.
CREATE OR REPLACE FUNCTION public.increment_share_view(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.shares
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE token = p_token AND active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_share_view(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_share_view(text) TO service_role;
