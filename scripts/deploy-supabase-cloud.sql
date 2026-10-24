-- ============================================================================
-- SCRIPT DE DESPLIEGUE EN SUPABASE CLOUD - FindIt Campus
-- ============================================================================
-- Ejecutar estos scripts en el orden indicado en el SQL Editor de Supabase Cloud.
-- No realizar commits ni pushes a repositorios remotos.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- PASO 1: MIGRACIÓN 001 - Instituciones y sedes
-- ----------------------------------------------------------------------------
-- Migración 001: Instituciones y sedes
-- Propósito: crear la base organizacional multiinstitucional.
-- Dependencias: ninguna.
-- Riesgos: bajo.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  legal_name text,
  city text,
  country text NOT NULL DEFAULT 'CO',
  email_domain text UNIQUE,
  logo_url text,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE campuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  city text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_institutions_is_active ON institutions(is_active);
CREATE INDEX idx_institutions_email_domain ON institutions(email_domain);
CREATE INDEX idx_campuses_institution_id ON campuses(institution_id);
CREATE INDEX idx_campuses_is_active ON campuses(is_active);

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY institutions_select_public ON institutions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY campuses_select_public ON campuses
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM institutions i
      WHERE i.id = campuses.institution_id AND i.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- PASO 2: MIGRACIÓN 002 - Perfiles, membresías y roles
-- ----------------------------------------------------------------------------
-- Migración 002: Perfiles, membresías y roles
-- Propósito: vincular usuarios autenticados a instituciones con roles.
-- Dependencias: 001 (instituciones).

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

CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_private_profile_id ON profiles_private(profile_id);
CREATE INDEX idx_memberships_profile_id ON memberships(profile_id);
CREATE INDEX idx_memberships_institution_id ON memberships(institution_id);
CREATE INDEX idx_memberships_campus_id ON memberships(campus_id);
CREATE INDEX idx_memberships_role ON memberships(role);
CREATE INDEX idx_memberships_is_active ON memberships(is_active);

CREATE UNIQUE INDEX idx_memberships_unique_no_campus
  ON memberships(profile_id, institution_id)
  WHERE campus_id IS NULL;

CREATE UNIQUE INDEX idx_memberships_unique_with_campus
  ON memberships(profile_id, institution_id, campus_id)
  WHERE campus_id IS NOT NULL;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;

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

CREATE POLICY profiles_select_public_basic ON profiles
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY profiles_select_public_basic_auth ON profiles
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY profiles_private_select_own ON profiles_private
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

CREATE POLICY profiles_private_update_own ON profiles_private
  FOR UPDATE TO authenticated
  USING (auth.uid() = profile_id)
  WITH CHECK (auth.uid() = profile_id);

CREATE POLICY memberships_select_own ON memberships
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id);

-- Función helper para evitar recursión en RLS
CREATE OR REPLACE FUNCTION public.fn_is_institution_admin(p_institution_id uuid)
RETURNS boolean AS $$
DECLARE
  v_result boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.institution_id = p_institution_id
      AND m.role = 'institution_admin'
      AND m.is_active = true
  ) INTO v_result;
  RETURN COALESCE(v_result, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_is_institution_admin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_is_institution_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_institution_admin(uuid) TO authenticated;

CREATE POLICY memberships_select_institution_admin ON memberships
  FOR SELECT TO authenticated
  USING (
    public.fn_is_institution_admin(memberships.institution_id)
  );

-- Función handle_new_user para sincronizar auth.users -> profiles
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Función fn_deactivate_user
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

  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE profile_id = auth.uid() AND is_active = true
  ) INTO v_is_platform_admin;

  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
    AND m.role = 'institution_admin'
  LIMIT 1;

  IF NOT v_is_platform_admin THEN
    IF v_actor_institution_id IS NULL THEN
      RAISE EXCEPTION 'El usuario no tiene membresía activa de institution_admin en ninguna institución';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM memberships m2
      WHERE m2.profile_id = p_profile_id
        AND m2.institution_id = v_actor_institution_id
        AND m2.is_active = true
    ) THEN
      RAISE EXCEPTION 'El perfil no pertenece a la institución del actor';
    END IF;

    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id
      AND institution_id = v_actor_institution_id;

    IF NOT EXISTS (
      SELECT 1 FROM memberships m3
      WHERE m3.profile_id = p_profile_id AND m3.is_active = true
    ) THEN
      UPDATE public.profiles
      SET is_active = false, updated_at = now()
      WHERE id = p_profile_id;
    END IF;

    INSERT INTO public.audit_log (
      institution_id, actor_id, action, entity_type, entity_id,
      new_values, created_at
    ) VALUES (
      v_actor_institution_id, auth.uid(), 'user.deactivate',
      'profile', p_profile_id::text,
      jsonb_build_object('scope', 'institution_admin'),
      now()
    );
  ELSE
    UPDATE public.profiles
    SET is_active = false, updated_at = now()
    WHERE id = p_profile_id;

    UPDATE public.memberships
    SET is_active = false, updated_at = now()
    WHERE profile_id = p_profile_id;

    INSERT INTO public.audit_log (
      institution_id, actor_id, action, entity_type, entity_id,
      new_values, created_at
    ) VALUES (
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

-- ----------------------------------------------------------------------------
-- PASO 3: MIGRACIÓN 003 - Categorías y objetos
-- ----------------------------------------------------------------------------
-- Migración 003: Categorías y objetos
-- Propósito: definir catálogo de categorías y el registro central de objetos perdidos/encontrados.
-- Dependencias: 001 (instituciones), 002 (profiles para reporter_id).

CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id) ON DELETE RESTRICT,
  name text NOT NULL,
  slug text NOT NULL,
  description text,
  sort_order integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_categories_unique_slug_global ON categories(slug)
  WHERE institution_id IS NULL AND is_active = true;

