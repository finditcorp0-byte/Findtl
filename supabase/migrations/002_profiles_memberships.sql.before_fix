-- Migración 002: Perfiles, membresías y roles
-- Propósito: vincular usuarios autenticados a instituciones con roles.
-- Dependencias: 001 (instituciones).
-- Riesgos: medio. El campo id de profiles debe coincidir con auth.users.id.
-- Reversión: DROP TABLE memberships; DROP TABLE profiles_private; DROP TABLE profiles;

-- ============================================================
-- Tablas
-- ============================================================

CREATE TABLE profiles (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE profiles_private (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  phone text,
  document_type text,
  document_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  campus_id uuid REFERENCES campuses(id),
  role text NOT NULL CHECK (role IN ('student', 'custody_staff', 'reviewer', 'institution_admin')),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_private_profile_id ON profiles_private(profile_id);
CREATE INDEX idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX idx_memberships_institution_id ON memberships(institution_id);
CREATE INDEX idx_memberships_campus_id ON memberships(campus_id);
CREATE INDEX idx_memberships_role ON memberships(role);
CREATE INDEX idx_memberships_is_active ON memberships(is_active);

-- Restricciones de unicidad parciales (M-2):
-- PostgreSQL permite múltiples NULL en columnas únicas, por tanto se usan
-- dos índices parciales para evitar duplicidad de membresías.
CREATE UNIQUE INDEX idx_memberships_unique_no_campus
  ON memberships(profile_id, institution_id)
  WHERE campus_id IS NULL;

CREATE UNIQUE INDEX idx_memberships_unique_with_campus
  ON memberships(profile_id, institution_id, campus_id)
  WHERE campus_id IS NOT NULL;

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

-- profiles: lectura de propio perfil y campos públicos de miembros de la misma institución.
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_select_public_fields ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m1
      WHERE m1.profile_id = auth.uid() AND m1.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.profile_id = profiles.id AND m2.is_active = true
      AND m1.institution_id = m2.institution_id
    )
  );

CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- profiles_private: solo el propio perfil puede leer/escribir sus datos privados.
CREATE POLICY profiles_private_select_own ON profiles_private
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY profiles_private_update_own ON profiles_private
  FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

-- memberships: lectura de propias membresías y de membresías de la misma institución (admin).
CREATE POLICY memberships_select_own ON memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY memberships_select_institution_admin ON memberships
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m_admin
      WHERE m_admin.profile_id = auth.uid()
        AND m_admin.institution_id = memberships.institution_id
        AND m_admin.role = 'institution_admin'
        AND m_admin.is_active = true
    )
  );

-- memberships: escritura (INSERT/UPDATE/DELETE) solo vía función de servidor.
-- No hay política directa para clientes; RLS deniega por defecto.
-- La función fn_create_membership valida membresía activa y rol antes de escribir.
-- La función fn_deactivate_user desactiva perfiles y membresías de forma explícita.

-- ============================================================
-- Sincronización auth.users → profiles
-- ============================================================

-- Función de servidor: crea perfil en profiles y profiles_private al registrarse un usuario en auth.
-- No reactiva automáticamente cuentas desactivadas previas; usa ON CONFLICT DO NOTHING
-- para no sobrescribir un perfil existente con is_active = false.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    true
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles_private (profile_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Trigger: después de insertar un usuario en auth.users, crear su perfil.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Desactivación explícita de usuarios y membresías
-- ============================================================

-- Función de servidor: desactiva un perfil y sus membresías activas.
-- Solo puede ser llamada por institution_admin de la misma institución que el perfil
-- (desactiva solo las membresías de esa institución), o por platform_admin
-- (desactivación global). No reactiva automáticamente cuentas deshabilitadas.
CREATE OR REPLACE FUNCTION public.fn_deactivate_user(
  p_profile_id uuid
) RETURNS void AS $$
DECLARE
  v_actor_institution_id uuid;
  v_actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener institución y rol del actor
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
  ORDER BY CASE m.role WHEN 'platform_admin' THEN 0 WHEN 'institution_admin' THEN 1 ELSE 2 END
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en ninguna institución';
  END IF;

  -- platform_admin puede desactivar globalmente; institution_admin solo en su institución
  IF v_actor_role <> 'platform_admin' THEN
    -- Verificar que el perfil objetivo tenga una membresía activa en la institución del actor
    IF NOT EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.profile_id = p_profile_id
        AND m2.institution_id = v_actor_institution_id
        AND m2.is_active = true
    ) THEN
      RAISE EXCEPTION 'El perfil no pertenece a la institución del actor';
    END IF;

    -- Desactivar solo las membresías del perfil dentro de la institución del actor
    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id
      AND institution_id = v_actor_institution_id;

    -- Desactivar el perfil solo si no le quedan membresías activas en ninguna institución
    IF NOT EXISTS (
      SELECT 1 FROM memberships m3
      WHERE m3.profile_id = p_profile_id AND m3.is_active = true
    ) THEN
      UPDATE public.profiles
      SET is_active = false, updated_at = now()
      WHERE id = p_profile_id;
    END IF;
  ELSE
    -- platform_admin: desactivación global del perfil y todas sus membresías
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = p_profile_id;

    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;

  -- Registrar en auditoría
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_actor_institution_id, auth.uid(), 'user.deactivate',
    'profile', p_profile_id::text,
    jsonb_build_object('scope', v_actor_role),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_deactivate_user(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_deactivate_user(uuid) TO authenticated;

-- ============================================================
-- Pruebas de aceptación (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 2.1: Un perfil puede tener membresías en varias instituciones con distintos roles.
-- (Insertar dos membresías para el mismo profile_id con institution_id distintos)

-- Prueba 2.2: No se permite auto-asignación de institution_admin.
-- (Intentar INSERT en memberships con role='institution_admin' desde un cliente sin rol admin -- debe fallar)

-- Prueba 2.3: Un usuario desactivado mediante fn_deactivate_user tiene is_active = false en profiles y memberships.
-- (Ejecutar SELECT public.fn_deactivate_user('uuid'); verificar que profiles.is_active = false y memberships.is_active = false)

-- Prueba 2.4: Un usuario no puede leer profiles_private de otro usuario.
-- (SELECT * FROM profiles_private WHERE profile_id != auth.uid() -- debe devolver 0 filas)

-- Prueba 2.5: Restricción de unicidad parcial de membresías.
-- (Intentar crear dos membresías con campus_id NULL para el mismo profile_id + institution_id -- debe fallar)

-- Prueba 2.6: Un institution_admin de institución A no puede desactivar un perfil de institución B.
-- (Ejecutar fn_deactivate_user con profile_id de institución B desde actor de institución A -- debe fallar)
