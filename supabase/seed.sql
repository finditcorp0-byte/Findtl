-- Seed base para FindIt Campus (multi-universidad)
-- Inserta la universidad inicial UTB, campus y categorías globales/institucionales.
-- Los usuarios de auth y admins globales se crean con scripts/seed-e2e.ts.

INSERT INTO institutions (id, name, slug, city, country, email_domain, is_active)
VALUES (
  'e2e11111-1111-1111-1111-111111111111',
  'Universidad Tecnológica de Bolívar',
  'utb',
  'Cartagena',
  'CO',
  'utb.edu.co',
  true
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  city = EXCLUDED.city,
  email_domain = EXCLUDED.email_domain,
  is_active = EXCLUDED.is_active;

INSERT INTO campuses (id, institution_id, name, city, is_active)
VALUES (
  'e2e22222-2222-2222-2222-222222222222',
  'e2e11111-1111-1111-1111-111111111111',
  'Campus Principal',
  'Cartagena',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO categories (id, institution_id, name, slug, is_active)
VALUES
  ('e2e33333-3333-3333-3333-333333333333', 'e2e11111-1111-1111-1111-111111111111', 'Electrónicos', 'electronicos', true),
  ('e2e44444-4444-4444-4444-444444444444', 'e2e11111-1111-1111-1111-111111111111', 'Documentos', 'documentos', true),
  ('e2e55555-5555-5555-5555-555555555555', 'e2e11111-1111-1111-1111-111111111111', 'Llaves', 'llaves', true)
ON CONFLICT (id) DO NOTHING;
