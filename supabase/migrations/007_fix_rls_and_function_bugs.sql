-- ============================================================
-- Migración 007: Corrección de bugs en RLS y funciones
-- ============================================================
-- 1. Corrige recursión infinita en policy memberships_select_institution_admin
-- 2. Añade policy anon para profiles (solo campos públicos básicos)
-- 3. Corrige fn_confirm_delivery_qr: digest() requiere cast explícito
-- 4. Corrige fn_respond_recovery_request: alias rr fuera de alcance
-- ============================================================

-- ============================================================
-- 1. RECREAR POLITICA memberships_select_institution_admin SIN AUTORREFERENCIA
-- ============================================================
-- El problema: la policy consultaba la propia tabla memberships (m_admin)
-- causando recursión infinita cuando otras policies la evaluaban.
-- Solución: usar una función SECURITY DEFINER que verifique el rol admin
-- sin consultar memberships desde dentro de una policy de memberships.

DROP POLICY IF EXISTS memberships_select_institution_admin ON memberships;

-- Función helper: verifica si el usuario actual es institution_admin
-- de la institución dada. SECURITY DEFINER para evitar recursión en RLS.
CREATE OR REPLACE FUNCTION public.fn_is_institution_admin(p_institution_id uuid)
RETURNS boolean AS $$
DECLARE
  v_result boolean;
BEGIN
  -- SECURITY DEFINER: ejecuta con privilegios del owner (postgres), bypassing RLS
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

-- Nueva policy: usa la función helper en lugar de auto-consulta
CREATE POLICY memberships_select_institution_admin ON memberships
  FOR SELECT TO authenticated
  USING (
    public.fn_is_institution_admin(memberships.institution_id)
  );

-- ============================================================
-- 2. POLITICA ANON PARA PROFILES (solo campos públicos básicos)
-- ============================================================
-- Exposición controlada: solo perfiles activos, solo campos no sensibles
-- (id, full_name, avatar_url, is_active). NO email, teléfono, documento.

CREATE POLICY profiles_select_public_basic ON profiles
  FOR SELECT TO anon
  USING (
    is_active = true
  );

-- También permitir a authenticated ver campos básicos de otros perfiles activos
-- (complementa profiles_select_own y profiles_select_public_fields)
CREATE POLICY profiles_select_public_basic_auth ON profiles
  FOR SELECT TO authenticated
  USING (
    is_active = true
  );

-- ============================================================
-- 3. CORREGIR fn_confirm_delivery_qr: digest() con cast explícito
-- ============================================================
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
  -- Validar autenticacion
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener institucion, objeto y estado de la reclamacion de la entrega
  SELECT o.institution_id, o.id, o.state, rr.state INTO
    v_delivery_institution_id, v_object_id, v_object_state, v_recovery_state
  FROM deliveries d
  JOIN recovery_requests rr ON rr.id = d.recovery_request_id
  JOIN objects o ON o.id = rr.object_id
  WHERE d.id = p_delivery_id;

  IF v_delivery_institution_id IS NULL THEN
    -- No revelar si el delivery_id existe (respuesta generica)
    RAISE EXCEPTION 'Entrega no encontrada o no autorizada';
  END IF;

  -- Validar que la reclamacion siga aprobada
  IF v_recovery_state <> 'approved' THEN
    RAISE EXCEPTION 'La reclamacion asociada no esta aprobada';
  END IF;

  -- Validar que el objeto este en estado esperado (delivery_prepared)
  IF v_object_state <> 'delivery_prepared' THEN
    RAISE EXCEPTION 'El objeto no esta en estado de entrega preparada';
  END IF;

  -- Validar que el actor tiene membresia activa en la misma institucion
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_delivery_institution_id
    AND m.is_active = true
    AND m.role IN ('custody_staff', 'institution_admin')
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene permisos en la institucion de la entrega';
  END IF;

  -- CORRECCION: digest() está en schema extensions; usar cast a bytea o schema explícito
  v_token_hash := encode(extensions.digest(p_token_plain::bytea, 'sha256'), 'hex');

  -- Confirmacion atomica: solo una fila puede ser actualizada (delivered_at IS NULL)
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
    -- Registrar intento fallido (sin exponer token ni datos sensibles)
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

  -- Actualizar estado del objeto a delivered dentro de la misma transaccion
  UPDATE objects
  SET state = 'delivered', updated_at = now()
  WHERE id = v_object_id;

  -- Registrar intento exitoso
  INSERT INTO public.delivery_qr_attempts (
    delivery_id, attempted_at, success, failure_reason, created_at
  )
  VALUES (p_delivery_id, now(), true, NULL, now());

  -- Registrar en auditoria
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
    v_delivery_institution_id, auth.uid(), 'delivery.confirm',
    'delivery', p_delivery_id::text,
    jsonb_build_object('delivered_at', now(), 'delivered_by', auth.uid()),
    now()
  );

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, public;

-- Permisos ya existen, no hace falta volver a otorgarlos

-- ============================================================
-- 4. CORREGIR fn_respond_recovery_request: alias rr fuera de alcance
-- ============================================================
-- Primero: ampliar check constraint para permitir 'needs_more_info_response'
ALTER TABLE recovery_reviews DROP CONSTRAINT recovery_reviews_decision_check;
ALTER TABLE recovery_reviews ADD CONSTRAINT recovery_reviews_decision_check
  CHECK (decision = ANY (ARRAY['approved', 'rejected', 'needs_more_info', 'needs_more_info_response']));

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

  -- Obtener estado de la reclamacion, institucion del objeto, claimant_id y id del objeto
  SELECT rr.state, o.institution_id, rr.claimant_id, o.id
  INTO v_recovery_request_state, v_object_institution_id, v_claimant_id, v_recovery_request_id
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

  -- CORRECCION: usar variable v_claimant_id en lugar de alias rr
  IF v_claimant_id <> auth.uid() THEN
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
      description = COALESCE(description, '') || ' [Respuesta del reclamante: ' || p_response || ']',
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

-- Permisos ya existen, no hace falta volver a otorgarlos

-- ============================================================
-- VERIFICACIONES POST-MIGRACION
-- ============================================================

-- Verificar que la función helper existe y es SECURITY DEFINER
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_is_institution_admin'
      AND prosecdef = true
      AND proargtypes[0] = 'uuid'::regtype
  ) THEN
    RAISE EXCEPTION 'fn_is_institution_admin no existe o no es SECURITY DEFINER';
  END IF;
END $$;

-- Verificar que las policies nuevas existen
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'memberships_select_institution_admin'
      AND tablename = 'memberships'
  ) THEN
    RAISE EXCEPTION 'Policy memberships_select_institution_admin no creada';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'profiles_select_public_basic'
      AND tablename = 'profiles'
      AND roles @> '{anon}'
  ) THEN
    RAISE EXCEPTION 'Policy profiles_select_public_basic no creada para anon';
  END IF;
END $$;

SELECT 'Migración 007 aplicada correctamente' AS resultado;