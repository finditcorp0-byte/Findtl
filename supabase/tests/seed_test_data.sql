-- ============================================================
-- Datos de prueba para pruebas pgTAP
-- Estos datos son aislados y solo para pruebas
-- ============================================================

-- 1. Crear instituciones de prueba
INSERT INTO institutions (id, name, city, country, email_domain, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Universidad Test A', 'Cartagena', 'CO', 'testa.edu', true),
  ('22222222-2222-2222-2222-222222222222', 'Universidad Test B', 'Barranquilla', 'CO', 'testb.edu', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear campus
INSERT INTO campuses (id, institution_id, name, city, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sede Principal A', 'Cartagena', true),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'Sede Principal B', 'Barranquilla', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Crear perfiles (simulando usuarios de auth)
INSERT INTO profiles (id, full_name, avatar_url, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'Estudiante A1', NULL, true),
  ('66666666-6666-6666-6666-666666666666', 'Estudiante A2', NULL, true),
  ('77777777-7777-7777-7777-777777777777', 'Custodio A1', NULL, true),
  ('88888888-8888-8888-8888-888888888888', 'Revisor A1', NULL, true),
  ('99999999-9999-9999-9999-999999999999', 'Admin A1', NULL, true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Estudiante B1', NULL, true),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Platform Admin P1', NULL, true)
ON CONFLICT (id) DO NOTHING;

-- 4. Crear perfiles privados
INSERT INTO profiles_private (profile_id, email, phone, document_type, document_number)
VALUES
  ('55555555-5555-5555-5555-555555555555', 'estudiante.a1@testa.edu', '555-0001', 'CC', '11111111'),
  ('66666666-6666-6666-6666-666666666666', 'estudiante.a2@testa.edu', '555-0002', 'CC', '22222222'),
  ('77777777-7777-7777-7777-777777777777', 'custodio.a1@testa.edu', '555-0003', 'CC', '33333333'),
  ('88888888-8888-8888-8888-888888888888', 'revisor.a1@testa.edu', '555-0004', 'CC', '44444444'),
  ('99999999-9999-9999-9999-999999999999', 'admin.a1@testa.edu', '555-0005', 'CC', '55555555'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'estudiante.b1@testb.edu', '555-0006', 'CC', '66666666'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'platform.admin@testa.edu', '555-0007', 'CC', '77777777')
ON CONFLICT (profile_id) DO NOTHING;

-- 5. Crear membresías
INSERT INTO memberships (id, profile_id, institution_id, campus_id, role, is_primary, is_active)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'student', true, true),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'student', true, true),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'custody_staff', true, true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'reviewer', true, true),
  ('11111112-1111-1111-1111-111111111112', '99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'institution_admin', true, true),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 'student', true, true),
  ('33333333-3333-3333-3333-333333333334', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 'student', true, true)
ON CONFLICT (id) DO NOTHING;

-- 6. Crear plataforma admin para P1
INSERT INTO platform_admins (id, profile_id, is_active)
VALUES ('44444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true)
ON CONFLICT (profile_id) DO NOTHING;

-- 7. Crear categorías
INSERT INTO categories (id, institution_id, name, slug, is_active)
VALUES
  ('55555555-5555-5555-5555-555555555556', NULL, 'Electronicos', 'electronicos', true),
  ('66666666-6666-6666-6666-666666666667', NULL, 'Documentos', 'documentos', true),
  ('77777777-7777-7777-7777-777777777778', NULL, 'Llaves', 'llaves', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Crear objetos de prueba
INSERT INTO objects (id, institution_id, campus_id, category_id, reporter_id, kind, title, description, zone, location, state, reference_code, custody_received_at, custody_received_by, published_at, published_by)
VALUES
  ('88888888-8888-8888-8888-888888888889', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555556', '55555555-5555-5555-5555-555555555555', 'lost', 'Audífonos perdidos', 'Audífonos perdidos en biblioteca', 'Biblioteca', 'Sala B-204', 'published', 'FIC-001', now(), '77777777-7777-7777-7777-777777777777', now(), '99999999-9999-9999-9999-999999999999'),
  ('99999999-9999-9999-9999-999999999998', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '66666666-6666-6666-6666-666666666667', '55555555-5555-5555-5555-555555555555', 'found', 'Cargador encontrado', 'Cargador USB-C encontrado en laboratorio', 'Laboratorio', 'Lab 101', 'in_custody', 'FIC-002', now(), '77777777-7777-7777-7777-777777777777', now(), '99999999-9999-9999-9999-999999999999'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', '77777777-7777-7777-7777-777777777778', '66666666-6666-6666-6666-666666666666', 'lost', 'Llaves perdidas', 'Llaves perdidas en cafetería', 'Cafetería', 'Mesa 5', 'reported', 'FIC-003', NULL, NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 9. Crear solicitud de recuperación (pending)
INSERT INTO recovery_requests (id, object_id, claimant_id, claimed_at, description, state)
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', now(), 'Soy el dueño de las llaves', 'pending')
ON CONFLICT (id) DO NOTHING;

-- 10. Crear solicitud de recuperación (needs_more_info)
INSERT INTO recovery_requests (id, object_id, claimant_id, claimed_at, description, state)
VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '88888888-8888-8888-8888-888888888889', '55555555-5555-5555-5555-555555555555', now(), 'Necesito más detalles', 'needs_more_info')
ON CONFLICT (id) DO NOTHING;

-- 11. Crear solicitud de recuperación (approved)
INSERT INTO recovery_requests (id, object_id, claimant_id, claimed_at, description, state)
VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999998', '66666666-6666-6666-6666-666666666666', now(), 'Soy el dueño del cargador', 'approved')
ON CONFLICT (id) DO NOTHING;

-- 12. Crear entrega (delivery)
INSERT INTO deliveries (id, recovery_request_id, prepared_by, prepared_at, delivery_point, qr_token_hash, qr_expires_at, delivered_at, delivered_by, delivery_confirmed_at)
VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '77777777-7777-7777-7777-777777777777', now(), 'Punto de custodia central', 'fakehash123456789', now() + interval '24 hours', NULL, NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 13. Crear entrega ya entregada
INSERT INTO deliveries (id, recovery_request_id, prepared_by, prepared_at, delivery_point, qr_token_hash, qr_expires_at, delivered_at, delivered_by, delivery_confirmed_at)
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', now() - interval '2 days', 'Punto de custodia central', 'hashentregado123', now() + interval '24 hours', now() - interval '1 day', '77777777-7777-7777-7777-777777777777', now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

SELECT 'Datos de prueba insertados correctamente' as resultado;
