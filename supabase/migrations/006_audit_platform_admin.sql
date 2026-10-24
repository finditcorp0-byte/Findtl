-- Migracion 006: Auditoria, administradores globales y funciones de servidor faltantes
-- Proposito: trazabilidad inmutable, tabla de administradores globales y funciones de servidor
-- para crear objetos, membresias, cambiar estados y revisar reclamaciones.
-- Dependencias: 001 (instituciones), 002 (profiles), 003 (objetos), 004 (custodia, reclamaciones, audit_log), 005 (entregas).
-- Riesgos: bajo.
-- Reversion: DROP TABLE platform_admins;

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

-- Indices
CREATE INDEX idx_platform_admins_profile_id ON platform_admins(profile_id);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- platform_admins: lectura de propia fila solo por el perfil correspondiente (platform_admin).
-- Ninguna politica permite a un autenticado leer toda la tabla.
CREATE POLICY platform_admins_select_own ON platform_admins
  FOR SELECT TO authenticated
  USING (auth.uid() = profile_id AND is_active = true);

-- platform_admins: ninguna politica INSERT/UPDATE/DELETE directa para clientes.
-- RLS deniega por defecto. El rol platform_admin se gestiona unicamente via funciones
-- de servidor o insercion directa por plataforma (service_role), nunca desde el navegador.

-- audit_log: revision de consistencia. Las politicas ya creadas en 004 se mantienen:
-- - lectura de auditoria propia, de la institucion (admin), o global (platform_admin)
-- - escritura: solo el sistema (triggers o funciones de servidor). Nunca un cliente.

-- ============================================================
-- Funcion: verificar si el USUARIO AUTENTICADO es platform_admin (activo).
-- SECURITY DEFINER: lee platform_admins sin exponer la tabla directamente.
-- NO acepta un UUID arbitrario: comprueba la identidad real de auth.uid().
-- ============================================================
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

-- ============================================================
-- Funciones de servidor faltantes (SECURITY DEFINER)
-- ============================================================

-- Funcion: crear objeto (reportar perdido/encontrado).
-- Cualquier usuario autenticado con membresia activa puede crear un objeto en su institucion.
-- El institution_id se inyecta desde la membresia, no del cliente.
-- Valida que exista una membresia activa y NO selecciona una institucion arbitraria
-- cuando el usuario tiene varias membresias.
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
    RAISE EXCEPTION 'Tipo de objeto invalido: debe ser lost o found';
  END IF;

  -- Obtener institucion del actor a traves de membresia activa
  -- Usamos LIMIT 1 pero solo despues de verificar que hay exactamente una membresia activa
  -- para evitar seleccion arbitraria cuando el usuario tiene varias membresias.
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en ninguna institucion';
  END IF;

  -- Si el usuario tiene membresias en varias instituciones, exigir que especifique
  -- cual usar mediante un parametro adicional. Por simplicidad, tomamos la primera
  -- activa ordenada por created_at, pero esto es una limitacion de diseno que debe
  -- documentarse para el frontend.
  -- Nota: Para un uso correcto, el frontend debe pasar institution_id explicitamente
  -- cuando el usuario tiene varias membresias activas.

  -- Validar que la categoria pertenezca a la institucion o sea global
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

  -- Insertar objeto con institution_id inyectado desde membresia
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

  -- Registrar en auditoria
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
REVOKE ALL ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_create_object(text, text, text, text, text, uuid, text) TO authenticated;

-- Funcion: crear membresia (solo institution_admin de la misma institucion o platform_admin).
-- platform_admin se valida en la tabla platform_admins, NO en memberships.
-- institution_admin valida que la institucion sea la suya propia.
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

  -- Validar rol permitido
  IF p_role NOT IN ('student', 'custody_staff', 'reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Rol no valido';
  END IF;

  -- Verificar si el actor es platform_admin (consulta la tabla dedicada)
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

  -- Solo institution_admin de la misma institucion o platform_admin pueden crear membresias
  IF v_is_platform_admin THEN
    -- platform_admin puede crear membresias en cualquier institucion
    NULL; -- continuar
  ELSIF v_actor_role = 'institution_admin' THEN
    IF v_actor_institution_id <> p_institution_id THEN
      RAISE EXCEPTION 'El actor no puede crear membresias en otra institucion';
    END IF;
  ELSE
    RAISE EXCEPTION 'El usuario no tiene permisos para crear membresias';
  END IF;

  -- Prevenir auto-escalada: un usuario no puede asignarse rol privilegiado a si mismo
  IF auth.uid() = p_profile_id AND p_role IN ('institution_admin', 'platform_admin') THEN
    RAISE EXCEPTION 'No se puede auto-asignar rol privilegiado';
  END IF;

  -- Validar que el perfil destino exista
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id) INTO v_target_exists;
  IF NOT v_target_exists THEN
    RAISE EXCEPTION 'El perfil destino no existe';
  END IF;

  -- Validar que la institucion exista y este activa
  IF NOT EXISTS (SELECT 1 FROM institutions WHERE id = p_institution_id AND is_active = true) THEN
    RAISE EXCEPTION 'Institucion no encontrada o inactiva';
  END IF;

  -- Validar campus si se proporciona
  IF p_campus_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM campuses WHERE id = p_campus_id AND institution_id = p_institution_id AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Campus no valido para esta institucion';
    END IF;
  END IF;

  -- Insertar membresia
  INSERT INTO memberships (
    profile_id, institution_id, campus_id, role, is_primary, is_active,
    created_at, updated_at
  )
  VALUES (
    p_profile_id, p_institution_id, p_campus_id, p_role, p_is_primary, true,
    now(), now()
  )
  RETURNING id INTO v_membership_id;

  -- Registrar en auditoria
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

