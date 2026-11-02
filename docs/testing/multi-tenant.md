# Verificación multi-tenant (Fase 4)

## Pruebas E2E
Archivo: `e2e/multi-tenant.spec.ts`

- Admin global (`roberpar9@gmail.com` / `juansilgadomarrugo@gmail.com`):
  - Login exitoso.
  - Acceso a `/admin` sin restricción institucional (sección de pendientes visible).
- Usuario UTB (`e2e.student@utb.edu.co`):
  - Acceso a `/publicar` para registrar objeto.
  - Visualización del catálogo `/objetos`.

## Validación local
1. Levantar Supabase local: `supabase start`.
2. Aplicar migraciones: `supabase db reset` (incluye `supabase/seed.sql`).
3. Sembrar usuarios/objetos: `npx tsx scripts/seed-e2e.ts`.
4. Ejecutar app: `npm run dev`.
5. Ejecutar E2E: `npx playwright test`.

## Validación en producción
1. Configurar variables de entorno en el proveedor (Supabase URL, anon key, service role).
2. Aplicar migraciones 001–011 en la BD de producción.
3. Ejecutar seed (con variables de entorno seguras) para crear UTB y admins globales.
4. Desplegar app (Vercel/Node) y verificar `/admin` con cuenta global.
5. Confirmar RLS y aislamiento probando con usuario de otra institución.
