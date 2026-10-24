# Matriz de permisos — FindIt Campus

**Estado:** propuesta de arquitectura (diseño técnico revisable, sin implementar).  
**Versión:** 1.1 (corregida tras auditoría de arquitectura)  
**Compatibilidad:** PostgreSQL / Supabase RLS. No se ejecutó SQL, no se conectó Supabase, no se modificó ninguna base de datos.

---

## 1. Roles definidos

| Rol | Código | Alcance | Descripción |
|-----|--------|---------|-------------|
| Visitante no autenticado | `visitor` | Público | Usuario sin sesión. Solo lectura de datos públicos del catálogo. |
| Estudiante / usuario institucional | `student` | Por institución | Usuario autenticado con membresía activa en una institución. Puede reportar objetos perdidos y reclamar objetos publicados dentro de su institución. |
| Personal autorizado para recibir objetos | `custody_staff` | Por institución | Personal de recepción y custodia. Recibe objetos físicamente, los registra y prepara entregas. No presenta reclamaciones por defecto. |
| Personal revisor de reclamaciones | `reviewer` | Por institución | Revisa solicitudes de recuperación, toma decisiones de aprobación o rechazo. |
| Administrador de institución | `institution_admin` | Por institución | Gestiona usuarios, membresías, categorías, sedes y configuración de su institución. Consulta auditoría de su institución. |
| Administrador global de la plataforma | `platform_admin` | Global | Configura instituciones, supervisa auditoría global y gestiona roles de nivel plataforma. Su acceso se modela mediante la tabla `platform_admins` (ver C-4), no como una membresía institucional ordinaria. |

**Regla de oro:** los permisos se evalúan siempre dentro del alcance de una **membresía activa** (`memberships.is_active = true`) en una institución específica, excepto para `platform_admin` cuyo acceso se rige por su tabla dedicada. Un rol en una institución no otorga permisos en otra.

---

## 2. Matriz de acciones por entidad

### 2.1 `institutions`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar datos públicos | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consultar configuración interna | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia) | ✅ (todas) |
| Crear | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Modificar | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia) | ✅ (todas) |
| Eliminar / desactivar | ❌ | ❌ | ❌ | ❌ | ❌ (solo desactivar propia) | ✅ |
| Administrar usuarios y permisos | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia) | ✅ (todas) |

### 2.2 `campuses`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar | ✅ (públicos) | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ (todas) |
| Crear | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia) | ✅ |
| Modificar | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia) | ✅ |
| Eliminar / desactivar | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia, si no hay objetos activos) | ✅ |

### 2.3 `profiles`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar propio perfil | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consultar perfiles de otros miembros | ❌ | ❌ | ❌ | ❌ | ✅ (solo misma institución, campos públicos) | ✅ (campos públicos) |
| Modificar propio perfil | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modificar campos sensibles (documento, teléfono) | ❌ | ❌ (solo solicitud) | ❌ | ❌ | ❌ | ❌ (solicitud de cambio) |
| Crear / eliminar | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ (vía sistema de auth) |

### 2.4 `memberships`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar propias membresías | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consultar membresías de la institución | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| Crear membresía | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución) | ✅ |
| Modificar rol o campus | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución) | ✅ |
| Desactivar membresía | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución) | ✅ |
| Auto-asignar rol privilegiado | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Excepción crítica:** ningún rol puede auto-asignarse `institution_admin` ni `platform_admin`. La asignación de roles privilegiados requiere una membresía existente con ese rol superior o una acción de `platform_admin` a través de su tabla dedicada.

### 2.5 `categories`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar (activas) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Crear | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución) | ✅ |
| Modificar | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución, no globales) | ✅ |
| Eliminar / desactivar | ❌ | ❌ | ❌ | ❌ | ✅ (solo propia institución, no globales) | ✅ |

### 2.6 `objects`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar publicados | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consultar propios reportes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consultar no publicados (custodia, revisión) | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear reporte | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Modificar propio reporte (estado `reported`) | ❌ | ✅ (solo propio) | ❌ | ❌ | ❌ | ❌ |
| Modificar campos sensibles (estado, custodia, publicación) | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Publicar en catálogo | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Cambiar estado de ciclo de vida | ❌ | ❌ | ✅ (transiciones de custodia) | ✅ (transiciones de revisión) | ✅ (supervisión) | ✅ |
| Eliminar | ❌ | ❌ | ❌ | ❌ | ❌ (solo desactivar) | ✅ |

**Nota:** `visitor` solo ve objetos con `state = 'published'` y `is_active = true` de instituciones activas.

### 2.7 `object_files`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar portada de objeto publicado | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Consultar archivos privados del objeto | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Subir imagen a propio reporte | ❌ | ✅ (solo propio reporte) | ❌ | ❌ | ❌ | ❌ |
| Subir imagen a objeto en custodia | ❌ | ❌ | ✅ (propia institución) | ❌ | ✅ (propia institución) | ✅ |
| Eliminar | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2.8 `custody_records`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear | ❌ | ❌ | ✅ (propia institución) | ❌ | ❌ | ✅ |
| Modificar | ❌ | ❌ | ✅ (propia institución, solo propio registro reciente) | ❌ | ✅ (propia institución) | ✅ |
| Eliminar | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 2.9 `recovery_requests` (I-1 corregido)

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar propias solicitudes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consultar solicitudes de la institución | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear solicitud | ❌ | ✅ (sobre objetos publicados de su institución) | ❌ | ❌ | ❌ | ❌ |
| Modificar propia solicitud (estado `pending`) | ❌ | ✅ (solo propia) | ❌ | ❌ | ❌ | ❌ |
| Revisar y decidir (aprobar / rechazar) | ❌ | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Cancelar propia solicitud | ❌ | ✅ (solo propia, estado `pending`) | ❌ | ❌ | ❌ | ❌ |