CREATE UNIQUE INDEX idx_categories_unique_slug_institution ON categories(institution_id, slug)
  WHERE institution_id IS NOT NULL AND is_active = true;

CREATE TABLE objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES institutions(id),
  campus_id uuid,
  category_id uuid REFERENCES categories(id),
  reporter_id uuid NOT NULL REFERENCES profiles(id),
  kind text NOT NULL CHECK (kind IN ('lost', 'found')),
  title text NOT NULL,
  description text NOT NULL,
  zone text,
  location text,
  reported_at timestamptz NOT NULL DEFAULT now(),
  state text NOT NULL CHECK (
    kind IN ('lost', 'found') AND state IN (
      'reported', 'under_review', 'in_custody', 'published', 'claimed',
      'approved', 'delivery_prepared', 'delivered', 'closed', 'rejected', 'unclaimed'
    )
  ),
  custody_point text,
  reference_code text NOT NULL,
  custody_received_at timestamptz,
  custody_received_by uuid REFERENCES profiles(id),
  published_at timestamptz,
  published_by uuid REFERENCES profiles(id),
  closed_at timestamptz,
  closed_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_campuses_id_institution_id ON campuses(id, institution_id);

ALTER TABLE objects
  ADD CONSTRAINT fk_objects_campus_institution
  FOREIGN KEY (campus_id, institution_id)
  REFERENCES campuses(id, institution_id);

CREATE UNIQUE INDEX idx_objects_unique_reference_code
  ON objects(institution_id, reference_code);

CREATE TABLE object_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  url text,
  mime_type text NOT NULL,
  file_size integer,
  is_cover boolean NOT NULL DEFAULT false,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES profiles(id)
);

CREATE UNIQUE INDEX idx_object_files_unique_cover
  ON object_files(object_id)
  WHERE is_cover = true;

CREATE INDEX idx_objects_institution_id ON objects(institution_id);
CREATE INDEX idx_objects_state ON objects(state);
CREATE INDEX idx_objects_kind ON objects(kind);
CREATE INDEX idx_objects_reference_code ON objects(reference_code);
CREATE INDEX idx_objects_composite_institution_state ON objects(institution_id, state);
CREATE INDEX idx_object_files_object_id ON object_files(object_id);
CREATE INDEX idx_object_files_is_cover ON object_files(is_cover);

CREATE INDEX idx_objects_search_gin ON objects
  USING GIN(to_tsvector('spanish', concat_ws(' ', title, description, location, zone)));

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY categories_select_public_global ON categories
  FOR SELECT TO anon, authenticated
  USING (is_active = true AND institution_id IS NULL);

CREATE POLICY categories_select_institution ON categories
  FOR SELECT TO authenticated
  USING (
    institution_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = categories.institution_id
        AND m.is_active = true
    )
  );

CREATE POLICY objects_select_public ON objects
  FOR SELECT TO anon, authenticated
  USING (
    state = 'published'
    AND EXISTS (
      SELECT 1 FROM institutions i
      WHERE i.id = objects.institution_id AND i.is_active = true
    )
  );

CREATE POLICY objects_select_authenticated ON objects
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = objects.institution_id
        AND m.is_active = true
    )
    AND (
      state = 'published'
      OR reporter_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM memberships m2
        WHERE m2.profile_id = auth.uid()
          AND m2.institution_id = objects.institution_id
          AND m2.is_active = true
          AND m2.role IN ('custody_staff', 'reviewer', 'institution_admin')
      )
    )
  );

CREATE POLICY objects_update_reporter ON objects
  FOR UPDATE TO authenticated
  USING (
    reporter_id = auth.uid()
    AND state = 'reported'
  )
  WITH CHECK (
    reporter_id = auth.uid()
    AND state = 'reported'
  );

-- ----------------------------------------------------------------------------
-- PASO 4: MIGRACIÓN 004 - Custodia y reclamaciones
-- ----------------------------------------------------------------------------
-- Migración 004: Custodia y reclamaciones
-- Propósito: registrar recepción física, custodia y solicitudes de recuperación con decisiones manuales.
-- Dependencias: 003 (objetos, object_files), 002 (profiles).

CREATE TABLE custody_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id),
  received_by uuid NOT NULL REFERENCES profiles(id),
  received_at timestamptz NOT NULL DEFAULT now(),
  custody_point text NOT NULL,
  condition_notes text,
  received_from text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_custody_records_unique_object ON custody_records(object_id);

