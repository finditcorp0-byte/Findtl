-- Migración 006: Auditoría, administradores globales y funciones de servidor faltantes
-- Propósito: trazabilidad inmutable, tabla de administradores globales y funciones de servidor
-- para crear objetos, membresías, cambiar estados y revisar reclamaciones.
-- Dependencias: 001 (instituciones), 002 (profiles), 003 (objetos), 004 (custodia, reclamaciones, audit_log), 005 (entregas).
-- Riesgos: bajo.
-- Reversión: DROP TABLE platform_admins;

-- ============================================================
-- Tablas
-- ============================================================

CREATE TABLE platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX idx_platform_admins_unique_profile ON platform_admins(profile_id)
  WHERE is_active = true;

-- Índices
CREATE INDEX idx_platform_admins_profile_id ON platform_admins(profile_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- platform_admins: lectura de propia fila solo por el perfil correspondiente (platform_admin).
-- Ninguna política permite a un autenticado leer toda la tabla.
CREATE POLICY platform_admins_select_own ON platform_admins
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id AND is_active = true);

-- platform_admins: ninguna política INSERT/UPDATE/DELETE directa para clientes.
-- RLS deniega por defecto. El rol platform_admin se gestiona únicamente vía funciones
-- de servidor o inserción directa por plataforma (service_role), nunca desde el navegador.

-- audit_log: revisión de consistencia. Las políticas ya creadas en 004 se mantienen:
-- - lectura de auditoría propia, de la institución (admin), o global (platform_admin)
-- - escritura: solo el sistema (triggers o funciones de servidor). Nunca un cliente.

-- ============================================================
-- Función: verificar si un perfil es platform_admin (activo).
-- SECURITY DEFINER: lee platform_admins sin exponer la tabla directamente.
-- Puede ser llamada por institution_admin para verificar roles sin RLS recursion.
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_is_platform_admin(
  p_profile_id uuid
) RETURNS boolean AS $$
DECLARE
  v_is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE profile_id = p_profile_id AND is_active = true
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_is_platform_admin(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_is_platform_admin(uuid) TO authenticated;

-- ============================================================
-- Funciones de servidor faltantes (SECURITY DEFINER)
-- ============================================================

-- Función: crear objeto (reportar perdido/encontrado).
-- Cualquier usuario autenticado con membresía activa puede crear un objeto en su institución.
-- El institution_id se inyecta desde la membresía, no del cliente.
CREATE OR REPLACE FUNCTION public.fn_create_object(
  p_kind text,
  p_title text,
  p_description text,
  p_zone text,
  p_location text,
  p_category_id uuid,
  p_reference_code text
) RETURNS uuid AS $$
DECLARE
  v_object_id uuid;
  v_actor_institution_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  IF p_kind NOT IN ('lost', 'found') THEN
    RAISE EXCEPTION 'Tipo de objeto inválido: debe ser lost o found';
  END IF;

  -- Obtener institución del actor a través de membresía activa
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en ninguna institución';
  END IF;

  -- Validar que la categoría pertenezca a la institución o sea global
  IF p_category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = p_category_id
        AND (c.institution_id IS NULL OR c.institution_id = v_actor_institution_id)
        AND c.is_active = true
    ) THEN
      RAISE EXCEPTION 'Categoría no válida o no disponible para esta institución';
    END IF;
  END IF;

  -- Insertar objeto con institution_id inyectado desde membresía
  INSERT INTO objects (
    institution_id, kind, title, description, zone, location,
    category_id, reporter_id, reported_at, state, reference_code,
    created_at, updated_at
  )
  VALUES (
    v_actor_institution_id, p_kind, p_title, p_description, p_zone, p_location,
    p_category_id, auth.uid(), now(), 'reported', p_reference_code,
    now(), now()
  )
  RETURNING id INTO v_object_id;

  -- Registrar en auditoría
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_actor_institution_id, auth.uid(), 'object.create',
    'object', v_object_id::text,
    jsonb_build_object('kind', p_kind, 'title', p_title, 'reference_code', p_reference_code),
    now()
  );

  RETURN v_object_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text) TO authenticated;

