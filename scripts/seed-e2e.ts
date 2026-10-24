#!/usr/bin/env node
/**
 * Script de sembrado de datos E2E para FindIt Campus
 * 
 * Uso: npx tsx scripts/seed-e2e.ts
 * 
 * Este script crea:
 * - 1 estudiante de prueba con membresía activa en UTB
 * - 1 usuario institution_admin de prueba
 * - 2 objetos de prueba (uno published, uno in_custody)
 * - Usuarios en Supabase Auth para login E2E
 */

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

// Configuración local de Supabase (valores por defecto de Supabase CLI)
const SUPABASE_URL = 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// UUIDs fijos para datos de prueba E2E (deterministas para tests)
const TEST_DATA = {
  institution: {
    id: 'e2e11111-1111-1111-1111-111111111111',
    name: 'Universidad Tecnológica de Bolívar',
    city: 'Cartagena',
    country: 'CO',
    email_domain: 'utb.edu.co',
  },
  campus: {
    id: 'e2e22222-2222-2222-2222-222222222222',
    name: 'Campus Principal',
    city: 'Cartagena',
  },
  categories: [
    { id: 'e2e33333-3333-3333-3333-333333333333', name: 'Electrónicos', slug: 'electronicos' },
    { id: 'e2e44444-4444-4444-4444-444444444444', name: 'Documentos', slug: 'documentos' },
    { id: 'e2e55555-5555-5555-5555-555555555555', name: 'Llaves', slug: 'llaves' },
  ],
  // Usuario estudiante de prueba
  student: {
    profile_id: 'e2e66666-6666-6666-6666-666666666666',
    email: 'e2e.student@utb.edu.co',
    password: 'TestPass123!',
    full_name: 'Estudiante E2E',
    role: 'student' as const,
  },
  // Usuario admin de prueba
  admin: {
    profile_id: 'e2e77777-7777-7777-7777-777777777777',
    email: 'e2e.admin@utb.edu.co',
    password: 'TestPass123!',
    full_name: 'Admin E2E',
    role: 'institution_admin' as const,
  },
  // Objetos de prueba
  objects: [
    {
      id: 'e2e88888-8888-8888-8888-888888888888',
      title: 'Audífonos Sony WH-1000XM5',
      description: 'Audífonos negros con estuche gris, marca Sony modelo WH-1000XM5. Se perdieron en la biblioteca central.',
      kind: 'lost' as const,
      zone: 'Biblioteca central',
      location: 'Sala de lectura 2do piso',
      state: 'published',
      reference_code: 'FIC-E2E-001',
    },
    {
      id: 'e2e99999-9999-9999-9999-999999999999',
      title: 'Cargador MacBook Pro 96W',
      description: 'Cargador USB-C original Apple 96W, color blanco. Encontrado en laboratorio de cómputo.',
      kind: 'found' as const,
      zone: 'Laboratorios',
      location: 'Lab 201 - Estación 5',
      state: 'in_custody',
      reference_code: 'FIC-E2E-002',
    },
  ],

  // Membership IDs (valid UUIDs)
  memberships: {
    student: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    admin: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  },
};

