-- ============================================================
-- Pruebas de regresión: audit_log access (Migración 008)
-- ============================================================

SELECT plan(10);

-- Test 1: platform_admin ve todo el audit_log
SET request.jwt.claim.sub = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log)::int > 0,
  true,
  'Platform admin ve audit_log (todos los registros)'
);
RESET ROLE;

-- Test 2: institution_admin ve audit_log de su institución
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log WHERE institution_id = '11111111-1111-1111-1111-111111111111')::int,
  (SELECT count(*) FROM audit_log)::int,
  'Institution admin ve audit_log de su institución'
);
RESET ROLE;

-- Test 3: custody_staff ve audit_log de su institución
SET request.jwt.claim.sub = '77777777-7777-7777-7777-777777777777';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log WHERE institution_id = '11111111-1111-1111-1111-111111111111')::int,
  (SELECT count(*) FROM audit_log)::int,
  'Custody staff ve audit_log de su institución'
);
RESET ROLE;

-- Test 4: reviewer ve audit_log de su institución
SET request.jwt.claim.sub = '88888888-8888-8888-8888-888888888888';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log WHERE institution_id = '11111111-1111-1111-1111-111111111111')::int,
  (SELECT count(*) FROM audit_log)::int,
  'Reviewer ve audit_log de su institución'
);
RESET ROLE;

-- Test 5: NEGATIVO - student NO ve audit_log
SET request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log)::int,
  0,
  'NEGATIVO: Student NO ve audit_log'
);
RESET ROLE;

-- Test 6: NEGATIVO - anon NO ve audit_log
SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM audit_log)::int,
  0,
  'NEGATIVO: Anon NO ve audit_log'
);
RESET ROLE;

-- Test 7: NEGATIVO - student con membresía en otra institución NO ve audit_log ajeno
-- (B1 tiene membresía student en Inst A, pero no rol autorizado)
SET request.jwt.claim.sub = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
SET ROLE authenticated;
SELECT is(
  (SELECT count(*) FROM audit_log)::int,
  0,
  'NEGATIVO: Student con membresía en Inst A NO ve audit_log (rol no autorizado)'
);
RESET ROLE;

-- Test 8: Verificar que institution_id se filtra correctamente en policy institution
-- Insertar un registro de prueba para otra institución (si existe)
-- Por ahora verificamos que solo existen logs de Inst A en seed
SET request.jwt.claim.sub = '99999999-9999-9999-9999-999999999999';
SET ROLE authenticated;
SELECT is(
  (SELECT count(DISTINCT institution_id) FROM audit_log)::int,
  1,
  'Solo existe audit_log para Inst A en seed data'
);
RESET ROLE;

-- Test 9: fn_can_read_audit_log existe y es SECURITY DEFINER
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fn_can_read_audit_log'
      AND prosecdef = true
      AND proargtypes[0] = 'uuid'::regtype
  ),
  'fn_can_read_audit_log existe y es SECURITY DEFINER'
);

-- Test 10: Policies de audit_log existen
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'audit_log_select_platform_admin'
      AND tablename = 'audit_log'
  )
  AND EXISTS (
    SELECT 1 FROM pg_policies
    WHERE policyname = 'audit_log_select_institution'
      AND tablename = 'audit_log'
  ),
  'Policies audit_log_select_platform_admin e institution existen'
);

SELECT finish();