CREATE TABLE recovery_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  object_id uuid NOT NULL REFERENCES objects(id),
  claimant_id uuid NOT NULL REFERENCES profiles(id),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  contact_preference text,
  state text NOT NULL CHECK (state IN ('pending', 'needs_more_info', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  review_notes text,
  decision_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_recovery_requests_unique_active
  ON recovery_requests(object_id)
  WHERE state IN ('pending', 'needs_more_info');

CREATE TABLE recovery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_request_id uuid NOT NULL REFERENCES recovery_requests(id),
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_more_info', 'needs_more_info_response')),
  notes text,
  decided_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid REFERENCES institutions(id),
  actor_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_custody_records_object_id ON custody_records(object_id);
CREATE INDEX idx_custody_records_received_by ON custody_records(received_by);
CREATE INDEX idx_custody_records_received_at ON custody_records(received_at);
CREATE INDEX idx_recovery_requests_object_id ON recovery_requests(object_id);
CREATE INDEX idx_recovery_requests_claimant_id ON recovery_requests(claimant_id);
CREATE INDEX idx_recovery_requests_state ON recovery_requests(state);
CREATE INDEX idx_recovery_requests_claimed_at ON recovery_requests(claimed_at);
CREATE INDEX idx_recovery_reviews_recovery_request_id ON recovery_reviews(recovery_request_id);
CREATE INDEX idx_recovery_reviews_reviewer_id ON recovery_reviews(reviewer_id);
CREATE INDEX idx_recovery_reviews_decision ON recovery_reviews(decision);
CREATE INDEX idx_recovery_reviews_decided_at ON recovery_reviews(decided_at);
CREATE INDEX idx_audit_log_institution_id ON audit_log(institution_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Función validate_custody_institution
CREATE OR REPLACE FUNCTION public.validate_custody_institution()
RETURNS TRIGGER AS $$
DECLARE
  object_institution_id uuid;
  receiver_institution_id uuid;
BEGIN
  SELECT institution_id INTO object_institution_id
  FROM objects WHERE id = NEW.object_id;

  SELECT institution_id INTO receiver_institution_id
  FROM memberships
  WHERE profile_id = NEW.received_by
    AND is_active = true
  LIMIT 1;

  IF receiver_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en ninguna institución';
  END IF;

  IF receiver_institution_id <> object_institution_id THEN
    RAISE EXCEPTION 'El personal de custodia no pertenece a la misma institución que el objeto';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_validate_custody_institution ON custody_records;
CREATE TRIGGER trg_validate_custody_institution
  BEFORE INSERT ON custody_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_custody_institution();

-- Función validate_object_publish
CREATE OR REPLACE FUNCTION public.validate_object_publish()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state = 'published' AND OLD.state <> 'published' THEN
    IF NEW.kind = 'found' THEN
      IF NOT EXISTS (SELECT 1 FROM custody_records WHERE object_id = NEW.id) THEN
        RAISE EXCEPTION 'Un objeto encontrado debe tener registro de custodia antes de publicarse';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

DROP TRIGGER IF EXISTS trg_validate_object_publish ON objects;
CREATE TRIGGER trg_validate_object_publish
  BEFORE UPDATE OF state ON objects
  FOR EACH ROW
  WHEN (NEW.state = 'published' AND OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION public.validate_object_publish();

-- Función fn_create_custody_record
CREATE OR REPLACE FUNCTION public.fn_create_custody_record(
  p_object_id uuid,
  p_custody_point text,
  p_condition_notes text,
  p_received_from text
) RETURNS uuid AS $$
DECLARE
  v_custody_record_id uuid;
  v_object_kind text;
  v_object_institution_id uuid;
  v_actor_institution_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT o.institution_id, o.kind INTO v_object_institution_id, v_object_kind
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
    AND m.role = 'custody_staff'
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no es personal de custodia en la institución del objeto';
  END IF;

  IF v_object_kind <> 'found' THEN
    RAISE EXCEPTION 'Solo objetos encontrados pueden registrar custodia física';
  END IF;

  IF EXISTS (SELECT 1 FROM custody_records WHERE object_id = p_object_id) THEN
    RAISE EXCEPTION 'El objeto ya tiene registro de custodia';
  END IF;

  INSERT INTO custody_records (object_id, received_by, custody_point, condition_notes, received_from, created_at)
  VALUES (p_object_id, auth.uid(), p_custody_point, p_condition_notes, p_received_from, now())
  RETURNING id INTO v_custody_record_id;

  UPDATE objects SET state = 'in_custody', updated_at = now() WHERE id = p_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  ) VALUES (
    v_object_institution_id, auth.uid(), 'object.custody_receive',
    'object', p_object_id::text,
    jsonb_build_object('custody_point', p_custody_point, 'condition_notes', p_condition_notes),
    now()
  );

  RETURN v_custody_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_custody_record(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_create_custody_record(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_custody_record(uuid, text, text, text) TO authenticated;

-- Función fn_create_recovery_request
CREATE OR REPLACE FUNCTION public.fn_create_recovery_request(
  p_object_id uuid,
  p_description text,
  p_contact_preference text
) RETURNS uuid AS $$
DECLARE
  v_recovery_request_id uuid;
  v_object_institution_id uuid;
  v_actor_institution_id uuid;
  v_object_state text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT o.institution_id, o.state INTO v_object_institution_id, v_object_state
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  IF v_object_state <> 'published' THEN
    RAISE EXCEPTION 'El objeto no está disponible para reclamación';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE object_id = p_object_id
      AND claimant_id = auth.uid()
      AND state IN ('pending', 'needs_more_info')
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud activa para este objeto y usuario';
  END IF;

  INSERT INTO recovery_requests (
    object_id, claimant_id, claimed_at, description, contact_preference,
    state, created_at, updated_at
  ) VALUES (
    p_object_id, auth.uid(), now(), p_description, p_contact_preference,
    'pending', now(), now()
  )
  RETURNING id INTO v_recovery_request_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  ) VALUES (
    v_object_institution_id, auth.uid(), 'recovery_request.create',
    'recovery_request', v_recovery_request_id::text,
    jsonb_build_object('object_id', p_object_id, 'description', p_description),
    now()
  );

  RETURN v_recovery_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_recovery_request(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_create_recovery_request(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_recovery_request(uuid, text, text) TO authenticated;

-- Función fn_respond_recovery_request
CREATE OR REPLACE FUNCTION public.fn_respond_recovery_request(
  p_recovery_request_id uuid,
  p_response text
) RETURNS uuid AS $$
DECLARE
  v_recovery_request_id uuid;
  v_object_institution_id uuid;
  v_claimant_id uuid;
  v_recovery_request_state text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT rr.state, o.institution_id, rr.claimant_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_claimant_id, v_recovery_request_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL OR v_recovery_request_id IS NULL THEN
    RAISE EXCEPTION 'Reclamación no encontrada';
  END IF;

  IF v_recovery_request_state <> 'needs_more_info' THEN
    RAISE EXCEPTION 'Solo se puede responder a una solicitud en estado needs_more_info';
  END IF;

  IF v_claimant_id <> auth.uid() THEN
    RAISE EXCEPTION 'Solo el reclamante puede responder a esta solicitud';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.institution_id = v_object_institution_id
      AND m.is_active = true
  ) THEN
    RAISE EXCEPTION 'El reclamante no tiene membresía activa en la institución del objeto';
  END IF;

  UPDATE recovery_requests
  SET state = 'pending',
      description = COALESCE(description, '') || ' [Respuesta del reclamante: ' || p_response || ']',
      updated_at = now()
  WHERE id = p_recovery_request_id
  RETURNING id INTO v_recovery_request_id;

  INSERT INTO recovery_reviews (
    recovery_request_id, reviewer_id, decision, notes, decided_at, created_at
  )
  VALUES (
    v_recovery_request_id, auth.uid(), 'needs_more_info_response',
    p_response, now(), now()
  );

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  ) VALUES (
    v_object_institution_id, auth.uid(), 'recovery_request.respond',
    'recovery_request', v_recovery_request_id::text,
    jsonb_build_object('response_provided', true),
    now()
  );

  RETURN v_recovery_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_respond_recovery_request(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_respond_recovery_request(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_respond_recovery_request(uuid, text) TO authenticated;

ALTER TABLE custody_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY custody_records_select_institution ON custody_records
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN objects o ON o.id = custody_records.object_id
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = o.institution_id
        AND m.is_active = true
        AND m.role IN ('custody_staff', 'reviewer', 'institution_admin')
    )
  );

CREATE POLICY recovery_requests_select_claimant ON recovery_requests
  FOR SELECT TO authenticated
  USING (claimant_id = auth.uid());

CREATE POLICY recovery_requests_select_institution ON recovery_requests
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN objects o ON o.id = recovery_requests.object_id
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = o.institution_id
        AND m.is_active = true
    )
  );

CREATE POLICY recovery_requests_insert_student ON recovery_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    claimant_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.role = 'student'
        AND m.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM objects o
      JOIN memberships mo ON mo.profile_id = auth.uid()
      WHERE o.id = recovery_requests.object_id
        AND o.state = 'published'
        AND o.institution_id = mo.institution_id
        AND mo.is_active = true
    )
  );

