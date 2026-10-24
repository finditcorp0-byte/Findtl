# Modelo de datos — FindIt Campus

**Estado:** propuesta de arquitectura (diseño técnico revisable, sin implementar).  
**Versión:** 1.1 (corregida tras auditoría de arquitectura)  
**Compatibilidad:** PostgreSQL / Supabase. No se ejecutó SQL, no se conectó Supabase, no se modificó ninguna base de datos.

---

## 1. Principios de diseño

1. **UUID como identificador primario** en todas las tablas de negocio para evitar enumeración de IDs y facilitar la fusión de datos entre instituciones.
2. **Fechas con zona horaria (`timestamptz`)** en todos los campos de auditoría y estado.
3. **Una tabla `objects` unificada** para objetos perdidos y encontrados. Se distinguen por el campo `kind` (`lost` / `found`) porque comparten casi todos los campos y búsquedas; sus flujos de ciclo de vida difieren en la custodia física (ver sección 4).
4. **Aislamiento institucional por `institution_id`** en casi todas las tablas de negocio. `institution_id` por sí solo no garantiza aislamiento: se complementa con restricciones compuestas, claves foráneas validadas y políticas RLS (ver C-1).
5. **Minimización de datos personales**: nombres y contacto del reclamante no se publican en el catálogo; solo se usan internamente para verificación de propiedad y entrega.
6. **`institution_id` nunca se acepta del cliente en escrituras.** Se asigna desde la membresía activa del actor mediante funciones de servidor (ver C-3).

---

## 2. Entidades

### 2.1 `institutions`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `name` | `text` | Sí | Nombre de la institución |
| `legal_name` | `text` | No | Nombre legal |
| `city` | `text` | No | Ciudad |
| `country` | `text` | Sí (default `'CO'`) | País |
| `email_domain` | `text` | No | Dominio institucional para membresía automática por correo |
| `logo_url` | `text` | No | URL del logotipo |
| `settings` | `jsonb` | No | Configuración por institución (retención, política objetos no reclamados, puntos de custodia, separación de funciones en entrega) |
| `is_active` | `boolean` | Sí (default `true`) | Institución activa |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Único:** `email_domain` (cuando se proporcione)
- **Índices:** `is_active`
- **Públicos:** `name`, `city`, `country`, `logo_url`
- **Privados:** `settings` (puede contener configuración interna)
- **Eliminación:** soft delete mediante `is_active = false`; `ON DELETE RESTRICT` en tablas hijas con datos activos (no borrar físicamente mientras existan objetos, membresías o auditoría asociada).

### 2.2 `campuses`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `institution_id` | `uuid` | Sí | FK → `institutions.id` |
| `name` | `text` | Sí | Nombre de la sede |
| `address` | `text` | No | Dirección física |
| `city` | `text` | No | Ciudad de la sede |
| `is_active` | `boolean` | Sí (default `true`) | Sede activa |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Clave foránea:** `institution_id` → `institutions.id` (ON DELETE CASCADE)
- **Índices:** `institution_id`, `is_active`
- **Multiinstitución:** una sede pertenece a una sola institución. Una institución tiene muchas sedes.
- **Públicos:** `name`, `address`, `city`

### 2.3 `profiles`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria (coincide con `auth.users.id` en Supabase) |
| `full_name` | `text` | No | Nombre completo |
| `avatar_url` | `text` | No | URL de avatar |
| `is_active` | `boolean` | Sí (default `true`) | Perfil habilitado |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Índices:** `is_active`
- **Relación con auth:** `profiles.id` se mantiene sincronizada 1:1 con el identificador del proveedor de autenticación (`auth.users.id` en Supabase) mediante trigger o función de servidor al crear/eliminar usuarios. No se almacenan credenciales en `profiles`.
- **Públicos:** `full_name`, `avatar_url` (solo dentro del contexto de membresía, no expuesto globalmente)
- **Privados:** ninguno en esta tabla. Los campos sensibles (`email`, `phone`, `document_type`, `document_number`) viven en `profiles_private` con RLS independiente (ver C-2).
- **Usuarios eliminados/desactivados:** `is_active = false` no borra la fila; sus membresías se desactivan y no pueden realizar nuevas operaciones. Los datos históricos de auditoría conservan el `actor_id` para trazabilidad.