-- Función: crear membresía (solo institution_admin de la misma institución o platform_admin).
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
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar rol permitido
  IF p_role NOT IN ('student', 'custody_staff', 'reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Rol no válido';
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

  -- Solo institution_admin de la misma institución o platform_admin pueden crear membresías
  IF v_actor_role = 'institution_admin' THEN
    IF v_actor_institution_id <> p_institution_id THEN
      RAISE EXCEPTION 'El actor no puede crear membresías en otra institución';
    END IF;
  ELSIF v_actor_role <> 'platform_admin' THEN
    RAISE EXCEPTION 'El usuario no tiene permisos para crear membresías';
  END IF;

  -- Prevenir auto-escalada: un usuario no puede asignarse rol privilegiado a sí mismo
  IF auth.uid() = p_profile_id AND p_role IN ('institution_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'No se puede auto-asignar rol privilegiado';
  END IF;

  -- Validar que el perfil destino exista
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'El perfil destino no existe';
  END IF;

  -- Validar que la institución exista y esté activa
  IF NOT EXISTS (SELECT 1 FROM institutions WHERE id = p_institution_id AND is_active = true) THEN
    RAISE EXCEPTION 'Institución no encontrada o inactiva';
  END IF;

  -- Validar campus si se proporciona
  IF p_campus_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM campuses WHERE id = p_campus_id AND institution_id = p_institution_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Campus no válido para esta institución';
    END IF;
  END IF;

  -- Insertar membresía
  INSERT INTO memberships (
    profile_id, institution_id, campus_id, role, is_primary, is_active,
    created_at, updated_at
  )
  VALUES (
    p_profile_id, p_institution_id, p_campus_id, p_role, p_is_primary, true,
    now(), now()
  )
  RETURNING id INTO v_membership_id;

  -- Registrar en auditoría
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
GRANT EXECUTE ON FUNCTION public.fn_create_membership(uuid, uuid, uuid, text, boolean) TO authenticated;

-- Función: cambiar estado de objeto según flujo autorizado.
-- Valida transiciones permitidas y actor autorizado.
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
  v_has_custody boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener datos del objeto
  SELECT o.kind, o.state, o.institution_id, o.reporter_id
  INTO v_object_kind, v_object_state, v_object_institution_id, v_reporter_id
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  -- Obtener institución y rol del actor
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  -- Validar transición según flujo
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
    -- Esta transición la hace el estudiante al crear una reclamación, no vía esta función
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

  -- Actualizar estado
  UPDATE objects SET state = p_new_state, updated_at = now() WHERE id = p_object_id;

  -- Registrar en auditoría
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
GRANT EXECUTE ON FUNCTION public.fn_change_object_state(uuid, text) TO authenticated;

-- Función: revisar reclamación (aprobar/rechazar/necesita más info).
-- Solo reviewer o institution_admin de la misma institución.
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

  -- Obtener estado de reclamación, institución del objeto y id del objeto
  SELECT rr.state, o.institution_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_object_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Reclamación no encontrada';
  END IF;

  -- Validar que la reclamación esté pendiente
  IF v_recovery_request_state <> 'pending' THEN
    RAISE EXCEPTION 'La reclamación ya fue resuelta';
  END IF;

  -- Obtener institución y rol del actor
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  -- Solo reviewer o institution_admin pueden revisar
  IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Solo personal de revisión o admin pueden decidir reclamaciones';
  END IF;

  -- Prevenir auto-aprobación: el revisor no puede ser el claimant
  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE id = p_recovery_request_id AND claimant_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No se puede revisar una reclamación propia';
  END IF;

  -- Actualizar reclamación
  UPDATE recovery_requests
  SET state = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = p_review_notes, decision_reason = p_decision_reason,
      updated_at = now()
  WHERE id = p_recovery_request_id;

  -- Insertar revisión en historial inmutable
  INSERT INTO recovery_reviews (
    recovery_request_id, reviewer_id, decision, notes, decided_at, created_at
  )
  VALUES (
    p_recovery_request_id, auth.uid(), p_decision, p_review_notes, now(), now()
  );

  -- Registrar en auditoría
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
GRANT EXECUTE ON FUNCTION public.fn_review_recovery_request(uuid, text, text, text) TO authenticated;

-- Función: crear reclamación de recuperación (estudiante reporta objeto perdido/encontrado).
-- Cualquier usuario autenticado con membresía activa en la institución del objeto
-- puede crear una solicitud sobre un objeto publicado.
-- El institution_id se deriva de la membresía del actor, no del cliente.
-- No aprueba automáticamente: la solicitud queda en estado 'pending'.
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

  -- Obtener institución y estado del objeto
  SELECT o.institution_id, o.state INTO v_object_institution_id, v_object_state
  FROM objects o WHERE o.id = p_object_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Objeto no encontrado';
  END IF;

  -- Validar que el objeto esté publicado y sea reclamable
  IF v_object_state <> 'published' THEN
    RAISE EXCEPTION 'El objeto no está disponible para reclamación';
  END IF;

  -- Validar que el actor tiene membresía activa en la institución del objeto
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresía activa en la institución del objeto';
  END IF;

  -- Validar que no exista ya una solicitud pendiente para este usuario y objeto
  -- (el índice parcial también lo impide a nivel de BD, pero validamos explícitamente)
  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE object_id = p_object_id
      AND claimant_id = auth.uid()
      AND state = 'pending'
  ) THEN
    RAISE EXCEPTION 'Ya existe una solicitud pendiente para este objeto y usuario';
  END IF;

  -- Insertar reclamación con claimant_id = auth.uid() (sin impersonación)
  INSERT INTO recovery_requests (
    object_id, claimant_id, claimed_at, description, contact_preference,
    state, created_at, updated_at
  )
  VALUES (
    p_object_id, auth.uid(), now(), p_description, p_contact_preference,
    'pending', now(), now()
  )
  RETURNING id INTO v_recovery_request_id;

  -- Registrar en auditoría
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
GRANT EXECUTE ON FUNCTION public.fn_create_recovery_request(uuid, text, text) TO authenticated;

-- ============================================================
-- Revisión de consistencia de políticas RLS (migraciones 001-005)
-- ============================================================
-- Esta migración revisa que no existan políticas excesivamente permisivas
-- en las tablas creadas anteriormente. Cada política RLS creada en migraciones
-- previas ya es restrictiva por diseño (denegar por defecto, permitir solo
-- lo estrictamente necesario).

-- Nota: No se alteran políticas existentes aquí; esta migración sirve como
-- punto de revisión y como ubicación de las tablas de plataforma y funciones
-- de servidor faltantes.

-- ============================================================
-- Pruebas de aceptación (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 6.1: Ninguna política RLS permite SELECT * a todos los autenticados en tablas privadas.
-- (SELECT * FROM recovery_requests como usuario sin membresía en esa institución -- debe devolver 0 filas)

-- Prueba 6.2: audit_log no se puede editar ni eliminar por usuarios ordinarios.
-- (UPDATE audit_log SET ... -- debe fallar con RLS)
-- (DELETE FROM audit_log -- debe fallar con RLS)

-- Prueba 6.3: platform_admins no es accesible directamente desde el cliente.
-- (SELECT * FROM platform_admins -- debe devolver 0 filas o fallar con RLS)

-- Prueba 6.4: Un usuario de institución A no puede ver audit_log de institución B.
-- (SELECT * FROM audit_log WHERE institution_id = 'institucion-B' -- debe devolver 0 filas para usuario de A)

-- Prueba 6.5: fn_create_object inyecta institution_id desde membresía, no del cliente.
-- (Intentar llamar con institution_id de otra institución -- debe usar la del actor)

-- Prueba 6.6: fn_review_recovery_request impide auto-aprobación.
-- (Intentar revisar propia reclamación -- debe fallar)

-- Prueba 6.7: fn_change_object_state rechaza transiciones inválidas.
-- (Intentar reported -> delivered directamente -- debe fallar)
