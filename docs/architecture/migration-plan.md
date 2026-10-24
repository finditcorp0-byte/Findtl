# Plan de migraciones — FindIt Campus

**Estado:** propuesta de arquitectura (diseño técnico revisable, sin implementar).  
**Versión:** 1.1 (corregida tras auditoría de arquitectura)  
**Compatibilidad:** PostgreSQL / Supabase. No se crearon archivos `.sql`, no se ejecutaron migraciones, no se modificó ninguna base de datos.

---

## 1. Principios

- Las migraciones son archivos versionados revisables en Git antes de ejecutarse.
- Cada migración tiene dependencias explícitas, riesgos, pruebas y condiciones de reversión.
- No hay cambios manuales invisibles en una base de datos remota; todo el esquema se describe en migraciones.
- El orden está optimizado para integridad referencial: primero las entidades de organización, luego usuarios, luego objetos y procesos.
- **Cada migración incorpora sus propias políticas RLS y restricciones de integridad antes de habilitar el uso de las tablas correspondientes** (ver I-6). No se dejan políticas críticas para la última migración.
- Si una tabla necesita políticas adicionales que dependen de entidades todavía no creadas, la tabla se crea con RLS habilitada y políticas restrictivas (denegar todo por defecto) hasta que las políticas completas estén listas.

---

## 2. Secuencia recomendada

### Migración 001 — Instituciones y sedes

**Propósito:** crear la base organizacional multiinstitucional.

**Objetos de base de datos:**
- Tabla `institutions` (PK `id`, campos de identidad, `settings` JSONB, `is_active`, `created_at`, `updated_at`).
- Tabla `campuses` (PK `id`, FK `institution_id`, campos de ubicación, `is_active`, fechas).
- Índices: `institutions.is_active`, `institutions.email_domain`, `campuses.institution_id`, `campuses.is_active`.
- Restricción única: `institutions.email_domain` (cuando se proporcione).
- RLS: habilitar en ambas tablas **en esta misma migración**, con políticas restrictivas (denegar escritura por defecto; lectura pública solo de instituciones activas).
- Políticas iniciales: lectura pública de instituciones activas; escritura solo mediante `service_role` (seed inicial) o `platform_admin`.

**Dependencias:** ninguna.

**Riesgos:** bajo. Es el punto de partida.

**Pruebas:** verificar que se puede crear una institución y que `email_domain` es único.

**Reversión:** `DROP TABLE campuses; DROP TABLE institutions;` (solo si no hay datos).

---

### Migración 002 — Perfiles, membresías y roles

**Propósito:** vincular usuarios autenticados a instituciones con roles.

**Objetos de base de datos:**
- Tabla `profiles` (PK `id` vinculada al proveedor de auth, `email` único, datos personales públicos o semipúblicos, `is_active`, fechas).
- Tabla `profiles_private` (PK `profile_id` → `profiles.id`, `email`, `phone`, `document_type`, `document_number`, fechas). RLS propia y más restrictiva que `profiles`.
- Tabla `memberships` (PK `id`, FK `profile_id`, FK `institution_id`, FK `campus_id` nullable, `role`, `is_primary`, `is_active`, fechas).
- Índices: `profiles.email`, `profiles.is_active`, `memberships.profile_id`, `memberships.institution_id`, `memberships.role`, `memberships.is_active`.
- Restricciones de unicidad (M-2):
  - `UNIQUE (profile_id, institution_id) WHERE campus_id IS NULL`
  - `UNIQUE (profile_id, institution_id, campus_id) WHERE campus_id IS NOT NULL`
- RLS: habilitar en las tres tablas **en esta misma migración**.
- Políticas: lectura de propio perfil; membresías propias y de institución según rol; `profiles_private` solo legible por el propio perfil o personal autorizado con justificación.

**Dependencias:** 001 (instituciones).

**Riesgos:** medio. El campo `id` de `profiles` debe coincidir con el identificador del proveedor de autenticación (Supabase Auth). Si cambia el proveedor, esta migración requiere ajuste.

**Pruebas:** verificar que un perfil puede tener membresías en varias instituciones con distintos roles; verificar que no se permite auto-asignación de `institution_admin`.

**Reversión:** `DROP TABLE memberships; DROP TABLE profiles_private; DROP TABLE profiles;` (solo si no hay objetos asociados).

---

### Migración 003 — Categorías y objetos

**Propósito:** definir catálogo de categorías y el registro central de objetos perdidos/encontrados.

