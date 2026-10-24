-- Migracion 003: Categorias y objetos
-- Proposito: definir catalogo de categorias y el registro central de objetos perdidos/encontrados.
-- Dependencias: 001 (instituciones), 002 (profiles para reporter_id).
-- Riesgos: medio. El indice GIN de texto en espanol requiere la extension de busqueda de texto de PostgreSQL (disponible por defecto).
-- Reversion: DROP TABLE object_files; DROP TABLE objects; DROP TABLE categories;

-- ============================================================
-- Tablas
-- ============================================================

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

-- Restriccion unica: (institution_id, slug).
-- Las categorias globales (institution_id IS NULL) comparten espacio de slugs entre ellas,
-- pero solo puede haber una categoria global por slug.
-- Las categorias de una institución (institution_id IS NOT NULL) son independientes.
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

-- Clave foranea compuesta (C-1): cuando campus_id no es nulo, la sede debe pertenecer
-- a la misma institucion que el objeto. PostgreSQL soporta FK compuestas:
-- (campus_id, institution_id) -> campuses(id, institution_id).
-- Como campuses.id es PK, (id, institution_id) es automaticamente unica.
CREATE INDEX idx_campuses_id_institution_id ON campuses(id, institution_id);

ALTER TABLE objects
  ADD CONSTRAINT fk_objects_campus_institution
  FOREIGN KEY (campus_id, institution_id)
  REFERENCES campuses(id, institution_id);

-- Restriccion unica: reference_code dentro de cada institucion.
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

-- Una sola portada por objeto.
CREATE UNIQUE INDEX idx_object_files_unique_cover
  ON object_files(object_id)
  WHERE is_cover = true;

-- Indices
CREATE INDEX idx_objects_institution_id ON objects(institution_id);
CREATE INDEX idx_objects_state ON objects(state);
CREATE INDEX idx_objects_kind ON objects(kind);
CREATE INDEX idx_objects_reference_code ON objects(reference_code);
CREATE INDEX idx_objects_composite_institution_state ON objects(institution_id, state);
CREATE INDEX idx_object_files_object_id ON object_files(object_id);
CREATE INDEX idx_object_files_is_cover ON object_files(is_cover);

-- Indice GIN de busqueda en espanol sobre title, description, location, zone.
-- Se usa concat_ws para que los valores NULL no anulen el texto de busqueda.
CREATE INDEX idx_objects_search_gin ON objects
  USING GIN(to_tsvector('spanish', concat_ws(' ', title, description, location, zone)));

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_files ENABLE ROW LEVEL SECURITY;

-- categories: lectura publica SOLO de categorias globales activas (institution_id IS NULL).
-- Las categorias institucionales (institution_id IS NOT NULL) solo son visibles
-- a miembros autenticados de esa misma institucion.
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

-- objects: lectura publica (visitante) de objetos publicados en instituciones activas.
-- RLS filtra filas, no columnas. La proyeccion de columnas publicas se gestiona
-- en la capa de aplicacion/servidor.
CREATE POLICY objects_select_public ON objects
  FOR SELECT TO anon, authenticated
  USING (
    state = 'published'
    AND EXISTS (
      SELECT 1 FROM institutions i
      WHERE i.id = objects.institution_id AND i.is_active = true
    )
  );

-- objects: lectura restringida para usuarios autenticados de la misma institucion.
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

-- objects: insercion solo via funcion de servidor (fn_create_object en migracion 006).
-- No hay politica INSERT directa para clientes; RLS deniega por defecto.

-- objects: actualizacion. El reporter puede editar su propio reporte solo en estado 'reported'.
-- Cambios de estado solo por roles autorizados (vía funcion de servidor).
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

-- ============================================================
-- Pruebas de aceptacion (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 3.1: Busqueda insensible a acentos.
-- SELECT * FROM objects WHERE to_tsvector('spanish', title) @@ to_tsquery('spanish', 'audifonos');

-- Prueba 3.2: reference_code es unico por institucion.
-- (Insertar dos objetos con mismo reference_code y mismo institution_id -- debe fallar)

-- Prueba 3.3: Visitante no lee objetos no publicados.
-- SELECT * FROM objects WHERE state != 'published'; -- debe devolver 0 filas para anon

-- Prueba 3.4: Visitante no lee categorias institucionales (solo globales).
-- SELECT * FROM categories WHERE institution_id IS NOT NULL; -- debe devolver 0 filas para anon

-- Prueba 3.5: Clave foranea compuesta: campus de otra institucion no puede asociarse al objeto.
-- (Intentar INSERT con campus_id de institucion B e institution_id de institucion A -- debe fallar)
