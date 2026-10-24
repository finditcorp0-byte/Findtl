#!/usr/bin/env node
/**
 * Script de verificación previa al despliegue para FindIt Campus
 * 
 * Uso: node scripts/deploy-check.ts
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';

const results: Array<{ name: string; passed: boolean; message: string }> = [];

function check(name: string, condition: boolean, message: string): void {
  console.log(`${condition ? '✅' : '❌'} ${name}: ${message}`);
  results.push({ name, passed: condition, message });
}

function runCommand(cmd: string): { stdout: string; stderr: string; code: number } {
  try {
    const stdout = execSync(cmd, { encoding: 'utf-8', stdio: 'pipe' });
    return { stdout: stdout.toString(), stderr: '', code: 0 };
  } catch (e: unknown) {
    const err = e as Error & { stdout?: Buffer; stderr?: Buffer; status?: number };
    return { 
      stdout: err.stdout?.toString() ?? '', 
      stderr: err.stderr?.toString() ?? '', 
      code: (e as Error & { status?: number }).status ?? 1 
    };
  }
}

console.log('🔍 Verificación previa al despliegue - FindIt Campus\n');

// 1. Verificar archivos esenciales
console.log('\n1. Archivos esenciales:');
check('package.json existe', existsSync('package.json'), 'package.json presente');
check('next.config.ts existe', existsSync('next.config.ts'), 'next.config.ts presente');
check('tsconfig.json existe', existsSync('tsconfig.json'), 'tsconfig.json presente');
check('.env.example existe', existsSync('.env.example'), '.env.example presente');
check('.gitignore existe', existsSync('.gitignore'), '.gitignore presente');

// 2. Verificar estructura de migraciones
console.log('\n2. Migraciones SQL (001-009):');
for (let i = 1; i <= 9; i++) {
  const padded = i.toString().padStart(3, '0');
  const matches = readdirSync(join('supabase', 'migrations')).filter((f: string) => f.startsWith(padded));
  check(`Migración ${padded} existe`, matches.length > 0, `supabase/migrations/${padded}_*.sql`);
}

// 3. Verificar migraciones aplicadas en BD local
console.log('\n3. Migraciones aplicadas en BD local:');
try {
  const result = execSync('docker exec supabase_db_Findtl psql -U postgres -d postgres -t -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version"', { encoding: 'utf-8', stdio: 'pipe' });
  const applied = result.toString().trim().split('\n').filter(Boolean);
  console.log(`  Migraciones aplicadas: ${applied.length}`);
  check('Al menos 9 migraciones', applied.length >= 9, `${applied.length} migraciones aplicadas`);
} catch {
  check('BD accesible', false, 'No se pudo conectar a BD local');
}

// RLS activo en tablas críticas
console.log('\n4. RLS activo en tablas críticas:');
const criticalTables = [
  'objects', 'recovery_requests', 'custody_records', 'deliveries',
  'profiles', 'profiles_private', 'memberships', 'categories',
  'institutions', 'campuses', 'audit_log', 'platform_admins', 'recovery_reviews'
];

try {
  for (const table of criticalTables) {
    const result = execSync(
      `docker exec supabase_db_Findtl psql -U postgres -d postgres -t -c "SELECT DISTINCT relrowsecurity FROM pg_class WHERE relname = '${table}'"`,
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    const output = result.toString().trim();
    // Handle potential multiple rows (e.g., partitioned tables)
    const enabled = output.split('\n').some(line => line.trim() === 't');
    check(`RLS en ${table}`, enabled, enabled ? 'RLS activo' : 'RLS INACTIVO');
  }
} catch (e) {
  check('Verificación RLS', false, `Error verificando RLS: ${e instanceof Error ? e.message : String(e)}`);
}

// Lint y Build
console.log('\n5. Lint y Build:');
const lintResult = runCommand('npm run lint');
check('Lint sin errores', lintResult.code === 0, lintResult.code === 0 ? 'Lint OK' : lintResult.stderr);

const buildResult = runCommand('npm run build');
check('Build exitoso', buildResult.code === 0, buildResult.code === 0 ? 'Build OK' : buildResult.stderr);

// Variables de entorno
console.log('\n6. Variables de entorno:');
check('.env.local existe', existsSync('.env.local'), '.env.local presente');
if (existsSync('.env.local')) {
  const env = readFileSync('.env.local', 'utf-8');
  check('NEXT_PUBLIC_SUPABASE_URL', env.includes('NEXT_PUBLIC_SUPABASE_URL'), 'NEXT_PUBLIC_SUPABASE_URL configurada');
  check('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'), 'NEXT_PUBLIC_SUPABASE_ANON_KEY configurada');
}

// Tests
console.log('\n7. Tests:');
const testResult = runCommand('npx playwright test --reporter=line 2>&1');
check('Tests pasando', testResult.code === 0, testResult.code === 0 ? 'Tests OK' : (testResult.stderr ?? '').slice(0, 200));

// Resumen
console.log('\n========== RESUMEN ==========');
const passed = results.filter(r => r.passed).length;
const failed = results.filter(r => !r.passed).length;
console.log(`Total: ${results.length} | ✅ ${passed} | ❌ ${failed}`);

if (failed > 0) {
  console.log('\n❌ FALLOS:');
  results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}: ${r.message}`));
  process.exit(1);
} else {
  console.log('\n✅ TODAS LAS VERIFICACIONES PASARON - LISTO PARA DESPLIEGUE');
  process.exit(0);
}