**Objetos de base de datos:**
- Tabla `categories` (PK `id`, FK `institution_id` nullable, `name`, `slug`, `description`, `sort_order`, `is_active`, fechas).
- Tabla `objects` (PK `id`, FK `institution_id`, FK `campus_id` nullable, FK `category_id` nullable, FK `reporter_id`, `kind`, `title`, `description`, `zone`, `location`, `reported_at`, `state`, `custody_point`, `reference_code`, campos de custodia y publicación, fechas).
- Tabla `object_files` (PK `id`, FK `object_id`, `storage_path`, `url`, `mime_type`, `file_size`, `is_cover`, fechas).
- Índices: `objects.institution_id`, `objects.state`, `objects.kind`, `objects.reference_code`, `object_files.object_id`, `object_files.is_cover`, índice compuesto `(institution_id, state)` para consultas frecuentes del dashboard de custodia (ver M-4).
- Índice GIN de búsqueda en español sobre `title`, `description`, `location`, `zone`.
- Restricción de integridad institucional (C-1): cuando `objects.campus_id` no es nulo, debe cumplirse `campuses.institution_id = objects.institution_id` (mediante clave foránea compuesta o `CHECK`/trigger).
- Restricción única: `categories.(institution_id, slug)`, `objects.(institution_id, reference_code)`.
- FK `categories.institution_id` con `ON DELETE RESTRICT` (M-1: una categoría de una institución no se convierte automáticamente en global si se desactiva o elimina la institución).
- RLS: habilitar en las tres tablas **en esta misma migración**.
- Políticas: lectura pública de objetos `published` (solo columnas públicas mediante vista o proyección restringida); escritura de objetos según membresía.

**Dependencias:** 001 (instituciones), 002 (profiles para `reporter_id`).

**Riesgos:** medio. El índice GIN de texto en español requiere la extensión de búsqueda de texto de PostgreSQL (disponible por defecto).

**Pruebas:** verificar búsqueda insensible a acentos; verificar que `reference_code` es único por institución; verificar que un visitante no lee objetos no publicados ni campos privados.

**Reversión:** eliminar tablas en orden inverso (`object_files`, `objects`, `categories`).

---

### Migración 004 — Custodia y reclamaciones

**Propósito:** registrar recepción física, custodia y solicitudes de recuperación con decisiones manuales.

**Objetos de base de datos:**
- Tabla `custody_records` (PK `id`, FK `object_id` único, FK `received_by`, `received_at`, `custody_point`, notas, fechas).
- Tabla `recovery_requests` (PK `id`, FK `object_id`, FK `claimant_id`, `claimed_at`, `description`, `state`, campos de revisión, fechas).
- Tabla `recovery_reviews` (PK `id`, FK `recovery_request_id`, FK `reviewer_id`, `decision`, `notes`, `decided_at`, fechas).
- Índices: `custody_records.object_id`, `recovery_requests.object_id`, `recovery_requests.claimant_id`, `recovery_requests.state`, `recovery_reviews.recovery_request_id`.
- Restricción única: `custody_records.object_id`.
- Restricción de solicitudes pendientes (C-5): índice único parcial `UNIQUE (object_id) WHERE state = 'pending'`.
- Restricción de integridad institucional (C-1): `custody_records.received_by` debe tener membresía activa en la misma institución que el objeto (validar mediante trigger o función de servidor).
- RLS: habilitar en las tres tablas **en esta misma migración**.
- Políticas: reclamaciones propias visibles al reclamante; reclamaciones de la institución visibles a personal autorizado; decisiones inmutables.

**Dependencias:** 003 (objetos, object_files), 002 (profiles).

**Riesgos:** medio. La transición `under_review` → `in_custody` debe validarse en la capa de aplicación o trigger para asegurar que existe recepción física.

**Pruebas:** verificar que una reclamación no se aprueba automáticamente; verificar que un objeto `found` sin `custody_records` no puede publicarse; verificar que no hay dos solicitudes `pending` para el mismo objeto.

**Reversión:** eliminar tablas en orden inverso (`recovery_reviews`, `recovery_requests`, `custody_records`).

---

### Migración 005 — Entregas y validación QR

**Propósito:** gestionar entregas físicas verificadas mediante QR de un solo uso.