### 2.3b `profiles_private`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `profile_id` | `uuid` | Sí | Clave primaria y FK → `profiles.id` |
| `email` | `text` | Sí | Correo electrónico (privado) |
| `phone` | `text` | No | Teléfono (privado) |
| `document_type` | `text` | No | Tipo de documento (privado) |
| `document_number` | `text` | No | Número de documento (privado, se recomienda cifrar) |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `profile_id`
- **Clave foránea:** `profile_id` → `profiles.id` (ON DELETE CASCADE)
- **RLS:** política independiente y más restrictiva que `profiles`. Solo el propio perfil (`auth.uid() = profile_id`) o personal autorizado con justificación registrada en auditoría puede leer.
- **Privados:** todos los campos de esta tabla son privados.

### 2.4 `memberships`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `profile_id` | `uuid` | Sí | FK → `profiles.id` |
| `institution_id` | `uuid` | Sí | FK → `institutions.id` |
| `campus_id` | `uuid` | No | FK → `campuses.id` (sede de alcance; nullable = institución completa) |
| `role` | `text` | Sí | Rol dentro de la institución (`student`, `custody_staff`, `reviewer`, `institution_admin`) |
| `is_primary` | `boolean` | Sí (default `false`) | Membresía principal del usuario |
| `is_active` | `boolean` | Sí (default `true`) | Membresía activa |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Claves foráneas:** `profile_id` → `profiles.id`, `institution_id` → `institutions.id`, `campus_id` → `campuses.id`
- **Restricción de unicidad (M-2):** PostgreSQL permite múltiples filas con `NULL` en columnas únicas. Por tanto se definen dos restricciones parciales:
  - `UNIQUE (profile_id, institution_id) WHERE campus_id IS NULL` (una membresía sin sede por institución)
  - `UNIQUE (profile_id, institution_id, campus_id) WHERE campus_id IS NOT NULL` (una membresía por institución y sede)
- **Índices:** `profile_id`, `institution_id`, `campus_id`, `role`, `is_active`
- **Multiinstitución:** un usuario puede tener varias membresías en distintas instituciones con distintos roles. Los permisos se evalúan siempre dentro del alcance de una membresía activa (`is_active = true`).
- **Privados:** ninguno sensible más allá de la propia vinculación.

### 2.5 `categories`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `institution_id` | `uuid` | No | FK → `institutions.id` (nullable = categoría global disponible para todas las instituciones) |
| `name` | `text` | Sí | Nombre |
| `slug` | `text` | Sí | Identificador legible en URL |
| `description` | `text` | No | Descripción |
| `sort_order` | `integer` | No | Orden de visualización |
| `is_active` | `boolean` | Sí (default `true`) | Categoría activa |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Clave foránea:** `institution_id` → `institutions.id` (ON DELETE RESTRICT — ver M-1: una categoría de una institución no se convierte automáticamente en global si se desactiva o elimina la institución)
- **Único:** `(institution_id, slug)` — las categorías globales (`institution_id IS NULL`) comparten espacio de slugs; las de una institución son independientes.
- **Índices:** `institution_id`, `slug`, `is_active`
- **Públicos:** `name`, `slug`, `description`, `sort_order`
- **Datos de demostración:** las 8 categorías actuales se mapean a categorías globales (`institution_id` NULL).