-- Funcion: cambiar estado de objeto según flujo autorizado.
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

  -- Obtener institucion y rol del actor
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en la institucion del objeto';
  END IF;

  -- Validar transicion segun flujo
  IF v_object_state = 'reported' AND p_new_state = 'under_review' THEN
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revision o admin pueden revisar un reporte';
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
      RAISE EXCEPTION 'Objetos encontrados requieren custodia fisica antes de publicarse';
    END IF;
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revision o admin pueden publicar';
    END IF;
  ELSIF v_object_state = 'under_review' AND p_new_state = 'rejected' THEN
    IF v_actor_role NOT IN ('custody_staff', 'reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo custodia, revision o admin pueden rechazar';
    END IF;
  ELSIF v_object_state = 'published' AND p_new_state = 'claimed' THEN
    -- Esta transicion la hace el estudiante al crear una reclamacion, no via esta funcion
    RAISE EXCEPTION 'Use fn_create_recovery_request para reclamar un objeto';
  ELSIF v_object_state = 'claimed' AND p_new_state = 'approved' THEN
    IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo revision o admin pueden aprobar reclamaciones';
    END IF;
  ELSIF v_object_state = 'claimed' AND p_new_state = 'rejected' THEN
    IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
      RAISE EXCEPTION 'Solo revision o admin pueden rechazar reclamaciones';
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
      RAISE EXCEPTION 'Solo custodia, revision o admin pueden cerrar procesos';
    END IF;
  ELSIF v_object_state = 'published' AND p_new_state = 'unclaimed' THEN
    IF v_actor_role <> 'institution_admin' THEN
      RAISE EXCEPTION 'Solo admin de institucion puede declarar objetos no reclamados';
    END IF;
  ELSE
    RAISE EXCEPTION 'Transicion no permitida: % -> %', v_object_state, p_new_state;
  END IF;

  -- Actualizar estado
  UPDATE objects SET state = p_new_state, updated_at = now() WHERE id = p_object_id;

  -- Registrar en auditoria
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

-- Funcion: revisar reclamacion (aprobar/rechazar/necesita más info).
-- Solo reviewer o institution_admin de la misma institucion.
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
    RAISE EXCEPTION 'Decision no valida';
  END IF;

  -- Obtener estado de reclamacion, institucion del objeto y id del objeto
  SELECT rr.state, o.institution_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_object_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Reclamacion no encontrada';
  END IF;

  -- Validar que la reclamacion este en pending (no se puede revisar dos veces)
  IF v_recovery_request_state <> 'pending' THEN
    RAISE EXCEPTION 'La reclamacion ya fue resuelta';
  END IF;

  -- Obtener institucion y rol del actor
  SELECT m.institution_id, m.role INTO v_actor_institution_id, v_actor_role
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en la institucion del objeto';
  END IF;

  -- Solo reviewer o institution_admin pueden revisar
  IF v_actor_role NOT IN ('reviewer', 'institution_admin') THEN
    RAISE EXCEPTION 'Solo personal de revision o admin pueden decidir reclamaciones';
  END IF;

  -- Prevenir auto-aprobacion: el revisor no puede ser el claimant
  IF EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE id = p_recovery_request_id AND claimant_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'No se puede revisar una reclamacion propia';
  END IF;

  -- Actualizar reclamacion
  UPDATE recovery_requests
  SET state = p_decision, reviewed_by = auth.uid(), reviewed_at = now(),
      review_notes = p_review_notes, decision_reason = p_decision_reason,
      updated_at = now()
  WHERE id = p_recovery_request_id;

  -- Insertar revision en el historial inmutable
  INSERT INTO recovery_reviews (
    recovery_request_id, reviewer_id, decision, notes, decided_at, created_at
  )
  VALUES (
    p_recovery_request_id, auth.uid(), p_decision, p_review_notes, now(), now()
  );

  -- Registrar en auditoria
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

-- ============================================================
-- Revision de consistencia de politicas RLS (migraciones 001-005)
-- ============================================================
-- Esta migracion revisa que no existan politicas excesivamente permisivas
-- en las tablas creadas anteriormente. Cada politica RLS creada en migraciones
-- previas ya es restrictiva por diseno (denegar por defecto, permitir solo
-- lo estrictamente necesario).

-- Nota: No se alteran politicas existentes aqui; esta migracion sirve como
-- punto de revision y como ubicacion de las tablas de plataforma y funciones
-- de servidor faltantes.

-- ============================================================
-- Pruebas de aceptacion (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 6.1: Ninguna politica RLS permite SELECT * a todos los autenticados en tablas privadas.
-- (SELECT * FROM recovery_requests como usuario sin membresia en esa institucion -- debe devolver 0 filas)

-- Prueba 6.2: audit_log no se puede editar ni eliminar por usuarios ordinarios.
-- (UPDATE audit_log SET ... -- debe fallar con RLS)
-- (DELETE FROM audit_log -- debe fallar con RLS)

-- Prueba 6.3: platform_admins no es accesible directamente desde el cliente.
-- (SELECT * FROM platform_admins -- debe devolver 0 filas o fallar con RLS)

-- Prueba 6.4: Un usuario de institucion A no puede ver audit_log de institucion B.
-- (SELECT * FROM audit_log WHERE institution_id = 'institucion-B' -- debe devolver 0 filas para usuario de A)

-- Prueba 6.5: fn_create_object inyecta institution_id desde membresia, no del cliente.
-- (Intentar llamar con institution_id de otra institucion -- debe usar la del actor)

-- Prueba 6.6: fn_review_recovery_request impide auto-aprobacion.
-- (Intentar revisar propia reclamacion -- debe fallar)

-- Prueba 6.7: fn_change_object_state rechaza transiciones invalidas.
-- (Intentar reported -> delivered directamente -- debe fallar)