CREATE POLICY recovery_requests_update_claimant ON recovery_requests
  FOR UPDATE TO authenticated
  USING (
    claimant_id = auth.uid()
    AND state IN ('pending', 'needs_more_info')
  )
  WITH CHECK (
    claimant_id = auth.uid()
    AND state IN ('cancelled')
  );

CREATE POLICY recovery_reviews_select_claimant ON recovery_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recovery_requests rr
      WHERE rr.id = recovery_reviews.recovery_request_id
        AND rr.claimant_id = auth.uid()
    )
  );

CREATE POLICY recovery_reviews_select_institution ON recovery_reviews
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN recovery_requests rr ON rr.id = recovery_reviews.recovery_request_id
      JOIN objects o ON o.id = rr.object_id
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = o.institution_id
        AND m.is_active = true
    )
  );

-- ----------------------------------------------------------------------------
-- PASO 5: MIGRACIÓN 005 - Entregas y validación QR
-- ----------------------------------------------------------------------------
-- Migración 005: Entregas y validación QR
-- Propósito: gestionar entregas físicas verificadas mediante QR de un solo uso.
-- Dependencias: 004 (recovery_requests, audit_log).

CREATE TABLE deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_request_id uuid NOT NULL REFERENCES recovery_requests(id),
  prepared_by uuid NOT NULL REFERENCES profiles(id),
  prepared_at timestamptz NOT NULL DEFAULT now(),
  delivery_point text NOT NULL,
  qr_token_hash text NOT NULL,
  qr_expires_at timestamptz NOT NULL,
  qr_revoked_at timestamptz,
  delivered_at timestamptz,
  delivered_by uuid REFERENCES profiles(id),
  delivery_confirmed_at timestamptz,
  confirmation_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_deliveries_unique_recovery_request ON deliveries(recovery_request_id);

CREATE TABLE delivery_qr_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id uuid NOT NULL REFERENCES deliveries(id),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  success boolean NOT NULL,
  failure_reason text CHECK (failure_reason IN (
    'expired', 'revoked', 'already_used', 'invalid', 'membership_missing', 'hash_mismatch'
  )),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_deliveries_recovery_request_id ON deliveries(recovery_request_id);
CREATE INDEX idx_deliveries_qr_token_hash ON deliveries(qr_token_hash);
CREATE INDEX idx_deliveries_qr_expires_at ON deliveries(qr_expires_at);
CREATE INDEX idx_deliveries_delivered_at ON deliveries(delivered_at);
CREATE INDEX idx_delivery_qr_attempts_delivery_id ON delivery_qr_attempts(delivery_id);
CREATE INDEX idx_delivery_qr_attempts_success ON delivery_qr_attempts(success);