### 2.6 `objects`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria (se usa en la ruta `/objetos/[id]`) |
| `institution_id` | `uuid` | Sí | FK → `institutions.id` |
| `campus_id` | `uuid` | No | FK → `campuses.id` |
| `category_id` | `uuid` | No | FK → `categories.id` |
| `reporter_id` | `uuid` | Sí | FK → `profiles.id` (quien reportó) |
| `kind` | `text` | Sí | `lost` (perdido) o `found` (encontrado) |
| `title` | `text` | Sí | Título breve |
| `description` | `text` | Sí | Descripción detallada |
| `zone` | `text` | No | Zona amplia del campus |
| `location` | `text` | No | Ubicación precisa |
| `reported_at` | `timestamptz` | Sí | Fecha y hora del reporte inicial |
| `state` | `text` | Sí | Estado del ciclo de vida (ver sección 4) |
| `custody_point` | `text` | No | Punto oficial de custodia asignado |
| `reference_code` | `text` | Sí | Código interno del expediente (ej. `FIC-2026-001`) |
| `custody_received_at` | `timestamptz` | No | Fecha de recepción física en custodia |
| `custody_received_by` | `uuid` | No | FK → `profiles.id` (personal que recibió) |
| `published_at` | `timestamptz` | No | Fecha de publicación en catálogo |
| `published_by` | `uuid` | No | FK → `profiles.id` (quien publicó) |
| `closed_at` | `timestamptz` | No | Fecha de cierre del proceso |
| `closed_reason` | `text` | No | Motivo del cierre |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Claves foráneas:** `institution_id`, `campus_id`, `category_id`, `reporter_id`, `custody_received_by`, `published_by`
- **Restricción de integridad institucional (C-1):** cuando `campus_id` no es nulo, debe cumplirse `campuses.institution_id = objects.institution_id`. Esto se impone mediante una clave foránea compuesta (`campus_id`, `institution_id`) sobre `campuses` y una clave foránea compuesta correspondiente sobre `objects`, o mediante un trigger transaccional que valide que la sede referenciada pertenece a la misma institución que el objeto. Un `CHECK` no puede consultar otras tablas en PostgreSQL.
- **Único:** `reference_code` dentro de cada institución (`UNIQUE (institution_id, reference_code)`)
- **Índices:** `institution_id`, `campus_id`, `category_id`, `kind`, `state`, `reported_at`, `reference_code`, índice compuesto `(institution_id, state)` para consultas frecuentes del dashboard de custodia (ver M-4).
- **Búsqueda de texto:** índice GIN sobre `to_tsvector('spanish', title || ' ' || description || ' ' || location || ' ' || zone)` para búsquedas insensibles a acentos y mayúsculas.
- **Públicos (catálogo):** `id`, `title`, `description`, `zone`, `location`, `kind`, `category`, `images` (portada), `published_at`, `custody_point`, `reference_code`
- **Privados:** `reporter_id`, `custody_received_by`, `published_by`, `closed_at`, `closed_reason` (solo personal autorizado de la misma institución)
- **Regla fundamental:** `state` de un objeto `found` no implica custodia automática. Solo pasa a `in_custody` cuando el personal autorizado registra recepción física en `custody_records`. Un objeto `lost` nunca requiere `in_custody` para publicarse como reporte de búsqueda (ver I-2).

### 2.7 `object_files`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `object_id` | `uuid` | Sí | FK → `objects.id` (ON DELETE CASCADE) |
| `storage_path` | `text` | Sí | Ruta en almacenamiento (ej. `objects/{id}/photo.webp`) |
| `url` | `text` | No | URL pública o firmada temporalmente |
| `mime_type` | `text` | Sí | Tipo MIME |
| `file_size` | `integer` | No | Tamaño en bytes |
| `is_cover` | `boolean` | Sí (default `false`) | Si es la imagen de portada |
| `uploaded_at` | `timestamptz` | Sí | Fecha de subida |
| `uploaded_by` | `uuid` | No | FK → `profiles.id` |

- **Clave primaria:** `id`
- **Clave foránea:** `object_id` → `objects.id`
- **Índices:** `object_id`, `is_cover`
- **Restricción:** una sola portada por objeto (`UNIQUE (object_id) WHERE is_cover = true`).
- **Públicos:** `url` (solo si el objeto está publicado y el archivo es de portada o permitido)
- **Privados:** `storage_path` (se accede mediante URLs firmadas del servidor)

### 2.8 `custody_records`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `object_id` | `uuid` | Sí | FK → `objects.id` (UNIQUE) |
| `received_by` | `uuid` | Sí | FK → `profiles.id` (personal autorizado) |
| `received_at` | `timestamptz` | Sí | Fecha y hora de recepción física |
| `custody_point` | `text` | Sí | Punto de custodia donde se recibe |
| `condition_notes` | `text` | No | Observaciones de estado del objeto |
| `received_from` | `text` | No | Quién lo entregó (si es un objeto encontrado) |
| `created_at` | `timestamptz` | Sí | Fecha de creación |

- **Clave primaria:** `id`
- **Claves foráneas:** `object_id` → `objects.id`, `received_by` → `profiles.id`
- **Restricción de integridad institucional (C-1):** el personal que recibe (`received_by`) debe tener una membresía activa en la misma `institution_id` que el objeto (`objects.institution_id`). Esto se valida mediante trigger o función de servidor.
- **Único:** `object_id` (un objeto solo tiene un registro de custodia activo)
- **Índices:** `object_id`, `received_by`, `received_at`, índice compuesto `(institution_id_vía_objeto, received_at)` (ver M-4)
- **Privados:** `condition_notes`, `received_from` (solo personal de custodia)

