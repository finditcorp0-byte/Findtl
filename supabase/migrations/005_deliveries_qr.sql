-- Migracion 005: Entregas y validación QR
-- Proposito: gestionar entregas fisicas verificadas mediante QR de un solo uso.
-- Dependencias: 004 (recovery_requests, audit_log).
-- Riesgos: alto. La operación atomica de confirmación de entrega debe implementarse como funcion de servidor.
-- Reversion: DROP TABLE delivery_qr_attempts; DROP TABLE deliveries;

-- ============================================================
-- Tablas
-- ============================================================

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

-- Una entrega por reclamacion aprobada.
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

-- Indices
CREATE INDEX idx_deliveries_recovery_request_id ON deliveries(recovery_request_id);
CREATE INDEX idx_deliveries_qr_token_hash ON deliveries(qr_token_hash);
CREATE INDEX idx_deliveries_qr_expires_at ON deliveries(qr_expires_at);
CREATE INDEX idx_deliveries_delivered_at ON deliveries(delivered_at);
CREATE INDEX idx_delivery_qr_attempts_delivery_id ON delivery_qr_attempts(delivery_id);
CREATE INDEX idx_delivery_qr_attempts_success ON delivery_qr_attempts(success);

-- ============================================================
-- Funciones privilegiadas (SECURITY DEFINER)
-- ============================================================

