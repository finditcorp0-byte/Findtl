# Guía de Despliegue - FindIt Campus

## Resumen

Este documento describe los pasos exactos para desplegar FindIt Campus en producción usando **Supabase Cloud** y **Vercel**.

---

## 1. Prerrequisitos

- Cuenta en [Supabase](https://supabase.com) (plan Pro o superior recomendado)
- Cuenta en [Vercel](https://vercel.com)
- Repositorio en GitHub/GitLab/Bitbucket
- Node.js 20+ instalado localmente
- Docker Desktop (para desarrollo local con Supabase CLI)

---

## 2. Configuración de Supabase Cloud

### 2.1 Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un nuevo proyecto
2. Anota:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **Anon Key**: `eyJ...`
   - **Service Role Key**: `eyJ...` (solo para backend/admin)
   - **Database Password**: (guardar de forma segura)

### 2.2 Configurar Bucket de Storage `object-images`

1. Ve a **Storage > Buckets** en Supabase Dashboard
2. Crea bucket `object-images` (público: **NO**, privado: **SÍ**)
3. Configura políticas RLS:

```sql
-- Política SELECT (lectura pública de imágenes de objetos publicados)
CREATE POLICY "Public read published object images" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'object-images' AND
    EXISTS (
      SELECT 1 FROM objects o
      WHERE o.id = (storage.foldername(name))[1]::uuid
        AND o.state = 'published'
        AND EXISTS (
          SELECT 1 FROM institutions i
          WHERE i.id = o.institution_id AND i.is_active = true
        )
    )
  );

-- Política INSERT (solo usuarios autenticados con membresía activa)
CREATE POLICY "Authenticated upload object images" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'object-images' AND
    (storage.foldername(name))[1]::uuid IN (
      SELECT object_id FROM objects o
      WHERE o.institution_id IN (
        SELECT institution_id FROM memberships m
        WHERE m.profile_id = auth.uid() AND m.is_active = true
      )
    )
  );

-- Política UPDATE/DELETE (solo dueño o admin)
CREATE POLICY "Owner/Admin update/delete object images" ON storage.objects
  FOR UPDATE, DELETE TO authenticated USING (
    (storage.foldername(name))[1]::uuid IN (
      SELECT object_id FROM objects o
      WHERE o.reporter_id = auth.uid() OR EXISTS (
        SELECT 1 FROM memberships m
        WHERE m.profile_id = auth.uid() 
          AND m.role IN ('institution_admin', 'custody_staff', 'reviewer')
          AND m.institution_id = (SELECT institution_id FROM objects WHERE id = (storage.foldername(name))[1]::uuid)
          AND m.is_active = true
      )
    )
  );
```

### 2.3 Aplicar migraciones SQL

```bash
# Opción A: Supabase Dashboard → SQL Editor (copiar/pegar cada migración 001-010)
# Opción B: Supabase CLI (recomendado)
supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres"
```

**Verificar migraciones aplicadas:**
```sql
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
-- Debe mostrar 001 a 010
```

### 2.4 Configurar Auth

En **Authentication > Settings**:

- **Site URL**: `https://tudominio.com`
- **Redirect URLs**: `https://tudominio.com/auth/callback`
- **Email Auth**: Habilitado
- **OAuth Providers**: Google (opcional)
- **Email Confirmations**: Deshabilitado (para desarrollo) / Habilitado (producción)

---

## 3. Despliegue en Vercel

### 3.1 Conectar repositorio

1. En Vercel: **Add New Project** → Importar repo GitHub/GitLab
2. Framework: **Next.js** (detectado automáticamente)
3. **Build Command**: `npm run build`
4. **Output Directory**: `.next` (default)

### 3.2 Variables de entorno en Vercel

En **Settings > Environment Variables**:

| Variable | Valor | Entorno |
|----------|-------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` (anon key) | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` (service_role) | **Solo** Production (Server Actions) |

> ⚠️ **NUNCA** expongas `SUPABASE_SERVICE_ROLE_KEY` en variables con prefijo `NEXT_PUBLIC_`.

### 3.3 Configuración de Build

En **Settings > General**:
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

---

## 4. Checklist Pre-Despliegue

Ejecuta localmente antes de hacer push:

```bash
# 1. Verificaciones locales
npm run lint          # 0 errores
npm run build         # Build exitoso
npx playwright test   # Tests E2E pasando

# Verificar migraciones en BD local
docker exec supabase_db_Findtl psql -U postgres -d postgres -c "SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;"

# Verificar RLS en tablas críticas
docker exec supabase_db_Findtl psql -U postgres -d postgres -c "
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN (
  'objects','recovery_requests','custody_records','deliveries',
  'profiles','profiles_private','memberships','categories',
  'institutions','campuses','audit_log','platform_admins','recovery_reviews'
) AND relrowsecurity = true;"
```

---

## 4. Despliegue a Producción

### 4.1 Push a rama principal

```bash
git add .
git commit -m "feat: release v1.0.0"
git push origin main
```

### 4.2 Vercel despliega automáticamente

- Vercel detecta push a `main`
- Ejecuta `npm run build` y despliega
- Verifica en **Deployments** que termine con éxito

### 4.2 Verificación post-despliegue

En la URL de producción (`https://tudominio.vercel.app`):

- [ ] Home carga correctamente
- [ ] `/objetos` muestra catálogo con filtros
- [ ] `/login` / `/registro` funcionan
- [ ] `/publicar` crea objeto con imagen
- [ ] `/objetos/[id]` muestra detalle y permite reclamar
- [ ] `/perfil` muestra historial (requiere login)
- [ ] `/admin` accesible solo para admins (si aplica)

---

## 5. Comandos útiles post-despliegue

```bash
# Ver logs de Vercel
vercel logs <deployment-url>

# Ejecutar migración manual en Supabase Cloud
supabase db push --db-url "postgresql://..."

# Ver logs de Supabase
supabase logs --type=api --project-ref xxxxx

# Ver métricas
vercel inspect <deployment-url> --metrics
```

---

## 6. Rollback

Si hay problemas críticos:

```bash
# Vercel: Rollback instantáneo
vercel rollback <deployment-url>

# Supabase: Revertir migración (con cuidado)
supabase db reset --db-url "..."  # Solo desarrollo
# En producción: restaurar backup desde Dashboard > Database > Backups
```

---

## 7. Monitoreo y Alertas

- **Vercel Analytics**: Habilitar en Settings > Analytics
- **Supabase Logs**: Dashboard > Logs > API/DB/Auth
- **Sentry** (opcional): Configurar DSN en Vercel + `NEXT_PUBLIC_SENTRY_DSN`

---

## 8. Rollback de Migraciones (Emergencia)

```sql
-- Solo desarrollo: revertir última migración
-- En producción: RESTAURAR BACKUP desde Dashboard Supabase > Database > Backups

-- Ver estado actual
SELECT version FROM supabase_migrations.schema_migrations ORDER BY version DESC LIMIT 5;

-- NO EJECUTAR EN PRODUCCIÓN SIN BACKUP:
-- DELETE FROM supabase_migrations.schema_migrations WHERE version = '010';
-- DROP FUNCTION IF EXISTS fn_create_object(...);
-- ALTER TABLE objects DROP COLUMN IF EXISTS image_path;
```

---

## Contacto y Soporte

- **Issues**: GitHub Issues del repositorio
- **Supabase Discord**: #findit-campus
- **Documentación**: `/docs` en el repo

---

*Última actualización: 2026-10-23 | Versión: 1.0.0*