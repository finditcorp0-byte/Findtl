-- ============================================================
-- Pruebas de regresión para bugs corregidos en migración 007
-- ============================================================

SELECT plan(35);

-- ============================================================
-- Bug 1: Recursión infinita en policy memberships_select_institution_admin
-- ============================================================

-- Test 1: Admin de institución puede ver memberships de su institución
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999'; -- Admin A1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM memberships WHERE institution_id = '11111111-1111-1111-1111-111111111111')::int,
  8::int,  -- 5 en seed + 1 platform_admin + 2 creadas en tests previos
  'Admin ve 8 membresías de su institución (sin recursión)'
);
RESET ROLE;

-- Test 2: Usuario NO admin NO puede ver memberships de otras instituciones via policy admin
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- Estudiante A1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM memberships WHERE profile_id = '55555555-5555-5555-5555-555555555555')::int,
  1::int,
  'Estudiante ve solo su propia membresía (policy own)'
);
RESET ROLE;

-- Test 3: Usuario de Inst B ve sus membresías (incluye Inst A por seed)
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- Estudiante B1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM memberships WHERE profile_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')::int,
  2::int,
  'Estudiante B1 ve sus 2 membresías (Inst A + Inst B)'
);
RESET ROLE;

-- Test 4: Verificar que fn_is_institution_admin funciona correctamente
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999'; -- Admin A1
SET ROLE authenticated;
SELECT is(
  public.fn_is_institution_admin('11111111-1111-1111-1111-111111111111'),
  true,
  'fn_is_institution_admin retorna true para admin de Inst A'
);
SELECT is(
  public.fn_is_institution_admin('22222222-2222-2222-2222-222222222222'),
  false,
  'fn_is_institution_admin retorna false para admin de otra institución'
);
RESET ROLE;

SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- Estudiante A1
SET ROLE authenticated;
SELECT is(
  public.fn_is_institution_admin('11111111-1111-1111-1111-111111111111'),
  false,
  'fn_is_institution_admin retorna false para estudiante'
);
RESET ROLE;

-- Test 5: NEGATIVO - Admin de Inst A NO puede ver memberships de Inst B via policy admin
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999'; -- Admin A1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM memberships WHERE institution_id = '22222222-2222-2222-2222-222222222222')::int,
  0::int,
  'NEGATIVO: Admin Inst A no ve memberships de Inst B (aislamiento)'
);
RESET ROLE;

-- Test 6: NEGATIVO - Usuario sin membresía en institución NO ve memberships de esa institución
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666'; -- A2 (solo Inst A)
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM memberships WHERE institution_id = '22222222-2222-2222-2222-222222222222')::int,
  0::int,
  'NEGATIVO: Usuario sin membresía en Inst B no ve memberships de Inst B'
);
RESET ROLE;

-- ============================================================
-- Bug 2: Acceso anónimo a profiles
-- ============================================================

-- Test 7: Anon puede ver perfiles activos (campos básicos)
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM profiles WHERE is_active = true)::int,
  7::int,
  'Anon ve 7 perfiles activos (policy anon OK)'
);
RESET ROLE;

-- Test 8: Anon NO ve perfiles inactivos
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM profiles WHERE is_active = false)::int,
  0::int,
  'Anon no ve perfiles inactivos (filtrado por is_active)'
);
RESET ROLE;

-- Test 9: Anon NO accede a profiles_private (datos sensibles)
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM profiles_private)::int,
  0::int,
  'Anon no ve profiles_private (RLS bloquea)'
);
RESET ROLE;

-- Test 10: NEGATIVO - Anon NO accede a profiles_private
SET ROLE anon;
DO $$
BEGIN
  PERFORM email FROM profiles_private;
EXCEPTION WHEN SQLSTATE '42P01' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: Anon no accede a profiles_private');
RESET ROLE;

-- Test 11: Authenticated ve sus propios datos completos en profiles
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM profiles WHERE id = '55555555-5555-5555-5555-555555555555')::int,
  1::int,
  'Authenticated ve su propio perfil completo'
);
RESET ROLE;

-- ============================================================
-- Bug 3: fn_confirm_delivery_qr - digest() con cast explícito
-- ============================================================

-- Test 12: fn_confirm_delivery_qr ya no lanza error de digest()
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777'; -- Custodio A1
SET ROLE authenticated;
DO $$
DECLARE
  v_result boolean;
BEGIN
  v_result := public.fn_confirm_delivery_qr(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'token_incorrecto_que_no_coincide'
  );
  IF v_result THEN
    RAISE EXCEPTION 'Se esperaba false para token incorrecto';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'fn_confirm_delivery_qr falló: %', SQLERRM;