async function seedE2E() {
  console.log('🌱 Iniciando sembrado de datos E2E...\n');

  try {
    // 1. Crear/actualizar institución
    console.log('1️⃣  Creando institución de prueba...');
    const { error: instError } = await supabase
      .from('institutions')
      .upsert({
        id: TEST_DATA.institution.id,
        name: TEST_DATA.institution.name,
        city: TEST_DATA.institution.city,
        country: TEST_DATA.institution.country,
        email_domain: TEST_DATA.institution.email_domain,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (instError) throw instError;
    console.log('   ✅ Institución creada/actualizada');

    // 2. Crear/actualizar campus
    console.log('2️⃣  Creando campus de prueba...');
    const { error: campusError } = await supabase
      .from('campuses')
      .upsert({
        id: TEST_DATA.campus.id,
        institution_id: TEST_DATA.institution.id,
        name: TEST_DATA.campus.name,
        city: TEST_DATA.campus.city,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (campusError) throw campusError;
    console.log('   ✅ Campus creado/actualizado');

    // 3. Crear categorías
    console.log('3️⃣  Creando categorías de prueba...');
    for (const cat of TEST_DATA.categories) {
      const { error: catError } = await supabase
        .from('categories')
        .upsert({
          id: cat.id,
          institution_id: TEST_DATA.institution.id,
          name: cat.name,
          slug: cat.slug,
          is_active: true,
        }, { onConflict: 'id' });
      
      if (catError) throw catError;
    }
    console.log('   ✅ Categorías creadas/actualizadas');

    // 4. Crear usuarios en Supabase Auth
    console.log('4️⃣  Creando usuarios en Supabase Auth...');
    
    // Crear estudiante
    const { data: studentAuth, error: studentAuthError } = await supabase.auth.admin.createUser({
      email: TEST_DATA.student.email,
      password: TEST_DATA.student.password,
      email_confirm: true,
      user_metadata: { full_name: TEST_DATA.student.full_name },
    });
    
    if (studentAuthError && studentAuthError.message !== 'User already registered' && studentAuthError.code !== 'email_exists') {
      throw studentAuthError;
    }
    
    const studentUserId = studentAuth.user?.id ?? TEST_DATA.student.profile_id;
    console.log(`   ✅ Estudiante: ${TEST_DATA.student.email} (${studentUserId})`);

    // Crear admin
    const { data: adminAuth, error: adminAuthError } = await supabase.auth.admin.createUser({
      email: TEST_DATA.admin.email,
      password: TEST_DATA.admin.password,
      email_confirm: true,
      user_metadata: { full_name: TEST_DATA.admin.full_name },
    });
    
    if (adminAuthError && adminAuthError.message !== 'User already registered' && adminAuthError.code !== 'email_exists') {
      throw adminAuthError;
    }
    
    const adminUserId = adminAuth.user?.id ?? TEST_DATA.admin.profile_id;
    console.log(`   ✅ Admin: ${TEST_DATA.admin.email} (${adminUserId})`);

    // 5. Crear/actualizar perfiles públicos
    console.log('5️⃣  Creando perfiles públicos...');
    
    const { error: studentProfileError } = await supabase
      .from('profiles')
      .upsert({
        id: studentUserId,
        full_name: TEST_DATA.student.full_name,
        avatar_url: null,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (studentProfileError) throw studentProfileError;

    const { error: adminProfileError } = await supabase
      .from('profiles')
      .upsert({
        id: adminUserId,
        full_name: TEST_DATA.admin.full_name,
        avatar_url: null,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (adminProfileError) throw adminProfileError;
    console.log('   ✅ Perfiles públicos creados/actualizados');

    // 6. Crear/actualizar perfiles privados (emails)
    console.log('6️⃣  Creando perfiles privados...');
    
    const { error: studentPrivateError } = await supabase
      .from('profiles_private')
      .upsert({
        profile_id: studentUserId,
        email: TEST_DATA.student.email,
        phone: '300-0000001',
        document_type: 'CC',
        document_number: '1000000001',
      }, { onConflict: 'profile_id' });
    
    if (studentPrivateError) throw studentPrivateError;

    const { error: adminPrivateError } = await supabase
      .from('profiles_private')
      .upsert({
        profile_id: adminUserId,
        email: TEST_DATA.admin.email,
        phone: '300-0000002',
        document_type: 'CC',
        document_number: '1000000002',
      }, { onConflict: 'profile_id' });
    
    if (adminPrivateError) throw adminPrivateError;
    console.log('   ✅ Perfiles privados creados/actualizados');

    // 7. Crear/actualizar membresías
    console.log('7️⃣  Creando membresías...');
    
    const { error: studentMembershipError } = await supabase
      .from('memberships')
      .upsert({
        id: TEST_DATA.memberships.student,
        profile_id: studentUserId,
        institution_id: TEST_DATA.institution.id,
        campus_id: TEST_DATA.campus.id,
        role: TEST_DATA.student.role,
        is_primary: true,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (studentMembershipError) throw studentMembershipError;

    const { error: adminMembershipError } = await supabase
      .from('memberships')
      .upsert({
        id: TEST_DATA.memberships.admin,
        profile_id: adminUserId,
        institution_id: TEST_DATA.institution.id,
        campus_id: TEST_DATA.campus.id,
        role: TEST_DATA.admin.role,
        is_primary: true,
        is_active: true,
      }, { onConflict: 'id' });
    
    if (adminMembershipError) throw adminMembershipError;
    console.log('   ✅ Membresías creadas/actualizadas');

    // 8. Crear objetos de prueba
    console.log('8️⃣  Creando objetos de prueba...');
    
    const now = new Date().toISOString();
    
    for (const obj of TEST_DATA.objects) {
      const { error: objError } = await supabase
        .from('objects')
        .upsert({
          id: obj.id,
          institution_id: TEST_DATA.institution.id,
          campus_id: TEST_DATA.campus.id,
          category_id: TEST_DATA.categories[0].id, // Electrónicos
          reporter_id: studentUserId,
          kind: obj.kind,
          title: obj.title,
          description: obj.description,
          zone: obj.zone,
          location: obj.location,
          state: obj.state,
          reference_code: obj.reference_code,
          custody_received_at: obj.state !== 'reported' ? now : null,
          custody_received_by: obj.state !== 'reported' ? adminUserId : null,
          published_at: obj.state === 'published' ? now : null,
          published_by: obj.state === 'published' ? adminUserId : null,
        }, { onConflict: 'id' });
      
      if (objError) throw objError;
      console.log(`   ✅ Objeto: ${obj.title} (${obj.state})`);
    }

    // 9. Verificar datos creados
    console.log('\n🔍 Verificando datos sembrados...');
    
    const { count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .in('id', [studentUserId, adminUserId]);
    
    const { count: membershipsCount } = await supabase
      .from('memberships')
      .select('*', { count: 'exact', head: true })
      .in('profile_id', [studentUserId, adminUserId]);
    
    const { count: objectsCount } = await supabase
      .from('objects')
      .select('*', { count: 'exact', head: true })
      .in('id', TEST_DATA.objects.map(o => o.id));

    console.log(`   📊 Perfiles: ${profilesCount}/2`);
    console.log(`   📊 Membresías: ${membershipsCount}/2`);
    console.log(`   📊 Objetos: ${objectsCount}/2`);

    console.log('\n✅ ¡Sembrado E2E completado exitosamente!');
    console.log('\n📋 Credenciales de prueba:');
    console.log(`   👤 Estudiante: ${TEST_DATA.student.email} / ${TEST_DATA.student.password}`);
    console.log(`   👤 Admin:      ${TEST_DATA.admin.email} / ${TEST_DATA.admin.password}`);
    console.log('\n📋 IDs de objetos de prueba:');
    TEST_DATA.objects.forEach(o => console.log(`   - ${o.title}: ${o.id} (${o.state})`));

  } catch (error) {
    console.error('\n❌ Error durante el sembrado:', error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('seed-e2e.ts')) {
  seedE2E();
}

export { seedE2E, TEST_DATA };