-- Función fn_prepare_delivery
CREATE OR REPLACE FUNCTION public.fn_prepare_delivery(
  p_recovery_request_id uuid,
  p_delivery_point text,
  p_qr_expires_at timestamptz,
  p_qr_token_plain text
) RETURNS uuid AS $$
DECLARE
  v_delivery_id uuid;
  v_object_institution_id uuid;
  v_object_id uuid;
  v_preparer_institution_id uuid;
  v_qr_token_hash text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_qr_token_plain IS NULL OR length(trim(p_qr_token_plain)) = 0 THEN
    RAISE EXCEPTION 'El token QR no puede estar vacío';
  END IF;

  IF p_qr_expires_at <= now() THEN
    RAISE EXCEPTION 'La fecha de expiración del QR debe ser futura';
  END IF;

  SELECT o.institution_id, o.id INTO v_object_institution_id, v_object_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Reclamación no encontrada';
  END IF;

  SELECT m.institution_id INTO v_preparer_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
    AND m.role IN ('custody_staff', 'institution_admin')
  LIMIT 1;

  IF v_preparer_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no es personal autorizado en la institución del objeto';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE id = p_recovery_request_id AND state = 'approved'
  ) THEN
    RAISE EXCEPTION 'La reclamación no está aprobada';
  END IF;

  IF EXISTS (SELECT 1 FROM deliveries WHERE recovery_request_id = p_recovery_request_id) THEN
    RAISE EXCEPTION 'Ya existe una entrega para esta reclamación';
  END IF;

  v_qr_token_hash := encode(digest(p_qr_token_plain::bytea, 'sha256'), 'hex');

  INSERT INTO deliveries (
    recovery_request_id, prepared_by, prepared_at, delivery_point,
    qr_token_hash, qr_expires_at, created_at, updated_at
  ) VALUES (
    p_recovery_request_id, auth.uid(), now(), p_delivery_point,
    v_qr_token_hash, p_qr_expires_at, now(), now()
  )
  RETURNING id INTO v_delivery_id;

  UPDATE objects
  SET state = 'delivery_prepared', updated_at = now()
  WHERE id = v_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  ) VALUES (
    v_object_institution_id, auth.uid(), 'delivery.prepare',
    'delivery', v_delivery_id::text,
    jsonb_build_object('delivery_point', p_delivery_point, 'qr_expires_at', p_qr_expires_at),
    now()
  );

  RETURN v_delivery_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_prepare_delivery(uuid, text, timestamptz, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_prepare_delivery(uuid, text, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_prepare_delivery(uuid, text, timestamptz, text) TO authenticated;

-- Función fn_confirm_delivery_qr
CREATE OR REPLACE FUNCTION public.fn_confirm_delivery_qr(
  p_delivery_id uuid,
  p_token_plain text
) RETURNS boolean AS $$
DECLARE
  v_delivery_institution_id uuid;
  v_object_id uuid;
  v_object_state text;
  v_recovery_state text;
  v_actor_institution_id uuid;
  v_token_hash text;
  v_rows_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT o.institution_id, o.id, o.state, rr.state INTO
    v_delivery_institution_id, v_object_id, v_object_state, v_recovery_state
  FROM deliveries d
  JOIN recovery_requests rr ON rr.id = d.recovery_request_id
  JOIN objects o ON o.id = rr.object_id
  WHERE d.id = p_delivery_id;

  IF v_delivery_institution_id IS NULL THEN
    RAISE EXCEPTION 'Entrega no encontrada o no autorizada';
  END IF;

  IF v_recovery_state <> 'approved' THEN
    RAISE EXCEPTION 'La reclamación asociada no está aprobada';
  END IF;

  IF v_object_state <> 'delivery_prepared' THEN
    RAISE EXCEPTION 'El objeto no está en estado de entrega preparada';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_delivery_institution_id
    AND m.is_active = true
    AND m.role IN ('custody_staff', 'institution_admin')
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene permisos en la institución de la entrega';
  END IF;

  v_token_hash := encode(digest(p_token_plain::bytea, 'sha256'), 'hex');

  UPDATE deliveries
  SET delivered_at = now(),
      delivered_by = auth.uid(),
      delivery_confirmed_at = now(),
      updated_at = now()
  WHERE id = p_delivery_id
    AND delivered_at IS NULL
    AND qr_revoked_at IS NULL
    AND qr_expires_at > now()
    AND qr_token_hash = v_token_hash;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    INSERT INTO public.delivery_qr_attempts (
      delivery_id, attempted_at, success, failure_reason, created_at
    )
    VALUES (
      p_delivery_id, now(), false,
      CASE
        WHEN NOT EXISTS (SELECT 1 FROM deliveries WHERE id = p_delivery_id AND qr_token_hash = v_token_hash) THEN 'hash_mismatch'
        WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = p_delivery_id AND delivered_at IS NOT NULL) THEN 'already_used'
        WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = p_delivery_id AND qr_revoked_at IS NOT NULL) THEN 'revoked'
        WHEN EXISTS (SELECT 1 FROM deliveries WHERE id = p_delivery_id AND qr_expires_at <= now()) THEN 'expired'
        ELSE 'invalid'
      END,
      now()
    );

    INSERT INTO public.audit_log (
      institution_id, actor_id, action, entity_type, entity_id,
      new_values, created_at
    )
    VALUES (
      v_delivery_institution_id, auth.uid(), 'delivery.confirm.failed',
      'delivery', p_delivery_id::text,
      jsonb_build_object('reason', 'qr_validation_failed'),
      now()
    );

    RETURN false;
  END IF;

  UPDATE objects
  SET state = 'delivered', updated_at = now()
  WHERE id = v_object_id;

  INSERT INTO public.delivery_qr_attempts (
    delivery_id, attempted_at, success, failure_reason, created_at
  ) VALUES (p_delivery_id, now(), true, NULL, now());

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  ) VALUES (
    v_delivery_institution_id, auth.uid(), 'delivery.confirm',
    'delivery', p_delivery_id::text,
    jsonb_build_object('delivered_at', now(), 'delivered_by', auth.uid()),
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) TO authenticated;

-- Función fn_revoke_qr
CREATE OR REPLACE FUNCTION public.fn_revoke_qr(
  p_delivery_id uuid
) RETURNS boolean AS $$
DECLARE
  v_delivery_institution_id uuid;
  v_object_id uuid;
  v_actor_institution_id uuid;
  v_rows_updated integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT o.institution_id, o.id INTO v_delivery_institution_id, v_object_id
  FROM deliveries d
  JOIN recovery_requests rr ON rr.id = d.recovery_request_id
  JOIN objects o ON o.id = rr.object_id
  WHERE d.id = p_delivery_id AND d.delivered_at IS NULL;

  IF v_delivery_institution_id IS NULL THEN
    RAISE EXCEPTION 'Entrega no encontrada o ya entregada';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_delivery_institution_id
    AND m.is_active = true
    AND m.role IN ('custody_staff', 'institution_admin')
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene permisos para revocar en esta institución';
  END IF;

  UPDATE deliveries
  SET qr_revoked_at = now(), updated_at = now()
  WHERE id = p_delivery_id AND qr_revoked_at IS NULL AND delivered_at IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'No se pudo revocar el QR: ya fue entregado o ya estaba revocado';
  END IF;

  UPDATE objects
  SET state = 'delivery_prepared', updated_at = now()
  WHERE id = v_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_delivery_institution_id, auth.uid(), 'delivery.revoke',
    'delivery', p_delivery_id::text,
    jsonb_build_object('revoked_at', now()),
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_revoke_qr(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.fn_revoke_qr(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_revoke_qr(uuid) TO authenticated;

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_qr_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY deliveries_select_claimant ON deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM recovery_requests rr
      WHERE rr.id = deliveries.recovery_request_id
        AND rr.claimant_id = auth.uid()
    )
  );