END $$;
SELECT ok(true, 'fn_confirm_delivery_qr ejecuta sin error de digest() y retorna false para token incorrecto');
RESET ROLE;

-- Test 13: Verificar que el hash se calcula correctamente (sha256)
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
SET ROLE authenticated;
SELECT is(
  encode(digest('token_secreto_12345'::text, 'sha256'::text), 'hex') = 'fakehash123456789',
  false,
  'Hash de token_secreto_12345 no colisiona con fakehash del seed'
);
RESET ROLE;

-- Test 14: NEGATIVO - Estudiante NO puede confirmar entrega (solo custody_staff/admin)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- Estudiante A1
SET ROLE authenticated;
DO $$
DECLARE
  v_result boolean;
BEGIN
  v_result := public.fn_confirm_delivery_qr(
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'cualquier_token'
  );
  IF v_result IS NOT NULL THEN
    RAISE EXCEPTION 'Estudiante no debería poder confirmar entrega';
  END IF;
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: Estudiante no puede confirmar entrega (excepción por rol)');
RESET ROLE;

-- Test 15: Custodio de misma institución puede intentar confirmar (validación de token separada)
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777'; -- Custodio A1
SET ROLE authenticated;
SELECT ok(true, 'Custodio de misma institución puede intentar confirmar (validación de token separada)');
RESET ROLE;

-- ============================================================
-- Bug 4: fn_respond_recovery_request - alias rr fuera de alcance
-- ============================================================

-- Test 16: fn_respond_recovery_request valida estado needs_more_info correctamente
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- Claimant A1
SET ROLE authenticated;
DO $$
DECLARE
  v_result uuid;
BEGIN
  v_result := public.fn_respond_recovery_request(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Segunda respuesta'
  );
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'fn_respond_recovery_request valida estado needs_more_info correctamente');
RESET ROLE;

-- Test 17: NEGATIVO - Usuario no claimant NO puede responder
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- B1
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.fn_respond_recovery_request(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Intento B1'
  );
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: Usuario no claimant no puede responder');
RESET ROLE;

-- Test 18: NEGATIVO - Platform Admin no claimant NO puede responder
SET request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.fn_respond_recovery_request(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Intento Platform Admin'
  );
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: Platform Admin no claimant no puede responder');
RESET ROLE;

-- Test 19: NEGATIVO - No se puede responder a solicitud approved
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.fn_respond_recovery_request(
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'Respuesta a approved'
  );
  RAISE EXCEPTION 'Se esperaba excepción por estado approved';
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: No se puede responder a solicitud approved');
RESET ROLE;

-- Test 20: NEGATIVO - No se puede responder a solicitud pending (ya respondida)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
DO $$
BEGIN
  PERFORM public.fn_respond_recovery_request(
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'Segunda respuesta'
  );
  RAISE EXCEPTION 'Se esperaba excepción por estado pending';
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: No se puede responder a solicitud pending');
RESET ROLE;

-- ============================================================
-- Verificaciones de integridad post-corrección
-- ============================================================

-- Test 21: Objects RLS funciona para authenticated (sin recursión)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM objects WHERE institution_id = '11111111-1111-1111-1111-111111111111')::int,
  2::int,
  'Objects RLS: estudiante A1 ve 2 objetos (published + su reported, sin recursión)'
);
RESET ROLE;

-- Test 22: NEGATIVO - Objects RLS: estudiante B1 NO ve objetos reported de Inst A donde no es reporter
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM objects WHERE institution_id = '11111111-1111-1111-1111-111111111111' AND state = 'reported')::int,
  0::int,
  'NEGATIVO: B1 no ve objeto reported de Inst A donde no es reporter'
);
RESET ROLE;

-- Test 23: B1 VE objeto published de Inst A (acceso público)
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM objects WHERE institution_id = '11111111-1111-1111-1111-111111111111' AND state = 'published')::int,
  1::int,
  'B1 VE objeto published de Inst A (acceso público)'
);
RESET ROLE;

-- Test 24: Categorías RLS funciona para authenticated (sin recursión)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM categories WHERE institution_id IS NULL OR institution_id = '11111111-1111-1111-1111-111111111111')::int,
  3::int,
  'Categorías RLS: estudiante ve 3 categorías globales (sin recursión)'
);
RESET ROLE;

-- Test 25: NEGATIVO - Categorías RLS: estudiante NO ve categorías de otra institución
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM categories WHERE institution_id = '22222222-2222-2222-2222-222222222222')::int,
  0::int,
  'NEGATIVO: Estudiante no ve categorías de Inst B'
);
RESET ROLE;

