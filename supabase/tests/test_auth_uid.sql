SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
CREATE OR REPLACE FUNCTION public.test_auth_uid()
RETURNS uuid AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;
SELECT public.test_auth_uid() AS auth_uid_result;