-- Migracion 004: Custodia y reclamaciones
-- Proposito: registrar recepcion fisica, custodia y solicitudes de recuperacion con decisiones manuales.
-- Dependencias: 003 (objetos, object_files), 002 (profiles).
-- Riesgos: medio. La transición under_review -> in_custody debe validarse en trigger o funcion de servidor.
-- Reversion: DROP TABLE recovery_reviews; DROP TABLE recovery_requests; DROP TABLE custody_records; DROP TABLE audit_log;

-- ============================================================
-- Tablas
-- ============================================================

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

-- Un objeto solo tiene un registro de custodia activo.
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

-- Un objeto publicado puede tener varias solicitudes (historico), pero solo una activa (pending o needs_more_info) a la vez.
CREATE UNIQUE INDEX idx_recovery_requests_unique_active
  ON recovery_requests(object_id)
  WHERE state IN ('pending', 'needs_more_info');

CREATE TABLE recovery_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recovery_request_id uuid NOT NULL REFERENCES recovery_requests(id),
  reviewer_id uuid NOT NULL REFERENCES profiles(id),
  decision text NOT NULL CHECK (decision IN ('approved', 'rejected', 'needs_more_info')),
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

-- Indices
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

-- ============================================================
-- Funciones y triggers de integridad institucional (C-1)
-- ============================================================

-- Funcion: valida que received_by tenga membresia activa en la misma institucion que el objeto.
CREATE OR REPLACE FUNCTION public.validate_custody_institution()
RETURNS TRIGGER AS $$
DECLARE
  object_institution_id uuid;
  receiver_institution_id uuid;
BEGIN
  -- Obtener institucion del objeto
  SELECT institution_id INTO object_institution_id
  FROM objects WHERE id = NEW.object_id;

  -- Obtener institucion del receptor a traves de su membresia activa
  SELECT institution_id INTO receiver_institution_id
  FROM memberships
  WHERE profile_id = NEW.received_by
    AND is_active = true
  LIMIT 1;

  IF receiver_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en ninguna institucion';
  END IF;

  IF receiver_institution_id <> object_institution_id THEN
    RAISE EXCEPTION 'El personal de custodia no pertenece a la misma institucion que el objeto';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Trigger: validar institucion antes de crear un registro de custodia.
DROP TRIGGER IF EXISTS trg_validate_custody_institution ON custody_records;
CREATE TRIGGER trg_validate_custody_institution
  BEFORE INSERT ON custody_records
  FOR EACH ROW EXECUTE FUNCTION public.validate_custody_institution();

-- Funcion: valida que un objeto 'found' no se publique sin registro de custodia.
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

-- Trigger: validar publicacion de objetos.
DROP TRIGGER IF EXISTS trg_validate_object_publish ON objects;
CREATE TRIGGER trg_validate_object_publish
  BEFORE UPDATE OF state ON objects
  FOR EACH ROW
  WHEN (NEW.state = 'published' AND OLD.state IS DISTINCT FROM NEW.state)
  EXECUTE FUNCTION public.validate_object_publish();

-- Funcion: crear registro de custodia (solo custody_staff de la misma institucion).
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

  -- Obtener institucion y kind del objeto
  SELECT o.institution_id, o.kind INTO v_object_institution_id, v_object_kind
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  -- Validar que el actor es custody_staff en la misma institucion
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
    AND m.role = 'custody_staff'
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no es personal de custodia en la institucion del objeto';
  END IF;

  -- Solo objetos found pueden entrar en custodia
  IF v_object_kind <> 'found' THEN
    RAISE EXCEPTION 'Solo objetos encontrados pueden registrar custodia fisica';
  END IF;

  -- Validar que no exista ya custodia para este objeto
  IF EXISTS (SELECT 1 FROM custody_records WHERE object_id = p_object_id) THEN
    RAISE EXCEPTION 'El objeto ya tiene registro de custodia';
  END IF;

  -- Insertar custodia
  INSERT INTO custody_records (object_id, received_by, custody_point, condition_notes, received_from, created_at)
  VALUES (p_object_id, auth.uid(), p_custody_point, p_condition_notes, p_received_from, now())
  RETURNING id INTO v_custody_record_id;

  -- Actualizar estado del objeto a in_custody
  UPDATE objects SET state = 'in_custody', updated_at = now() WHERE id = p_object_id;

  -- Registrar en auditoria
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
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

-- Funcion: crear solicitud de recuperacion (estudiante reporta objeto perdido/encontrado).
-- Cualquier usuario autenticado con membresia activa en la institucion del objeto
-- puede crear una solicitud sobre un objeto publicado.
-- El institution_id se deriva de la membresia del actor, no del cliente.
-- No aprueba automaticamente: la solicitud queda en estado 'pending'.
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

  -- Obtener institucion y estado del objeto
  SELECT o.institution_id, o.state INTO v_object_institution_id, v_object_state
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  -- Validar que el objeto este publicado y sea reclamable
  IF v_object_state <> 'published' THEN
    RAISE EXCEPTION 'El objeto no esta disponible para reclamacion';
  END IF;

  -- Validar que el actor tiene membresia activa en la institucion del objeto
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en la institucion del objeto';
  END IF;

  -- Validar que no exista ya una solicitud pendiente para este usuario y objeto
  -- (el indice parcial tambien lo impide a nivel de BD, pero validamos explicitamente)
  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE object_id = p_object_id
      AND claimant_id = auth.uid()
      AND state IN ('pending', 'needs_more_info')
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud activa para este objeto y usuario';
  END IF;

  -- Insertar reclamacion con claimant_id = auth.uid() (sin suplantacion)
  INSERT INTO recovery_requests (
    object_id, claimant_id, claimed_at, description, contact_preference,
    state, created_at, updated_at
  )
  VALUES (
    p_object_id, auth.uid(), now(), p_description, p_contact_preference,
    'pending', now(), now()
  )
  RETURNING id INTO v_recovery_request_id;

  -- Registrar en auditoria
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
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

