-- Migracion 012: Garantizar admins globales por correo
-- Proposito: promover a platform_admins los perfiles cuyo correo esta en la lista
-- de administradores globales (idempotente).
-- Dependencias: 002 (profiles, profiles_private), 006 (platform_admins).
-- Riesgos: bajo.

INSERT INTO public.platform_admins (profile_id, is_active)
SELECT pp.profile_id, true
FROM public.profiles_private pp
WHERE pp.email IN ('roberpar9@gmail.com', 'juansilgadomarrugo@gmail.com')
ON CONFLICT (profile_id) DO UPDATE SET is_active = true;

-- Asegurar trigger de sincronizacion (ya creado en 010) sigue activo.
-- (No-op si ya existe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sync_global_admin_by_email'
  ) THEN
    -- recrear trigger si faltara
    CREATE TRIGGER trg_sync_global_admin_by_email
      AFTER INSERT OR UPDATE OF email ON profiles_private
      FOR EACH ROW EXECUTE FUNCTION public.fn_sync_global_admin_by_email();
  END IF;
END $$;