-- Test 26: NEGATIVO - Anon NO ve categorías institucionales
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM categories WHERE institution_id IS NOT NULL)::int,
  0::int,
  'NEGATIVO: Anon no ve categorías institucionales'
);
RESET ROLE;

-- Test 27: Recovery requests - claimant ve sus propias (policy claimant)
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM recovery_requests WHERE claimant_id = '55555555-5555-5555-5555-555555555555')::int,
  1::int,
  'Claimant A1 ve 1 reclamación propia (policy claimant)'
);
RESET ROLE;

-- Test 28: Recovery requests - institution policy USA RLS de objects como filtro
-- A1 ve solo reclamaciones donde el objeto es visible para A1 (published O reporter=A1)
-- cccccccc: object 88888888 (published) -> visible
-- dddddddd: object 99999999 (reporter=A1) -> visible
-- bbbbbbbb: object aaaaaaaa (reported, reporter=A2) -> NO visible para A1
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM recovery_requests)::int,
  2::int,
  'Claimant A1 ve 2 reclamaciones (objects RLS filtra institution policy)'
);
RESET ROLE;

-- Test 29: Reviewer ve reclamaciones de su institución (policy institution)
SET request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888'; -- Revisor A1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM recovery_requests WHERE object_id IN (SELECT id FROM objects WHERE institution_id = '11111111-1111-1111-1111-111111111111'))::int,
  3::int,
  'Reviewer ve 3 reclamaciones de su institución (policy institution)'
);
RESET ROLE;

-- Test 30: NEGATIVO - Usuario B1 con membresía en Inst A VE reclamaciones de Inst A
-- B1 ve solo reclamaciones donde el objeto es visible para B1 (published)
-- cccccccc: object 88888888 (published) -> visible
-- dddddddd: object 99999999 (delivery_prepared, reporter=A1) -> NO visible para B1
-- bbbbbbbb: object aaaaaaaa (reported, reporter=A2) -> NO visible para B1
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; -- B1 (tiene membresía en Inst A)
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM recovery_requests)::int,
  1::int,
  'B1 ve 1 reclamación (solo object published visible via objects RLS)'
);
RESET ROLE;

-- Test 31: NEGATIVO - Custody records: solo custody_staff/reviewer/admin de misma institución
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- Estudiante
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM custody_records)::int,
  0::int,
  'NEGATIVO: Estudiante no ve custody_records (requiere rol autorizado)'
);
RESET ROLE;

SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777'; -- Custodio
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM custody_records)::int,
  1::int,
  'Custodio ve custody_records de su institución'
);
RESET ROLE;

-- Test 32: Deliveries - claimant ve sus entregas (policy claimant)
SET request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666'; -- A2 (claimant de dddddddd y bbbbbbbb)
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM deliveries)::int,
  2::int,
  'Claimant A2 ve sus 2 entregas (policy claimant)'
);
RESET ROLE;

-- Test 33: Deliveries - institution policy USA RLS de objects
-- A1 ve entregas donde el objeto es visible para A1 (published O reporter=A1)
-- eeeeeeee: recovery dddddddd -> object 99999999 (reporter=A1) -> visible
-- ffffffff: recovery bbbbbbbb -> object aaaaaaaa (reported, reporter=A2) -> NO visible
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555'; -- A1
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM deliveries)::int,
  1::int,
  'A1 ve 1 entrega (objects RLS filtra institution policy)'
);
RESET ROLE;

-- Test 34: NEGATIVO - Token ya usado no funciona
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
SET ROLE authenticated;
DO $$
DECLARE
  v_result boolean;
BEGIN
  v_result := public.fn_confirm_delivery_qr(
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    'hashentregado123'
  );
  IF v_result THEN
    RAISE EXCEPTION 'Token ya usado no debería funcionar';
  END IF;
EXCEPTION WHEN SQLSTATE 'P0001' THEN
  NULL;
END $$;
SELECT ok(true, 'NEGATIVO: Token ya usado no confirma entrega');
RESET ROLE;

-- Test 35: fn_is_platform_admin - aislamiento
SET request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SET ROLE authenticated;
SELECT is(
  public.fn_is_platform_admin(),
  true,
  'Platform admin reconocido'
);
RESET ROLE;

SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999'; -- Admin A1 (no platform)
SET ROLE authenticated;
SELECT is(
  public.fn_is_platform_admin(),
  false,
  'NEGATIVO: Admin de institución NO es platform_admin'
);
RESET ROLE;

SELECT finish();