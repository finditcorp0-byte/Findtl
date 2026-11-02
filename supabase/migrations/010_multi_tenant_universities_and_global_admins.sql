-- Migracion 010: Soporte multi-universidad (Fase 1) y administradores globales por correo
-- Proposito: asegurar aislamiento multi-tenant (universidad/institucion) y elevar permisos
-- para los correos administradores globales indicados.
-- Dependencias: 001-009.
-- Riesgos: bajo (solo agrega columna, funciones y politicas RLS adicionales).
-- Reversion: DROP POLICY ...; DROP FUNCTION ...; ALTER TABLE institutions DROP COLUMN slug;

-- ============================================================
-- 1. Slug en institutions (identificador legible por universidad)
-- ============================================================
ALTER TABLE institutions
  ADD COLUMN IF NOT EXISTS slug text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_slug
  ON institutions(slug)
  WHERE slug IS NOT NULL;

-- ============================================================
-- 2. Funcion helper: admin global identificado por correo (JWT)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_global_admin_email()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT COALESCE(
    (auth.jwt() ->> 'email') IN (
      'roberpar9@gmail.com',
      'juansilgadomarrugo@gmail.com'
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_global_admin_email() FROM anon;
REVOKE ALL ON FUNCTION public.is_global_admin_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_global_admin_email() TO authenticated;

-- ============================================================
-- 3. Sincronizacion: promover a platform_admin los correos globales
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_global_admin_by_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IN ('roberpar9@gmail.com', 'juansilgadomarrugo@gmail.com') THEN
    INSERT INTO public.platform_admins (profile_id, is_active)
    VALUES (NEW.profile_id, true)
    ON CONFLICT (profile_id) DO UPDATE SET is_active = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_sync_global_admin_by_email ON profiles_private;
CREATE TRIGGER trg_sync_global_admin_by_email
  AFTER INSERT OR UPDATE OF email ON profiles_private
  FOR EACH ROW EXECUTE FUNCTION public.fn_sync_global_admin_by_email();

-- ============================================================
-- 4. RLS: politicas elevadas para admins globales por correo
--    (combinadas por OR con las politicas existentes)
-- ============================================================
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'institutions','campuses','profiles','profiles_private','memberships',
    'categories','objects','object_files','custody_records','recovery_requests',
    'recovery_reviews','deliveries','delivery_qr_attempts','audit_log','platform_admins'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Asegurar RLS habilitado
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Politica de acceso total para admins globales por correo
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I',
      t || '_global_admin_email_all', t
    );
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR ALL TO authenticated USING (public.is_global_admin_email()) WITH CHECK (public.is_global_admin_email())',
      t || '_global_admin_email_all', t
    );
  END LOOP;
END $$;

-- ============================================================
-- 5. Nota de aislamiento multi-tenant
-- ============================================================
-- Las tablas principales utilizan la columna institution_id como clave de tenant
-- (university_id equivalente). Las politicas RLS existentes ya filtran por membresia
-- activa en la misma institucion. Los admins globales por correo quedan exentos
-- mediante las politicas creadas en esta migracion.