### 2.9 `recovery_requests`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `object_id` | `uuid` | Sí | FK → `objects.id` |
| `claimant_id` | `uuid` | Sí | FK → `profiles.id` (quien reclama) |
| `claimed_at` | `timestamptz` | Sí | Fecha de la reclamación |
| `description` | `text` | Sí | Descripción del reclamante para verificar propiedad |
| `contact_preference` | `text` | No | Medio de contacto preferido |
| `state` | `text` | Sí | `pending`, `approved`, `rejected`, `cancelled` |
| `reviewed_by` | `uuid` | No | FK → `profiles.id` (revisor) |
| `reviewed_at` | `timestamptz` | No | Fecha de la decisión |
| `review_notes` | `text` | No | Notas del revisor |
| `decision_reason` | `text` | No | Motivo de la decisión |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Claves foráneas:** `object_id` → `objects.id`, `claimant_id` → `profiles.id`, `reviewed_by` → `profiles.id`
- **Restricción de unicidad de solicitudes pendientes (C-5):** índice único parcial `UNIQUE (object_id) WHERE state = 'pending'` en PostgreSQL. Cuando una solicitud pasa a `approved`, `rejected` o `cancelled`, deja de ocupar la única posición `pending`, permitiendo una nueva solicitud para el mismo objeto si el flujo lo permite.
- **Índices:** `object_id`, `claimant_id`, `state`, `claimed_at`
- **Privados:** `claimant_id`, `description`, `contact_preference`, `review_notes` (solo el reclamante y personal autorizado)
- **Regla:** ninguna solicitud se aprueba automáticamente. La transición a `approved` requiere acción manual de un revisor autorizado.

### 2.10 `recovery_reviews`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `recovery_request_id` | `uuid` | Sí | FK → `recovery_requests.id` |
| `reviewer_id` | `uuid` | Sí | FK → `profiles.id` |
| `decision` | `text` | Sí | `approved`, `rejected`, `needs_more_info` |
| `notes` | `text` | No | Notas de la revisión |
| `decided_at` | `timestamptz` | Sí | Fecha de la decisión |
| `created_at` | `timestamptz` | Sí | Fecha de creación |

- **Clave primaria:** `id`
- **Claves foráneas:** `recovery_request_id` → `recovery_requests.id`, `reviewer_id` → `profiles.id`
- **Índices:** `recovery_request_id`, `reviewer_id`, `decision`, `decided_at`
- **Propósito:** historial inmutable de decisiones sobre cada reclamación. No se edita ni elimina; correcciones se registran como nueva entrada (ver I-5).

### 2.11 `deliveries`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `recovery_request_id` | `uuid` | Sí | FK → `recovery_requests.id` (UNIQUE) |
| `prepared_by` | `uuid` | Sí | FK → `profiles.id` (personal que preparó la entrega) |
| `prepared_at` | `timestamptz` | Sí | Fecha de preparación |
| `delivery_point` | `text` | Sí | Punto físico de entrega |
| `qr_token_hash` | `text` | Sí | Hash del token QR (nunca el token plano) |
| `qr_expires_at` | `timestamptz` | Sí | Fecha de expiración del QR |
| `qr_revoked_at` | `timestamptz` | No | Fecha de revocación |
| `delivered_at` | `timestamptz` | No | Fecha de entrega física verificada |
| `delivered_by` | `uuid` | No | FK → `profiles.id` (personal que verificó) |
| `delivery_confirmed_at` | `timestamptz` | No | Fecha de confirmación atómica |
| `confirmation_notes` | `text` | No | Notas de la entrega |
| `created_at` | `timestamptz` | Sí | Fecha de creación |
| `updated_at` | `timestamptz` | Sí | Última actualización |

- **Clave primaria:** `id`
- **Claves foráneas:** `recovery_request_id` → `recovery_requests.id`, `prepared_by`, `delivered_by`
- **Restricción de integridad institucional (C-1):** `deliveries` hereda la institución a través de `recovery_requests → objects → institutions`. Se valida en servidor que `prepared_by` y `delivered_by` pertenezcan a la misma institución que el objeto.
- **Segregación de funciones (I-4):** por defecto se recomienda `prepared_by <> delivered_by` cuando ambos están presentes. La validación se realiza en función de servidor; si una institución autoriza que la misma persona prepare y confirme, se registra como excepción autorizada en `audit_log`.
- **Único:** `recovery_request_id` (una entrega por reclamación aprobada)
- **Índices:** `recovery_request_id`, `qr_token_hash`, `qr_expires_at`, `delivered_at`
- **Privados:** `qr_token_hash`, `prepared_by`, `delivered_by`, `delivery_point` (solo personal autorizado)
- **Regla de uso único:** `delivered_at` se establece una sola vez mediante operación atómica (UPDATE condicional donde `delivered_at IS NULL`).