CREATE POLICY deliveries_select_institution ON deliveries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN recovery_requests rr ON rr.id = deliveries.recovery_request_id
      JOIN objects o ON o.id = rr.object_id
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = o.institution_id
        AND m.is_active = true
    )
  );

CREATE POLICY delivery_qr_attempts_select_institution ON delivery_qr_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM memberships m
      JOIN deliveries d ON d.id = delivery_qr_attempts.delivery_id
      JOIN recovery_requests rr ON rr.id = d.recovery_request_id
      JOIN objects o ON o.id = rr.object_id
      WHERE m.profile_id = auth.uid()
        AND m.institution_id = o.institution_id
        AND m.is_active = true
    )
  );

CREATE POLICY delivery_qr_attempts_select_claimant ON delivery_qr_attempts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM deliveries d
      JOIN recovery_requests rr ON rr.id = d.recovery_request_id
      WHERE d.id = delivery_qr_attempts.delivery_id
        AND rr.claimant_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- PASO 6: MIGRACIÓN 006 - Auditoría, administradores globales y funciones de servidor
-- ----------------------------------------------------------------------------
-- Migración 006: Auditoría, administradores globales y funciones de servidor
-- Propósito: trazabilidad inmutable, tabla de administradores globales y funciones de servidor
-- para crear objetos, membresías, cambiar estados y revisar reclamaciones.
-- Dependencias: 001, 002, 003, 004, 005.

CREATE TABLE platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX idx_platform_admins_unique_profile ON platform_admins(profile_id)
  WHERE is_active = true;

CREATE INDEX idx_platform_admins_profile_id ON platform_admins(profile_id);

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_admins_select_own ON platform_admins
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id AND is_active = true);

-- Función fn_is_platform_admin
CREATE OR REPLACE FUNCTION public.fn_is_platform_admin()
RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE profile_id = auth.uid() AND is_active = true
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_is_platform_admin() FROM anon;
REVOKE ALL ON FUNCTION public.fn_is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_is_platform_admin() TO authenticated;

-- Función fn_create_object (actualizada con image_path en migración 009)
CREATE OR REPLACE FUNCTION public.fn_create_object(
  p_kind text,
  p_title text,
  p_description text,
  p_zone text,
  p_location text,
  p_category_id uuid,
  p_reference_code text,
  p_image_path text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_object_id uuid;
  v_actor_institution_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_kind NOT IN ('lost', 'found') THEN
    RAISE EXCEPTION 'Tipo de objeto invalido: debe ser lost o found';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en ninguna institucion';
  END IF;

  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = p_category_id
        AND (c.institution_id IS NULL OR c.institution_id = v_actor_institution_id)
        AND c.is_active = true
    ) THEN
      RAISE EXCEPTION 'Categoria no valida o no disponible para esta institucion';
    END IF;
  END IF;

  INSERT INTO objects (
    institution_id, kind, title, description, zone, location,
    category_id, reporter_id, reported_at, state, reference_code,
    image_path, created_at, updated_at
  )
  VALUES (
    v_actor_institution_id, p_kind, p_title, p_description, p_zone, p_location,
    p_category_id, auth.uid(), now(), 'reported', p_reference_code,
    p_image_path, now(), now()
  )
  RETURNING id INTO v_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_actor_institution_id, auth.uid(), 'object.create',
    'object', v_object_id::text,
    jsonb_build_object('kind', p_kind, 'title', p_title, 'reference_code', p_reference_code, 'image_path', p_image_path),
    now()
  );

  RETURN v_object_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) TO authenticated;