**Objetos de base de datos:**
- Tabla `deliveries` (PK `id`, FK `recovery_request_id` único, FK `prepared_by`, `prepared_at`, `delivery_point`, `qr_token_hash`, `qr_expires_at`, `qr_revoked_at`, `delivered_at`, FK `delivered_by`, fechas).
- Tabla `delivery_qr_attempts` (PK `id`, FK `delivery_id`, `attempted_at`, `success`, `failure_reason`, fechas).
- Índices: `deliveries.recovery_request_id`, `deliveries.qr_token_hash`, `deliveries.qr_expires_at`, `deliveries.delivered_at`, `delivery_qr_attempts.delivery_id`.
- Restricción de integridad institucional (C-1): `deliveries` hereda la institución a través de `recovery_requests → objects → institutions`; validar en servidor que `prepared_by` y `delivered_by` pertenezcan a la misma institución que el objeto.
- Restricción de valores controlados (M-3): `CHECK (failure_reason IN ('expired','revoked','already_used','invalid','membership_missing','hash_mismatch'))` cuando no es nulo.
- RLS: habilitar en ambas tablas **en esta misma migración**.
- Políticas: entregas propias visibles al reclamante; entregas de la institución visibles a personal autorizado; intentos solo escribibles por el sistema.

**Dependencias:** 004 (recovery_requests).

**Riesgos:** alto. La operación atómica de confirmación de entrega debe implementarse como función de servidor o transacción controlada. El hash del token QR nunca debe loguearse en texto plano.

**Pruebas:** verificar uso único (dos intentos simultáneos solo uno tiene éxito); verificar expiración; verificar revocación; verificar que un estudiante no puede escribir `delivered_at`.

**Reversión:** eliminar tablas en orden inverso (`delivery_qr_attempts`, `deliveries`).

---

### Migración 006 — Auditoría y políticas complementarias

**Propósito:** trazabilidad inmutable de acciones sensibles y tabla de administradores globales.

**Objetos de base de datos:**
- Tabla `platform_admins` (PK `id`, FK `profile_id` → `profiles.id`, `created_at`, `is_active`). Representa al administrador global sin vincularlo a una institución concreta (ver C-4).
- Tabla `audit_log` (PK `id`, FK `institution_id`, FK `actor_id` nullable, `action`, `entity_type`, `entity_id`, `old_values` JSONB, `new_values` JSONB, `created_at`).
- Índices: `audit_log.institution_id`, `audit_log.actor_id`, `audit_log.action`, `audit_log.created_at`, `platform_admins.profile_id`.
- RLS: habilitar en ambas tablas.
- Políticas: `audit_log` solo lectura para roles humanos; inserción solo mediante triggers o funciones de servidor. `platform_admins` lectura y escritura solo mediante `platform_admin` o funciones de servidor.
- Revisión de consistencia de todas las políticas RLS creadas en migraciones anteriores para asegurar que no existen permisos excesivos.

**Dependencias:** 001 (instituciones), 002 (profiles), y todas las tablas anteriores.

**Riesgos:** bajo. La tabla `audit_log` es de solo lectura para humanos, pero su inserción debe ser confiable en el servidor.

**Pruebas:** verificar que ninguna política RLS permite `SELECT *` a todos los autenticados en tablas privadas; verificar que `audit_log` no se puede editar ni eliminar.

**Reversión:** `DROP TABLE audit_log; DROP TABLE platform_admins;`.

---

## 3. Riesgos generales y condiciones de reversión

| Riesgo | Descripción | Condición de reversión |
|--------|-------------|------------------------|
| Cambio de proveedor de auth | `profiles.id` depende del identificador de auth | Revisar migración 002 antes de cambiar el proveedor |
| Datos de demostración perdidos | Las migraciones no borran datos, pero un `DROP TABLE` en reversión sí | No revertir en producción sin respaldo |
| RLS mal configurada | Fuga de datos entre instituciones | Probar con usuarios de dos instituciones distintas antes de activar |
| Token QR predecible | Entropía insuficiente | Usar generador criptográfico seguro; revisar antes de 005 |
| Servicio de archivos | Rutas de almacenamiento expuestas | URLs firmadas por servidor; bucket privado |

---

## 4. Condiciones para comenzar la implementación

1. Definir el proveedor de autenticación y confirmar que `profiles.id` coincide con su identificador de usuario.
2. Validar con cada institución los campos de `institutions.settings` (días de retención, política de no reclamados, puntos de custodia, separación de funciones en entrega).
3. Revisar las políticas RLS propuestas con el equipo de seguridad antes de ejecutar 001.
4. No ejecutar migraciones en producción hasta que 001–003 hayan sido revisadas en un entorno de prueba.