### 2.12 `delivery_qr_attempts`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `delivery_id` | `uuid` | Sí | FK → `deliveries.id` |
| `attempted_at` | `timestamptz` | Sí | Fecha del intento |
| `success` | `boolean` | Sí | Si el intento fue exitoso |
| `failure_reason` | `text` | No | Motivo de fallo controlado (ver M-3) |
| `created_at` | `timestamptz` | Sí | Fecha de creación |

- **Clave primaria:** `id`
- **Clave foránea:** `delivery_id` → `deliveries.id`
- **Restricción de valores controlados (M-3):** `CHECK (failure_reason IN ('expired','revoked','already_used','invalid','membership_missing','hash_mismatch'))` cuando no es nulo.
- **Índices:** `delivery_id`, `attempted_at`, `success`
- **Propósito:** registro de intentos fallidos para detectar fuerza bruta o reutilización. No almacena el token ni secretos.
- **Privados:** ninguno adicional más allá del vínculo a la entrega.

### 2.13 `audit_log`

| Campo | Tipo | Obligatorio | Descripción |
|-------|------|-------------|-------------|
| `id` | `uuid` | Sí | Clave primaria |
| `institution_id` | `uuid` | Sí | FK → `institutions.id` |
| `actor_id` | `uuid` | No | FK → `profiles.id` (nullable para acciones del sistema) |
| `action` | `text` | Sí | Acción realizada (ej. `object.publish`, `delivery.confirm`, `delivery.revoke`) |
| `entity_type` | `text` | Sí | Tipo de entidad afectada |
| `entity_id` | `text` | Sí | Identificador de la entidad afectada |
| `old_values` | `jsonb` | No | Valores anteriores |
| `new_values` | `jsonb` | No | Valores nuevos |
| `created_at` | `timestamptz` | Sí | Fecha de la acción |

- **Clave primaria:** `id`
- **Claves foráneas:** `institution_id` → `institutions.id`, `actor_id` → `profiles.id`
- **Regla de población de `institution_id` (C-1):** para acciones de usuario, `institution_id` se infiere de la membresía activa del `actor_id` en el momento de la acción. Para acciones del sistema (`actor_id IS NULL`), la función de servidor inyecta explícitamente la `institution_id` correspondiente; nunca se deja nula ni se infiere del cliente.
- **Índices:** `institution_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `created_at`
- **Privados:** `old_values`, `new_values` (pueden contener datos sensibles; acceso restringido a administradores y auditores)
- **Conservación:** inmutable. Nunca se edita ni se elimina. La política de retención se configura por institución.

---

## 3. Relaciones y cardinalidad (resumen)

```
institutions 1 — N campuses
institutions 1 — N memberships
institutions 1 — N categories (globales si institution_id es NULL)
institutions 1 — N objects
institutions 1 — N audit_log

campuses 1 — N memberships
campuses 1 — N objects (con restricción: campuses.institution_id = objects.institution_id)

profiles 1 — N memberships
profiles 1 — N objects (como reporter)
profiles 1 — N custody_records (como received_by, con restricción institucional)
profiles 1 — N recovery_requests (como claimant)
profiles 1 — N recovery_reviews (como reviewer)
profiles 1 — N deliveries (como prepared_by / delivered_by, con restricción institucional)
profiles 1 — N audit_log (como actor)

categories 1 — N objects

objects 1 — N object_files
objects 1 — 1 custody_records
objects 1 — N recovery_requests

recovery_requests 1 — N recovery_reviews
recovery_requests 1 — 1 deliveries