-- Función fn_create_membership
CREATE OR REPLACE FUNCTION public.fn_create_membership(
  p_profile_id uuid,
  p_institution_id uuid,
  p_campus_id uuid,
  p_role text,
  p_is_primary boolean
) RETURNS uuid AS $$
DECLARE
  v_membership_id uuid;
  v_actor_institution_id uuid;
  v_actor_role text;
  v_target_exists boolean;
  v_is_platform_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_role NOT IN ('student', 'custody_staff', 'reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Rol no valido';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE profile_id = auth.uid() AND is_active = true
  ) INTO v_is_platform_admin;

  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
    AND m.role = 'institution_admin'
  LIMIT 1;

  IF v_is_platform_admin THEN
    NULL;
  ELSIF v_actor_role = 'institution_admin' THEN
    IF v_actor_institution_id <> p_institution_id THEN
      RAISE EXCEPTION 'El actor no puede crear membresías en otra institución';
    END IF;
  ELSE
    RAISE EXCEPTION 'El usuario no tiene permisos para crear membresías';
  END IF;

  IF auth.uid() = p_profile_id AND p_role IN ('institution_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'No se puede auto-asignar rol privilegiado';
  END IF;

  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'El perfil destino no existe';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM institutions WHERE id = p_institution_id AND is_active = true) THEN
    RAISE EXCEPTION 'Institución no encontrada o inactiva';
  END IF;

  IF p_campus_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM campuses WHERE id = p_campus_id AND institution_id = p_institution_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Campus no válido para esta institución';
    END IF;
  END IF;

  INSERT INTO memberships (
    profile_id, institution_id, campus_id, role, is_primary, is_active,
    created_at, updated_at
  )
  VALUES (
    p_profile_id, p_institution_id, p_campus_id, p_role, p_is_primary, true,
    now(), now()
  )
  RETURNING id INTO v_membership_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    p_institution_id, auth.uid(), 'membership.create',
    'membership', v_membership_id::text,
    jsonb_build_object('role', p_role, 'profile_id', p_profile_id, 'institution_id', p_institution_id),
    now()
  );

  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_membership(uuid, uuid, uuid, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.fn_create_membership(uuid, uuid, uuid, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_membership(uuid, uuid, uuid, text, boolean) TO authenticated;

-- Función fn_change_object_state
CREATE OR REPLACE FUNCTION public.fn_change_object_state(
  p_object_id uuid,
  p_new_state text
) RETURNS void AS $$
DECLARE
  v_object_kind text;
  v_object_state text;
  v_object_institution_id uuid;
  v_reporter_id uuid;
  v_actor_institution_id uuid;
  v_actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT o.kind, o.state, o.institution_id, o.reporter_id
  INTO v_object_kind, v_object_state, v_object_institution_id, v_reporter_id
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  IF v_object_state = 'reported' AND p_new_state = 'under_review' THEN
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revisión o admin pueden revisar un reporte';
    END IF;
  ELSIF v_object_state = 'under_review' AND p_new_state = 'in_custody' THEN
    IF v_object_kind <> 'found' THEN
      RAISE EXCEPTION 'Solo objetos encontrados pueden entrar en custodia';
    END IF;
    IF v_actor_role <> 'custody_staff' THEN
      RAISE EXCEPTION 'Solo personal de custodia puede recibir objetos';
    END IF;
  ELSIF v_object_state = 'under_review' AND p_new_state = 'published' THEN
    IF v_object_kind = 'found' THEN
      RAISE EXCEPTION 'Objetos encontrados requieren custodia física antes de publicarse';
    END IF;
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revisión o admin pueden publicar';
    END IF;
  ELSIF v_object_state = 'under_review' AND p_new_state = 'rejected' THEN
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revisión o admin pueden rechazar';
    END IF;
  ELSIF v_object_state = 'published' AND p_new_state = 'claimed' THEN
    RAISE EXCEPTION 'Use fn_create_recovery_request para reclamar un objeto';
  ELSIF v_object_state = 'claimed' AND p_new_state = 'approved' THEN
    IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo revisión o admin pueden aprobar reclamaciones';
    END IF;
  ELSIF v_object_state = 'claimed' AND p_new_state = 'rejected' THEN
    IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo revisión o admin pueden rechazar reclamaciones';
    END IF;
  ELSIF v_object_state = 'approved' AND p_new_state = 'delivery_prepared' THEN
    IF v_actor_role <> 'custody_staff' THEN
      RAISE EXCEPTION 'Solo personal de custodia puede preparar entregas';
    END IF;
  ELSIF v_object_state = 'delivery_prepared' AND p_new_state = 'delivered' THEN
    IF v_actor_role <> 'custody_staff' THEN
      RAISE EXCEPTION 'Solo personal de custodia puede confirmar entregas';
    END IF;
  ELSIF v_object_state = 'delivered' AND p_new_state = 'closed' THEN
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revisión o admin pueden cerrar procesos';
    END IF;
  ELSIF v_object_state = 'published' AND p_new_state = 'unclaimed' THEN
    IF v_actor_role <> 'institution_admin' THEN
      RAISE EXCEPTION 'Solo admin de institución puede declarar objetos no reclamados';
    END IF;
  ELSE
    RAISE EXCEPTION 'Transición no permitida: % -> %', v_object_state, p_new_state;
  END IF;

  UPDATE objects SET state = p_new_state, updated_at = now() WHERE id = p_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_object_institution_id, auth.uid(), 'object.state_change',
    'object', p_object_id::text,
    jsonb_build_object('from_state', v_object_state, 'to_state', p_new_state),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_change_object_state(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_change_object_state(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_change_object_state(uuid, text) TO authenticated;

-- Función fn_review_recovery_request
CREATE OR REPLACE FUNCTION public.fn_review_recovery_request(
  p_recovery_request_id uuid,
  p_decision text,
  p_review_notes text,
  p_decision_reason text
) RETURNS void AS $$
DECLARE
  v_recovery_request_state text;
  v_object_institution_id uuid;
  v_object_id uuid;
  v_actor_institution_id uuid;
  v_actor_role text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_decision NOT IN ('approved', 'rejected', 'needs_more_info') THEN
    RAISE EXCEPTION 'Decisión no válida';
  END IF;

  SELECT rr.state, o.institution_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_object_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Reclamación no encontrada';
  END IF;

  IF v_recovery_request_state <> 'pending' THEN
    RAISE EXCEPTION 'La reclamación ya fue resuelta';
  END IF;

  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Solo personal de revisión o admin pueden decidir reclamaciones';
  END IF;

  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE id = p_recovery_request_id AND claimant_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No se puede revisar una reclamación propia';
  END IF;

  UPDATE recovery_requests
  SET state = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = p_review_notes, decision_reason = p_decision_reason,
      updated_at = now()
  WHERE id = p_recovery_request_id;

  INSERT INTO recovery_reviews (
    recovery_request_id, reviewer_id, decision, notes, decided_at, created_at
  )
  VALUES (
    p_recovery_request_id, auth.uid(), p_decision, p_review_notes, now(), now()
  );

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_object_institution_id, auth.uid(), 'recovery_request.review',
    'recovery_request', p_recovery_request_id::text,
    jsonb_build_object('decision', p_decision, 'reason', p_decision_reason),
    now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_review_recovery_request(uuid, text, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_review_recovery_request(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_review_recovery_request(uuid, text, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- PASO 7: MIGRACIÓN 007 - Corrección de bugs en RLS y funciones
-- ----------------------------------------------------------------------------
-- Migración 007: Corrección de bugs en RLS y funciones
-- Dependencias: 006.

DROP POLICY IF EXISTS memberships_select_institution_admin ON memberships;

CREATE POLICY memberships_select_institution_admin ON memberships
  FOR SELECT TO authenticated
  USING (
    public.fn_is_institution_admin(memberships.institution_id)
  );

ALTER TABLE recovery_reviews DROP CONSTRAINT IF EXISTS recovery_reviews_decision_check;
ALTER TABLE recovery_reviews ADD CONSTRAINT recovery_reviews_decision_check
  CHECK (decision = ANY (ARRAY['approved', 'rejected', 'needs_more_info', 'needs_more_info_response']));

-- ----------------------------------------------------------------------------
-- PASO 8: MIGRACIÓN 008 - Acceso controlado a audit_log
-- ----------------------------------------------------------------------------
-- Migración 008: Acceso controlado a audit_log
-- Dependencias: 006, 007.

CREATE OR REPLACE FUNCTION public.fn_can_read_audit_log(p_institution_id uuid)
RETURNS boolean AS $$
DECLARE
  v_result boolean;
BEGIN
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

CREATE POLICY audit_log_select_platform_admin ON audit_log
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.profile_id = auth.uid()
        AND pa.is_active = true
    )
  );

CREATE POLICY audit_log_select_institution ON audit_log
  FOR SELECT TO authenticated
  USING (
    public.fn_can_read_audit_log(audit_log.institution_id)
  );

-- ----------------------------------------------------------------------------
-- PASO 9: MIGRACIÓN 009 - Soporte para imágenes en objetos
-- ----------------------------------------------------------------------------
-- Migración 009: Agregar soporte para imágenes en objetos
-- Dependencias: 008.

ALTER TABLE objects ADD COLUMN IF NOT EXISTS image_path text;

CREATE OR REPLACE FUNCTION public.fn_create_object(
  p_kind text,
  p_title text,
  p_description text,
  p_zone text,
  p_location text,
  p_category_id uuid,
  p_reference_code text,
  p_image_path text DEFAULT NULL
) RETURNS uuid AS $$
DECLARE
  v_object_id uuid;
  v_actor_institution_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_kind NOT IN ('lost', 'found') THEN
    RAISE EXCEPTION 'Tipo de objeto invalido: debe ser lost o found';
  END IF;

  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en ninguna institucion';
  END IF;

  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = p_category_id
        AND (c.institution_id IS NULL OR c.institution_id = v_actor_institution_id)
        AND c.is_active = true
    ) THEN
      RAISE EXCEPTION 'Categoria no valida o no disponible para esta institucion';
    END IF;
  END IF;

  INSERT INTO objects (
    institution_id, kind, title, description, zone, location,
    category_id, reporter_id, reported_at, state, reference_code,
    image_path, created_at, updated_at
  )
  VALUES (
    v_actor_institution_id, p_kind, p_title, p_description, p_zone, p_location,
    p_category_id, auth.uid(), now(), 'reported', p_reference_code,
    p_image_path, now(), now()
  )
  RETURNING id INTO v_object_id;

  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_actor_institution_id, auth.uid(), 'object.create',
    'object', v_object_id::text,
    jsonb_build_object('kind', p_kind, 'title', p_title, 'reference_code', p_reference_code, 'image_path', p_image_path),
    now()
  );

  RETURN v_object_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text, text) TO authenticated;

-- ----------------------------------------------------------------------------
-- PASO 10: STORAGE - Creación del bucket object-images y políticas RLS
-- ----------------------------------------------------------------------------
-- Crear bucket privado para imágenes de objetos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'object-images',
  'object-images',
  false,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Habilitar RLS en storage.objects (ya está habilitado por defecto en Supabase)
-- Política SELECT: lectura pública de imágenes de objetos publicados
CREATE POLICY storage_select_published_object_images ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'object-images'
    AND EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = (storage.foldername(name))[1]::uuid
        AND o.state = 'published'
        AND EXISTS (
          SELECT 1 FROM institutions i
          WHERE i.id = o.institution_id AND i.is_active = true
        )
    )
  );

