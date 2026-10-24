-- ============================================================
-- Migración 008: Acceso controlado a audit_log
-- ============================================================
-- RLS ya está habilitado en audit_log pero no hay policies.
-- Reglas:
--   - platform_admin: ve todo (todas las instituciones)
--   - institution_admin: ve solo su institución
--   - custody_staff, reviewer: ven solo su institución
--   - student: NO acceso
--   - anon: NO acceso
-- ============================================================

-- Función helper: verifica si el usuario actual tiene rol autorizado
-- en la institución dada (para leer audit_log)
CREATE OR REPLACE FUNCTION public.fn_can_read_audit_log(p_institution_id uuid)
RETURNS boolean AS $$
DECLARE
  v_result boolean;
BEGIN
  -- SECURITY DEFINER: bypassa RLS de memberships
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.institution_id = p_institution_id
      AND m.is_active = true
      AND m.role IN ('institution_admin', 'custody_staff', 'reviewer')
  ) INTO v_result;
  
  IF v_result THEN
    RETURN true;
  END IF;
  
  -- platform_admin ve todo
  RETURN EXISTS (
    SELECT 1 FROM platform_admins pa
    WHERE pa.profile_id = auth.uid()
      AND pa.is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_can_read_audit_log(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_can_read_audit_log(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_can_read_audit_log(uuid) TO authenticated;

-- Policy: platform_admin ve todo
CREATE POLICY audit_log_select_platform_admin ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.profile_id = auth.uid()
        AND pa.is_active = true
    )
  );

-- Policy: roles autorizados por institución
CREATE POLICY audit_log_select_institution ON audit_log
  FOR SELECT TO authenticated
  USING (
    public.fn_can_read_audit_log(audit_log.institution_id)
  );

-- Verificaciones post-migración
DO $$
BEGIN
  -- Verificar que las policies existen
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'audit_log_select_platform_admin'
      AND tablename = 'audit_log'
  ) THEN
    RAISE EXCEPTION 'Policy audit_log_select_platform_admin no creada';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'audit_log_select_institution'
      AND tablename = 'audit_log'
  ) THEN
    RAISE EXCEPTION 'Policy audit_log_select_institution no creada';
  END IF;
  
  -- Verificar función helper
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_can_read_audit_log'
      AND prosecdef = true
  ) THEN
    RAISE EXCEPTION 'fn_can_read_audit_log no existe o no es SECURITY DEFINER';
  END IF;
END $$;

SELECT 'Migración 008 aplicada correctamente: audit_log access' AS resultado;