deliveries 1 — N delivery_qr_attempts
```

---

## 4. Estados y transiciones del objeto

### 4.1 Estados

| Estado | Significado | ¿Puede publicarse en catálogo? |
|--------|-------------|-------------------------------|
| `reported` | Reporte inicial creado | No |
| `under_review` | Bajo revisión del personal | No |
| `in_custody` | Recibido físicamente en punto de custodia (solo `found`) | No |
| `published` | Disponible en catálogo para recuperación | Sí |
| `claimed` | Hay una solicitud de recuperación pendiente | Sí (visualmente, con reclamación activa) |
| `approved` | Reclamación aprobada manualmente | No (retirado del catálogo público) |
| `delivery_prepared` | Entrega preparada, QR emitido | No |
| `delivered` | Entregado físicamente y verificado | No |
| `closed` | Proceso cerrado y auditado | No |
| `rejected` | Reporte rechazado (no procede) | No |
| `unclaimed` | No reclamado dentro de la política institucional | No |

### 4.2 Flujos diferenciados (I-2)

**Flujo de objetos `found` (encontrados por terceros):**
Un objeto encontrado por otra persona debe ser recibido físicamente antes de publicarse.

| Desde → Hasta | Rol autorizado | Condición previa |
|---------------|----------------|------------------|
| `reported` → `under_review` | Personal de custodia o revisor | Reporte válido, duplicado verificado |
| `under_review` → `in_custody` | Personal de custodia | Objeto físico recibido en punto de custodia (`custody_records` creado) |
| `under_review` → `rejected` | Personal de custodia o revisor | Reporte no procede o es duplicado |
| `in_custody` → `published` | Personal de custodia | Registro de custodia creado, imágenes y descripción verificadas |
| `published` → `claimed` | Estudiante (reclamante) | Objeto publicado, reclamación con descripción de verificación |
| `claimed` → `approved` | Revisor autorizado | Revisión manual, verificación de propiedad |
| `claimed` → `rejected` | Revisor autorizado | No se verifica la propiedad |
| `approved` → `delivery_prepared` | Personal de custodia | Reclamación aprobada, punto de entrega definido |
| `delivery_prepared` → `delivered` | Personal de custodia | QR verificado físicamente, entrega confirmada atómicamente |
| `delivered` → `closed` | Personal de custodia o revisor | Entrega verificada, auditoría registrada |
| `published` → `unclaimed` | Administrador de institución | Objeto no reclamado tras período definido por la institución |

**Flujo de objetos `lost` (perdidos por su propietario):**
Un objeto perdido reportado por su propio dueño no requiere recepción física en custodia para publicarse como reporte de búsqueda.

| Desde → Hasta | Rol autorizado | Condición previa |
|---------------|----------------|------------------|
| `reported` → `under_review` | Personal de custodia o revisor | Reporte válido, duplicado verificado |
| `under_review` → `published` | Personal de custodia o revisor | Reporte verificado; no hay objeto físico que recibir |
| `under_review` → `rejected` | Personal de custodia o revisor | Reporte no procede o es duplicado |
| `published` → `claimed` | Estudiante (reclamante) | Objeto publicado, reclamación con descripción de verificación |
| `claimed` → `approved` | Revisor autorizado | Revisión manual, verificación de propiedad |
| `claimed` → `rejected` | Revisor autorizado | No se verifica la propiedad |
| `approved` → `delivery_prepared` | Personal de custodia | Reclamación aprobada, punto de entrega definido |
| `delivery_prepared` → `delivered` | Personal de custodia | QR verificado físicamente, entrega confirmada atómicamente |
| `delivered` → `closed` | Personal de custodia o revisor | Entrega verificada, auditoría registrada |
| `published` → `unclaimed` | Administrador de institución | Objeto no reclamado tras período definido por la institución |

**Reglas críticas:**
- Un objeto `found` reportado **no** entra en custodia automáticamente. Solo pasa a `in_custody` tras `custody_records`.
- Un objeto `lost` **no** requiere estado `in_custody` para publicarse.
- Una reclamación **no** se aprueba automáticamente por coincidencia de datos. Requiere decisión manual en `recovery_reviews`.
- Una solicitud aprobada **no** implica entrega. Requiere transición a `delivery_prepared` y luego `delivered`.
- Un estudiante **no** puede transicionar un objeto a `delivered`. Solo personal de custodia puede confirmar la entrega física.

---

## 5. Decisiones importantes

- **Tabla `objects` unificada:** evita duplicar esquemas, filtros y búsquedas entre `lost` y `found`. El campo `kind` distingue el tipo de reporte.
- **`memberships` con `campus_id` nullable:** permite membresía a nivel institucional completo o a una sede específica, sin forzar una sede a todos los usuarios.
- **Categorías globales vs por institución:** `institution_id` nullable permite categorías compartidas (el catálogo de demostración usa las 8 globales) y categorías propias por institución.
- **Hash del token QR, nunca el plano:** `deliveries.qr_token_hash` almacena solo el hash criptográfico. El token plano se genera en el servidor, se imprime en el QR y se descarta.
- **Auditoría inmutable:** `audit_log` nunca se edita ni borra, garantizando trazabilidad de decisiones sensibles.
- **Segregación de funciones por defecto:** `prepared_by <> delivered_by` recomendado; excepciones autorizadas se registran en `audit_log`.