-- Funcion: preparar una entrega (generar QR con token hash).
-- Solo custody_staff o institution_admin de la misma institucion, sobre reclamacion aprobada.
-- Valida token no vacio y expiracion futura.
-- Actualiza objects.state a 'delivery_prepared' dentro de la misma transaccion.
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
  -- Validar que el usuario esta autenticado
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar token no vacio
  IF p_qr_token_plain IS NULL OR length(trim(p_qr_token_plain)) = 0 THEN
    RAISE EXCEPTION 'El token QR no puede estar vacio';
  END IF;

  -- Validar expiracion futura
  IF p_qr_expires_at <= now() THEN
    RAISE EXCEPTION 'La fecha de expiracion del QR debe ser futura';
  END IF;

  -- Obtener institucion y id del objeto a traves de la reclamacion
  SELECT o.institution_id, o.id INTO v_object_institution_id, v_object_id
  FROM recovery_requests rr
  JOIN objects o ON o.id = rr.object_id
  WHERE rr.id = p_recovery_request_id;

  IF v_object_institution_id IS NULL THEN
    RAISE EXCEPTION 'Reclamacion no encontrada';
  END IF;

  -- Validar que el preparador tiene membresia activa en la misma institucion
  SELECT m.institution_id INTO v_preparer_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.institution_id = v_object_institution_id
    AND m.is_active = true
    AND m.role IN ('custody_staff', 'institution_admin')
  LIMIT 1;

  IF v_preparer_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no es personal autorizado en la institucion del objeto';
  END IF;

  -- Validar que la reclamacion esta aprobada
  IF NOT EXISTS (
    SELECT 1 FROM recovery_requests
    WHERE id = p_recovery_request_id AND state = 'approved'
  ) THEN
    RAISE EXCEPTION 'La reclamacion no esta aprobada';
  END IF;

  -- Validar que no exista ya una entrega para esta reclamacion
  IF EXISTS (SELECT 1 FROM deliveries WHERE recovery_request_id = p_recovery_request_id) THEN
    RAISE EXCEPTION 'Ya existe una entrega para esta reclamacion';
  END IF;

  -- Calcular hash del token QR (nunca almacenar el token plano)
  v_qr_token_hash := encode(digest(p_qr_token_plain, 'sha256'), 'hex');

  -- Insertar entrega
  INSERT INTO deliveries (
    recovery_request_id, prepared_by, prepared_at, delivery_point,
    qr_token_hash, qr_expires_at, created_at, updated_at
  )
  VALUES (
    p_recovery_request_id, auth.uid(), now(), p_delivery_point,
    v_qr_token_hash, p_qr_expires_at, now(), now()
  )
  RETURNING id INTO v_delivery_id;

  -- Actualizar estado del objeto a delivery_prepared dentro de la misma transaccion
  UPDATE objects
  SET state = 'delivery_prepared', updated_at = now()
  WHERE id = v_object_id;

  -- Registrar en auditoria
  INSERT INTO public.audit_log (
    institution_id, actor_id, action, entity_type, entity_id,
    new_values, created_at
  )
  VALUES (
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

-- Funcion: confirmar entrega fisica mediante verificacion QR.
-- Operacion atomica: UPDATE condicional WHERE delivered_at IS NULL.
-- Solo custody_staff o institution_admin de la misma institucion.
-- Valida que la reclamacion siga aprobada y que el objeto esté en estado esperado.
-- Actualiza objects.state a 'delivered' dentro de la misma transaccion.
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

  -- Calcular hash del token proporcionado
  v_token_hash := encode(digest(p_token_plain, 'sha256'), 'hex');

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

REVOKE ALL ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_confirm_delivery_qr(uuid, text) TO authenticated;

-- Funcion: revocar un QR antes de la entrega fisica.
-- Solo custody_staff o institution_admin de la misma institucion.
-- Retorna true solo si realmente revoco algo (verifica ROW_COUNT).
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
    RAISE EXCEPTION 'El usuario no tiene permisos para revocar en esta institucion';
  END IF;

  -- Revocacion atomica: solo si no esta ya revocada y no esta entregada
  UPDATE deliveries
  SET qr_revoked_at = now(), updated_at = now()
  WHERE id = p_delivery_id AND qr_revoked_at IS NULL AND delivered_at IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    RAISE EXCEPTION 'No se pudo revocar el QR: ya fue entregado o ya estaba revocado';
  END IF;

  -- Actualizar estado del objeto a delivery_prepared (vuelto a preparar)
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

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_qr_attempts ENABLE ROW LEVEL SECURITY;

-- deliveries: lectura propia del reclamante; personal autorizado de la misma institucion.
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

-- deliveries: insercion solo via funcion de servidor (fn_prepare_delivery).
-- No hay politica INSERT directa para clientes.

-- deliveries: actualizacion (confirmar entrega) solo via funcion de servidor (fn_confirm_delivery_qr).
-- No hay politica UPDATE directa para clientes.

-- delivery_qr_attempts: lectura personal autorizado de la misma institucion; reclamante ve sus propios intentos.
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

-- delivery_qr_attempts: insercion solo el sistema (via funcion de servidor).
-- No hay politica INSERT directa para clientes.

-- ============================================================
-- Pruebas de aceptacion (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 5.1: Uso unico de QR (dos intentos simultaneos, solo uno tiene exito).
-- (Ejecutar fn_confirm_delivery_qr dos veces concurrentemente con mismo delivery_id y token -- una true, otra false)

-- Prueba 5.2: QR vencido no puede confirmarse.
-- (fn_confirm_delivery_qr con qr_expires_at en el pasado -- debe devolver false)

-- Prueba 5.3: QR reutilizado (ya entregado) no puede confirmarse.
-- (fn_confirm_delivery_qr despues de delivered_at establecido -- debe devolver false)

-- Prueba 5.4: Estudiante no puede escribir delivered_at directamente.
-- (UPDATE deliveries SET delivered_at = now() -- debe fallar con RLS)

-- Prueba 5.5: Token falsificado no coincide con el hash.
-- (fn_confirm_delivery_qr con token incorrecto -- debe devolver false)

-- Prueba 5.6: El token plano nunca se almacena ni se registra en logs.
-- (SELECT qr_token_hash FROM deliveries -- debe ser un hash, nunca el token plano)

-- Prueba 5.7: Token vacio o expiracion pasada al preparar entrega son rechazados.
-- (fn_prepare_delivery con token vacio o qr_expires_at <= now() -- debe fallar)

-- Prueba 5.8: Revocar un QR ya entregado debe fallar.
-- (fn_revoke_qr despues de delivered_at establecido -- debe fallar)

-- Prueba 5.9: Revocar un QR ya revocado debe fallar.
-- (fn_revoke_qr despues de qr_revoked_at establecido -- debe fallar)
