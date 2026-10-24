-- Migracion 002: Perfiles, membresias y roles
-- Proposito: vincular usuarios autenticados a instituciones con roles.
-- Dependencias: 001 (instituciones).
-- Riesgos: medio. El campo id de profiles debe coincidir con auth.users.id.
-- Reversion: DROP TABLE memberships; DROP TABLE profiles_private; DROP TABLE profiles;

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

-- Indices
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_private_profile_id ON profiles_private(profile_id);
CREATE INDEX idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX idx_memberships_institution_id ON memberships(institution_id);
CREATE INDEX idx_memberships_campus_id ON memberships(campus_id);
CREATE INDEX idx_memberships_role ON memberships(role);
CREATE INDEX idx_memberships_is_active ON memberships(is_active);

-- Restricciones de unicidad parciales (M-2):
-- PostgreSQL permite multiples NULL en columnas unicas, por tanto se usan
-- dos indices parciales para evitar duplicidad de membresias.
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

-- profiles: lectura de propio perfil y campos publicos de miembros de la misma institucion.
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY profiles_select_public_fields ON profiles
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM memberships m1
      JOIN memberships m2
        ON m2.institution_id = m1.institution_id
      WHERE m1.profile_id = auth.uid()
        AND m1.is_active = true
        AND m2.profile_id = profiles.id
        AND m2.is_active = true
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

-- memberships: lectura de propias membresias y de membresias de la misma institucion (admin).
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

-- memberships: escritura (INSERT/UPDATE/DELETE) solo via funcion de servidor.
-- No hay politica directa para clientes; RLS deniega por defecto.
-- La funcion fn_create_membership valida membresia activa y rol antes de escribir.
-- La funcion fn_deactivate_user desactiva perfiles y membresias de forma explicita.

-- ============================================================
-- Sincronizacion auth.users -> profiles
-- ============================================================

-- Funcion de servidor: crea perfil en profiles y profiles_private al registrarse un usuario en auth.
-- No reactiva automaticamente cuentas desactivadas previas; usa ON CONFLICT DO NOTHING
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

-- Trigger: despues de insertar un usuario en auth.users, crear su perfil.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Desactivacion explicita de usuarios y membresias
-- ============================================================

-- Funcion de servidor: desactiva un perfil y sus membresias activas.
-- Solo puede ser llamada por institution_admin de la misma institucion que el perfil
-- (desactiva solo las membresias de esa institucion), o por platform_admin
-- (desactivacion global). No reactiva automaticamente cuentas deshabilitadas.
CREATE OR REPLACE FUNCTION public.fn_deactivate_user(
  p_profile_id uuid
) RETURNS void AS $$
DECLARE
  v_actor_institution_id uuid;
  v_actor_role text;
  v_is_platform_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar si el actor es platform_admin (consulta la tabla dedicada, no memberships)
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE profile_id = auth.uid() AND is_active = true
  ) INTO v_is_platform_admin;

  -- Obtener institucion y rol del actor (solo para institution_admin)
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
    AND m.role = 'institution_admin'
  LIMIT 1;

  -- platform_admin puede desactivar globalmente; institution_admin solo en su institucion
  IF NOT v_is_platform_admin THEN
    IF v_actor_institution_id IS NULL THEN
      RAISE EXCEPTION 'El usuario no tiene membresia activa de institution_admin en ninguna institucion';
    END IF;

    -- Verificar que el perfil objetivo tenga una membresia activa en la institucion del actor
    IF NOT EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.profile_id = p_profile_id
        AND m2.institution_id = v_actor_institution_id
        AND m2.is_active = true
    ) THEN
      RAISE EXCEPTION 'El perfil no pertenece a la institucion del actor';
    END IF;

    -- Desactivar solo las membresias del perfil dentro de la institucion del actor
    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id
      AND institution_id = v_actor_institution_id;

    -- Desactivar el perfil solo si no le quedan membresias activas en ninguna institucion
    IF NOT EXISTS (
      SELECT 1 FROM memberships m3
      WHERE m3.profile_id = p_profile_id AND m3.is_active = true
    ) THEN
      UPDATE public.profiles
      SET is_active = false, updated_at = now()
      WHERE id = p_profile_id;
    END IF;

    -- Registrar en auditoria
    INSERT INTO public.audit_log (
      institution_id, actor_id, action, entity_type, entity_id,
      new_values, created_at
    )
    VALUES (
      v_actor_institution_id, auth.uid(), 'user.deactivate',
      'profile', p_profile_id::text,
      jsonb_build_object('scope', 'institution_admin'),
      now()
    );
  ELSE
    -- platform_admin: desactivacion global del perfil y todas sus membresias
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = p_profile_id;

    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id;

    -- Registrar en auditoria (institution_id NULL para acciones globales de plataforma)
    INSERT INTO public.audit_log (
      institution_id, actor_id, action, entity_type, entity_id,
      new_values, created_at
    )
    VALUES (
      NULL, auth.uid(), 'user.deactivate',
      'profile', p_profile_id::text,
      jsonb_build_object('scope', 'platform_admin'),
      now()
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_deactivate_user(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_deactivate_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_deactivate_user(uuid) TO authenticated;

-- ============================================================
-- Pruebas de aceptacion (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 2.1: Un perfil puede tener membresias en varias instituciones con distintos roles.
-- (Insertar dos membresias para el mismo profile_id con institution_id distintos)

-- Prueba 2.2: No se permite auto-asignacion de institution_admin.
-- (Intentar INSERT en memberships con role='institution_admin' desde un cliente sin rol admin -- debe fallar)

-- Prueba 2.3: Un usuario desactivado mediante fn_deactivate_user tiene is_active = false en profiles y memberships.
-- (Ejecutar SELECT public.fn_deactivate_user('uuid'); verificar que profiles.is_active = false y memberships.is_active = false)

-- Prueba 2.4: Un usuario no puede leer profiles_private de otro usuario.
-- (SELECT * FROM profiles_private WHERE profile_id != auth.uid() -- debe devolver 0 filas)

-- Prueba 2.5: Restriccion de unicidad parcial de membresias.
-- (Intentar crear dos membresias con campus_id NULL para el mismo profile_id + institution_id -- debe fallar)

-- Prueba 2.6: Un institution_admin de institucion A no puede desactivar un perfil de institucion B.
-- (Ejecutar fn_deactivate_user con profile_id de institucion B desde actor de institucion A -- debe fallar)
