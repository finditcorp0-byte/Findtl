-- Migración 001: Instituciones y sedes
-- Propósito: crear la base organizacional multiinstitucional.
-- Dependencias: ninguna.
-- Riesgos: bajo.
-- Reversión: DROP TABLE campuses; DROP TABLE institutions; (solo si no hay datos).

-- Extensión requerida para gen_random_uuid() y digest()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- Tablas
-- ============================================================

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

-- Índices
CREATE INDEX idx_institutions_is_active ON institutions(is_active);
CREATE INDEX idx_institutions_email_domain ON institutions(email_domain);
CREATE INDEX idx_campuses_institution_id ON campuses(institution_id);
CREATE INDEX idx_campuses_is_active ON campuses(is_active);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

-- institutions: lectura pública de instituciones activas.
-- Escritura (INSERT/UPDATE/DELETE): no hay política directa para clientes.
-- RLS deniega por defecto toda escritura directa desde el cliente.
-- Las escrituras autorizadas ocurren únicamente mediante funciones SECURITY DEFINER
-- creadas en migraciones posteriores.
CREATE POLICY institutions_select_public ON institutions
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- campuses: lectura de sedes activas de instituciones activas.
-- Escritura (INSERT/UPDATE/DELETE): no hay política directa para clientes.
CREATE POLICY campuses_select_public ON campuses
  FOR SELECT TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM institutions i
      WHERE i.id = campuses.institution_id AND i.is_active = true
    )
  );

-- ============================================================
-- Pruebas de aceptación (ejecutar en entorno de prueba)
-- ============================================================

-- Prueba 1.1: Se puede crear una institución (vía función de servidor, no directamente)
-- SELECT * FROM institutions WHERE name = 'Universidad de Prueba';

-- Prueba 1.2: email_domain es único
-- INSERT INTO institutions (name, email_domain) VALUES ('Dup', 'dup.test');
-- INSERT INTO institutions (name, email_domain) VALUES ('Dup2', 'dup.test'); -- Debe fallar (UNIQUE)

-- Prueba 1.3: Visitante no puede insertar instituciones directamente (RLS deniega)
-- INSERT INTO institutions (name) VALUES ('Intruso'); -- Debe fallar con RLS

-- Prueba 1.4: Visitante lee solo instituciones activas
-- SELECT id, name FROM institutions WHERE is_active = true; -- Funciona para anon
