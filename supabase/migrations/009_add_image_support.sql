-- ============================================================
-- Migración 010: Agregar soporte para imágenes en objetos
-- ============================================================
-- 1. Agregar columna image_path a la tabla objects
-- 2. Actualizar función fn_create_object para aceptar p_image_path
-- ============================================================

-- 1. Agregar columna image_path a la tabla objects
ALTER TABLE objects ADD COLUMN IF NOT EXISTS image_path text;

-- 2. Actualizar función fn_create_object para aceptar p_image_path
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

  -- Obtener institucion del actor a traves de membresia activa
  SELECT m.institution_id INTO v_actor_institution_id
  FROM memberships m
  WHERE m.profile_id = auth.uid()
    AND m.is_active = true
  LIMIT 1;

  IF v_actor_institution_id IS NULL THEN
    RAISE EXCEPTION 'El usuario no tiene membresia activa en ninguna institucion';
  END IF;

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
    image_path, created_at, updated_at
  )
  VALUES (
    v_actor_institution_id, p_kind, p_title, p_description, p_zone, p_location,
    p_category_id, auth.uid(), now(), 'reported', p_reference_code,
    p_image_path, now(), now()
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

SELECT 'Migración 010 aplicada correctamente: soporte para imágenes en objetos' AS resultado;