-- Funcion: responder a una solicitud en estado needs_more_info (estudiante).
-- El estudiante proporciona informacion adicional y la solicitud vuelve a pending.
-- Solo el claimant puede responder, y solo si la solicitud esta en needs_more_info.
CREATE OR REPLACE FUNCTION public.fn_respond_recovery_request(
  p_recovery_request_id uuid,
  p_response text
) RETURNS uuid AS $$
DECLARE
  v_recovery_request_id uuid;
  v_object_institution_id uuid;
  v_claimant_institution_id uuid;
  v_recovery_request_state text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener estado de la reclamacion, institucion del objeto y id del objeto
  SELECT rr.state, o.institution_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_recovery_request_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL OR v_recovery_request_id IS NULL THEN
    RAISE EXCEPTION 'Reclamacion no encontrada';
  END IF;

  -- Validar que la reclamacion esta en needs_more_info
  IF v_recovery_request_state <> 'needs_more_info' THEN
    RAISE EXCEPTION 'Solo se puede responder a una solicitud en estado needs_more_info';
  END IF;

  -- El estudiante que responde debe ser el claimant y estar en la misma institucion
  IF rr.claimant_id <> auth.uid() THEN
    RAISE EXCEPTION 'Solo el reclamante puede responder a esta solicitud';
  END IF;

  -- Validar membresia activa del claimant en la institucion del objeto
  IF NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.profile_id = auth.uid()
      AND m.institution_id = v_object_institution_id
      AND m.is_active = true
  ) THEN
    RAISE EXCEPTION 'El reclamante no tiene membresia activa en la institucion del objeto';
  END IF;

  -- Actualizar la solicitud a pending con la respuesta del estudiante
  UPDATE recovery_requests
  SET state = 'pending',
      description = rr.description || ' [Respuesta del reclamante: ' || p_response || ']',
      updated_at = now()
  WHERE id = p_recovery_request_id
  RETURNING id INTO v_recovery_request_id;

  -- Insertar revision en el historial inmutable
  INSERT INTO recovery_reviews (
    recovery_request_id, reviewer_id, decision, notes, decided_at, created_at
  )
  VALUES (
    v_recovery_request_id, auth.uid(), 'needs_more_info_response',
    p_response, now(), now()
  );

  -- Registrar en auditoria
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
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

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE custody_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE recovery_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- custody_records: lectura solo personal autorizado de la misma institucion.
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

-- custody_records: insercion solo via funcion de servidor (fn_create_custody_record).
-- No hay politica INSERT directa para clientes.

-- custody_records: actualizacion solo creador reciente o admin (vía funcion de servidor).
-- No hay politica UPDATE directa para clientes.

-- recovery_requests: lectura propia del reclamante; personal autorizado de la misma institucion lee todas.
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

-- recovery_requests: insercion solo estudiantes con membresia activa sobre objetos publicados de su institucion.
-- Verificacion explicita de institucion sin LIMIT 1 ambiguo.
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

-- recovery_requests: actualizacion. El claimant puede cancelar su propia solicitud en estado 'pending' o 'needs_more_info'.
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

-- recovery_requests: cambios de estado (approved/rejected/needs_more_info) solo via funcion de servidor (reviewer).
-- No hay politica UPDATE directa para cambiar a approved/rejected/needs_more_info desde el cliente.

-- recovery_reviews: lectura del reclamante de sus propias solicitudes; personal autorizado lee todas.
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

-- recovery_reviews: insercion solo reviewer o institution_admin (vía funcion de servidor).
-- No hay politica INSERT directa para clientes.
-- recovery_reviews: inmutable (no UPDATE/DELETE directo).

-- audit_log: solo lectura para roles humanos; insercion solo mediante funciones de servidor.
-- No hay politica INSERT/UPDATE/DELETE para clientes.

-- ============================================================
-- Pruebas de aceptacion (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 4.1: Una reclamacion no se aprueba automaticamente.
-- (Intentar UPDATE state='approved' directamente en recovery_requests -- debe fallar vía RLS)

-- Prueba 4.2: Objeto 'found' sin custody_records no puede publicarse.
-- (Intentar UPDATE objects SET state='published' WHERE kind='found' sin custody_records -- debe fallar vía trigger)

-- Prueba 4.3: No hay dos solicitudes 'pending' o 'needs_more_info' para el mismo objeto.
-- (Intentar crear dos solicitudes activas para el mismo object_id -- debe fallar por indice parcial)

-- Prueba 4.4: Personal de custodia de institucion A no puede crear custodia para objeto de institucion B.
-- (Intentar INSERT en custody_records con object_id de institucion B y received_by de institucion A -- debe fallar vía trigger)

-- Prueba 4.5: Estudiante no puede crear custodia (solo custody_staff).
-- (Ejecutar fn_create_custody_record como estudiante -- debe fallar)

-- Prueba 4.6: Estudiante puede responder a una solicitud en needs_more_info y vuelve a pending.
-- (Ejecutar fn_respond_recovery_request como claimant cuando estado es needs_more_info -- estado pasa a pending)

-- Prueba 4.7: Estudiante no puede responder a una solicitud ajena.
-- (Ejecutar fn_respond_recovery_request con reclamacion de otro usuario -- debe fallar)