**Justificación I-1:** por defecto, solo el estudiante (reclamante) presenta una solicitud de recuperación. `custody_staff` recibe objetos y prepara entregas, pero no presenta reclamaciones. Si una institución requiere que el personal pueda presentar solicitudes en nombre de un tercero, debe activarse como excepción documentada y validarse en servidor.

**Excepción:** un estudiante **no** puede aprobar su propia solicitud ni marcarla como entregada. La decisión requiere un `reviewer` o `institution_admin` distinto del reclamante.

### 2.10 `recovery_reviews`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar historial de propias solicitudes | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Consultar todas las revisiones de la institución | ❌ | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear revisión (decisión) | ❌ | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Modificar / eliminar | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ (inmutable) |

### 2.11 `deliveries`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar propias entregas | ❌ | ✅ (solo como reclamante) | ❌ | ❌ | ❌ | ❌ |
| Consultar entregas de la institución | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear / preparar entrega | ❌ | ❌ | ✅ (propia institución, reclamación aprobada) | ❌ | ✅ (propia institución) | ✅ |
| Verificar QR y confirmar entrega física | ❌ | ❌ | ✅ (propia institución) | ❌ | ✅ (propia institución) | ✅ |
| Revocar QR | ❌ | ❌ | ✅ (propia institución) | ❌ | ✅ (propia institución) | ✅ |
| Cerrar proceso | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |

**Segregación de funciones (I-4):** por defecto se recomienda que `prepared_by` y `delivered_by` sean personas distintas. La validación `prepared_by <> delivered_by` se ejecuta en función de servidor cuando ambos campos están presentes. Si una institución autoriza que la misma persona prepare y confirme, se registra como excepción autorizada en `audit_log` y no se impide técnicamente, pero queda trazada.

**Excepción:** un estudiante **no** puede confirmar una entrega ni marcar un objeto como `delivered`. Solo `custody_staff` o roles superiores pueden hacerlo, y solo tras verificar el QR físicamente.

### 2.12 `delivery_qr_attempts`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar intentos de propias entregas | ❌ | ✅ (solo propia reclamación) | ❌ | ❌ | ❌ | ❌ |
| Consultar todos los intentos de la institución | ❌ | ❌ | ✅ (propia institución) | ✅ (propia institución) | ✅ (propia institución) | ✅ |
| Crear intento | ❌ | ❌ | ❌ (solo sistema) | ❌ | ❌ | ❌ (solo sistema) |

### 2.13 `audit_log`

| Acción | visitor | student | custody_staff | reviewer | institution_admin | platform_admin |
|--------|---------|---------|---------------|----------|-------------------|----------------|
| Consultar auditoría propia | ❌ | ✅ (acciones propias) | ✅ (acciones propias) | ✅ (acciones propias) | ✅ (acciones propias) | ✅ |
| Consultar auditoría de la institución | ❌ | ❌ | ❌ | ❌ | ✅ (propia institución) | ✅ |
| Consultar auditoría global | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Escribir entrada | ❌ | ❌ | ❌ (solo sistema) | ❌ | ❌ | ❌ (solo sistema) |

**Excepción:** `audit_log` es de solo lectura para todos los roles humanos. Solo el sistema (servidor o funciones de base de datos) escribe entradas.

---

## 3. Reglas de alcance y herencia

1. **Un rol no se transfiere entre instituciones.** Ser `institution_admin` en la Universidad A no otorga permisos en la Universidad B.
2. **Un rol en una institución no implica rol en sus sedes.** `custody_staff` con `campus_id` nulo tiene alcance institucional; con `campus_id` específico, alcance limitado a esa sede.
3. **El rol más restrictivo gana.** Si un usuario tiene múltiples membresías en la misma institución (ej. `student` y `custody_staff`), los permisos se evalúan por acción usando la membresía relevante al contexto (ej. reportar como `student`, recibir como `custody_staff`).
4. **No auto-escalada.** Ningún usuario puede crear o modificar su propia membresía para otorgarse un rol privilegiado. Solo `institution_admin` de la misma institución o `platform_admin` pueden modificar membresías.
5. **Sin acceso por omisión.** Una solicitud HTTP desde el navegador que incluya un ID válido **no** es suficiente para autorizar una operación sensible. El servidor debe validar la membresía activa y el rol del actor para esa institución.

---

## 4. Decisiones importantes

- **Aislamiento por `institution_id` en RLS.** Cada política de fila verifica que el actor tenga una membresía activa en la `institution_id` de la fila, excepto para datos públicos (`objects.state = 'published'`) que son legibles por cualquier visitante dentro de su institución.
- **Roles mutuamente exclusivos por contexto.** Un usuario actúa como `student` al reportar, como `custody_staff` al recibir, como `reviewer` al decidir. La interfaz debe exponer solo las acciones disponibles para el rol activo en esa sesión/institución.
- **Inmutabilidad de auditoría.** `recovery_reviews` y `audit_log` no se editan ni eliminan. Cualquier corrección se registra como una nueva entrada.
- **El `platform_admin` no gestiona procesos diarios.** Su alcance es configurar instituciones, supervisar auditoría global y responder a incidentes. No interviene en entregas ni reclamaciones específicas salvo casos escalados.
- **Segregación de funciones por defecto.** Se recomienda `prepared_by <> delivered_by`; excepciones autorizadas se registran en `audit_log`.