-- Política INSERT: solo usuarios autenticados con membresía activa pueden subir
CREATE POLICY storage_insert_object_images ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'object-images'
    AND EXISTS (
      SELECT 1 FROM memberships m
      WHERE m.profile_id = auth.uid()
        AND m.is_active = true
    )
  );

-- Política UPDATE/DELETE: solo dueño del objeto o admin de la institución
CREATE POLICY storage_update_delete_object_images ON storage.objects
  FOR UPDATE, DELETE TO authenticated
  USING (
    bucket_id = 'object-images'
    AND (
      (storage.foldername(name))[1]::uuid IN (
        SELECT object_id FROM objects o
        WHERE o.reporter_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.profile_id = auth.uid()
          AND m.role IN ('institution_admin', 'custody_staff', 'reviewer')
          AND m.is_active = true
          AND m.institution_id = (
            SELECT institution_id FROM objects
            WHERE id = (storage.foldername(name))[1]::uuid
          )
      )
    )
  );

-- ----------------------------------------------------------------------------
-- FIN DEL SCRIPT
-- ============================================================================
-- Verificación de migraciones aplicadas:
-- SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
--
-- Verificación de RLS activo en todas las tablas:
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (
--   'institutions','campuses','profiles','profiles_private','memberships',
--   'categories','objects','object_files','custody_records','recovery_requests',
--   'recovery_reviews','audit_log','deliveries','delivery_qr_attempts',
--   'platform_admins'
-- ) AND relrowsecurity = true;
-- ============================================================================