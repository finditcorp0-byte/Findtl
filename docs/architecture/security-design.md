# Diseño de seguridad — FindIt Campus

**Estado:** propuesta de arquitectura (diseño técnico revisable, sin implementar).  
**Versión:** 1.1 (corregida tras auditoría de arquitectura)  
**Compatibilidad:** Supabase / PostgreSQL RLS. No se conectó Supabase, no se ejecutó SQL, no se modificó ninguna base de datos, no se crearon credenciales.

---

## 1. Estrategia de autenticación y perfiles

- **Autenticación delegada:** Supabase Auth (o equivalente) gestiona usuarios, sesiones y contraseñas. El frontend de demostración no implementa autenticación real; esta capa se conecta en una fase futura.
- **Perfil separado:** la tabla `profiles` almacena datos de identidad y está vinculada 1:1 al identificador de autenticación (`auth.users.id` en Supabase). No se almacenan credenciales en `profiles`.
- **Sincronización `profiles.id` ↔ `auth.users.id`:** al crear un usuario en el proveedor de autenticación, un trigger o función de servidor (`SECURITY DEFINER`) crea la fila correspondiente en `profiles` con el mismo `id`. Al desactivar o eliminar un usuario de auth, se marca `profiles.is_active = false` (no se borra la fila para preservar auditoría). Las membresías activas del usuario se desactivan (`memberships.is_active = false`), impidiendo nuevas operaciones.
- **Membresía como fuente de permisos:** los permisos no se derivan del rol de Supabase directamente, sino de la tabla `memberships`, que vincula un perfil con una institución y un rol activo.
- **No se asume inicio de sesión institucional (SSO/SAML/OAuth)** hasta que se implemente y verifique con cada institución.

---

## 2. Row Level Security (RLS) por grupo de tablas

RLS se habilita en **todas** las tablas de negocio. El `service_role` solo se usa en el servidor (funciones de servidor o Edge Functions) y nunca se expone al navegador.

**Importante (C-2):** RLS filtra **filas**, no columnas dentro de una fila autorizada. Si una política permite `SELECT` en `profiles`, expone todas las columnas de esa fila. Por tanto, los datos sensibles de perfiles y reclamaciones se separan físicamente (tablas o vistas con privilegios restringidos), no solo mediante RLS.

### 2.1 `institutions`

- **Lectura:** cualquier usuario autenticado puede leer instituciones activas (`is_active = true`). Los visitantes no autenticados leen solo campos públicos (`name`, `city`, `country`, `logo_url`).
- **Inserción:** solo `platform_admin` (función de servidor).
- **Actualización / eliminación:** solo `institution_admin` de la misma institución o `platform_admin`.
- **Condición clave:** `auth.uid()` debe tener una membresía activa en `institution_id` para operaciones no públicas.

### 2.2 `campuses`

- **Lectura:** cualquier autenticado puede leer sedes activas de su institución.
- **Inserción / actualización / eliminación:** solo `institution_admin` de la institución dueña (`campuses.institution_id` coincide con la membresía del actor) o `platform_admin`.
- **Condición clave:** `EXISTS (SELECT 1 FROM memberships WHERE profile_id = auth.uid() AND institution_id = campuses.institution_id AND role IN ('institution_admin', 'platform_admin') AND is_active = true)`.

### 2.3 `profiles` y `profiles_private` (C-2)

**Separación de columnas sensibles:** los campos privados de perfiles (`email`, `phone`, `document_type`, `document_number`) se almacenan en una tabla separada `profiles_private` con PK `profile_id` → `profiles.id`, con su propia política RLS independiente y más restrictiva. `profiles` solo contiene campos públicos o semipúblicos (`full_name`, `avatar_url`, `is_active`).

- **Lectura `profiles`:** un perfil puede leerse por sí mismo. Otros miembros de la misma institución pueden leer campos públicos (`full_name`, `avatar_url`) si existe una membresía compartida.
- **Lectura `profiles_private`:** solo el propio perfil (`auth.uid() = profile_id`) o personal autorizado con justificación registrada en auditoría. `institution_admin` **no** tiene acceso automático a `document_number`, `phone` ni `email` a menos que exista una política explícita y justificada por institución.
- **Actualización:** solo el propio perfil puede modificar sus datos. Campos sensibles requieren flujo de solicitud de cambio, no edición directa.
- **Condición clave:** `auth.uid() = profiles.id` para escritura; membresía compartida para lectura cruzada limitada.

### 2.4 `memberships`

- **Lectura:** un usuario lee sus propias membresías. `institution_admin` lee membresías de su institución. `platform_admin` lee todas.
- **Inserción / actualización / eliminación:** solo `institution_admin` de la misma institución o `platform_admin`.
- **Prevención de auto-escalada:** una política de inserción rechaza cualquier intento de establecer `role IN ('institution_admin', 'platform_admin')` cuando el actor es el propio perfil y no existe una membresía previa con ese rol superior.
- **Condición clave:** el `institution_id` de la membresía debe coincidir con una membresía activa del actor con rol administrativo en esa institución.

### 2.5 `categories`

- **Lectura:** cualquier visitante lee categorías activas (`is_active = true`). Las globales (`institution_id IS NULL`) son visibles para todas las instituciones; las de una institución solo para miembros de esa institución.
- **Inserción / actualización / eliminación:** solo `institution_admin` de la institución dueña o `platform_admin`. No se pueden modificar categorías globales desde una institución.

### 2.6 `objects`

- **Lectura pública (visitante `anon`):** cualquier visitante lee objetos con `state = 'published'` y `institution_id` de una institución activa, **proyectando solo columnas públicas** (`id`, `title`, `description`, `zone`, `location`, `kind`, `category`, `published_at`, `custody_point`, `reference_code`). Esto se implementa mediante una vista o política que restrinja columnas, no solo filas (ver C-2).
- **Lectura restringida:** objetos en estados `reported`, `under_review`, `in_custody`, `claimed`, `approved`, `delivery_prepared` solo son legibles por `custody_staff`, `reviewer`, `institution_admin` de la misma institución, y el `reporter_id` (solo sus propios reportes).
- **Inserción:** cualquier usuario autenticado con membresía activa puede crear un objeto en su institución. El `institution_id` se asigna mediante función de servidor (ver C-3); el cliente no puede escribirlo arbitrariamente.
- **Actualización:** el `reporter_id` puede editar su propio reporte solo mientras esté en estado `reported`. Cambios de estado (`custody`, `publish`, `approve`, `deliver`) solo por roles autorizados en la misma institución.
- **Eliminación física:** prohibida. Soft delete mediante `state = 'closed'` o desactivación.
- **Condición clave para aislamiento:** `objects.institution_id` debe coincidir con la `institution_id` de una membresía activa del actor. Un visitante no puede leer objetos no publicados de otra institución modificando el ID en la URL (IDOR evitado).

### 2.7 `object_files`

- **Lectura:** portada de objetos publicados: cualquier visitante. Archivos restantes: solo personal autorizado de la misma institución.
- **Inserción:** el `reporter_id` puede subir imágenes a su propio reporte. `custody_staff` puede subir a objetos en custodia de su institución.
- **Almacenamiento:** las rutas (`storage_path`) no son públicas. El acceso se hace mediante URLs firmadas generadas en el servidor, con validación de membresía antes de firmar.

### 2.8 `custody_records`

- **Lectura:** solo `custody_staff`, `reviewer`, `institution_admin` de la misma institución.
- **Inserción:** solo `custody_staff` de la misma institución.
- **Actualización:** solo el creador del registro (ventana limitada) o `institution_admin` / `platform_admin`.
- **Condición clave:** `custody_records.object_id` debe apuntar a un objeto de la misma institución del actor.

### 2.9 `recovery_requests`

- **Lectura:** el `claimant_id` lee sus propias solicitudes. Personal autorizado de la misma institución lee todas las solicitudes de objetos de esa institución.
- **Inserción:** cualquier estudiante con membresía activa puede crear una solicitud sobre un objeto `published` de su institución (ver I-1: `custody_staff` no crea solicitudes por defecto).
- **Actualización:** el `claimant_id` puede cancelar su propia solicitud solo en estado `pending`. Campos de decisión (`state`, `reviewed_by`, `review_notes`) solo por `reviewer` o superior.
- **Condición clave:** el objeto debe estar `published` y pertenecer a la misma institución del reclamante.

### 2.10 `recovery_reviews`

- **Lectura:** el reclamante lee revisiones de sus propias solicitudes. Personal autorizado de la misma institución lee todas.
- **Inserción:** solo `reviewer` o `institution_admin` de la misma institución.
- **Actualización / eliminación:** prohibida (inmutable). Correcciones se registran como nueva entrada.
- **Condición clave:** el revisor debe tener membresía activa en la institución del objeto.

### 2.11 `deliveries`

- **Lectura:** el reclamante lee su propia entrega. Personal autorizado de la misma institución lee todas.
- **Inserción:** solo `custody_staff` o `institution_admin` de la misma institución, sobre una reclamación `approved`.
- **Actualización:** solo `custody_staff` puede confirmar entrega (`delivered_at`) tras verificación QR. `qr_revoked_at` solo por personal autorizado.
- **Condición clave:** `deliveries.recovery_request_id` debe apuntar a una solicitud de la misma institución del actor.

### 2.12 `delivery_qr_attempts`

- **Lectura:** personal autorizado de la misma institución. El reclamante ve intentos de su propia entrega.
- **Inserción:** solo el sistema (función de servidor que valida el QR).
- **Condición clave:** misma institución.

### 2.13 `audit_log`

- **Lectura:** `institution_admin` de la misma institución, `platform_admin`. Un actor lee sus propias acciones.
- **Inserción:** solo el sistema (triggers o funciones de servidor). Nunca un cliente.
- **Actualización / eliminación:** prohibida para todos los roles humanos.

---

## 3. Inserciones seguras y `institution_id` (C-3)

RLS **no asigna valores** a columnas en un `INSERT`; solo permite o deniega la fila. Por tanto, `institution_id` no se "infiera" automáticamente desde el cliente. La estrategia es:

1. **Funciones de servidor (`SECURITY DEFINER`) para escrituras sensibles:** operaciones que requieren asignar `institution_id` (crear objetos, membresías, entregas, etc.) se ejecutan mediante funciones de servidor que:
   - Validan `auth.uid()` (usuario autenticado; rechazan llamadas anónimas).
   - Comprueban que el actor tiene una membresía activa (`memberships.is_active = true`) en la institución objetivo.
   - Validan el rol del actor para la operación solicitada (ej. solo `custody_staff` puede crear `custody_records`).
   - Fijan `search_path` a un valor seguro (ej. `pg_catalog, public`) para evitar inyección de objetos.
   - Restringen `EXECUTE` a los roles necesarios; nunca se expone al público.
   - Inyectan `institution_id` desde la membresía validada, no desde el parámetro del cliente.
2. **Políticas RLS como barrera secundaria:** incluso si una función de servidor falla, las políticas RLS rechazan escrituras donde `institution_id` no coincida con una membresía activa del `auth.uid()`.
3. **Operaciones que no requieren `SECURITY DEFINER`:** lecturas públicas de objetos `published` y consultas de propias membresías pueden usar políticas RLS estándar con `auth.uid()` sin función de servidor, siempre que el cliente no pueda escribir `institution_id` arbitrariamente (la política lo rechaza).

**Operaciones que requieren control especial (función de servidor):**
- Inserción en `objects`, `custody_records`, `recovery_requests`, `deliveries`, `memberships`.
- Cualquier cambio de `state` sensible en `objects` o `recovery_requests`.
- Confirmación de entrega (`delivered_at`) en `deliveries`.

---

## 4. Rol `platform_admin` (C-4)

**Representación:** `platform_admin` no se modela como una membresía institucional ordinaria con `institution_id` relleno, porque eso le vincularía a una institución concreta. Se define una tabla dedicada:

- `platform_admins` (`id` UUID PK, `profile_id` UUID FK → `profiles.id`, `created_at`, `is_active`).
- Un perfil con fila en `platform_admins` y `is_active = true` tiene acceso global a todas las instituciones.

**Autenticación y autorización:**
- Se autentica como cualquier usuario mediante el proveedor de auth.
- Su rol se valida consultando `platform_admins` en las funciones de servidor o en políticas RLS que permiten el acceso global.
- No se le otorga acceso indiscriminado mediante una política excesivamente permisiva; cada operación sensible sigue verificando su membership en `platform_admins`.

**Auditoría y límites:**
- Sus acciones se registran en `audit_log` con `institution_id` rellena según el contexto de la operación (institución objetivo) y `actor_id` = su `profile_id`.
- No interviene en entregas ni reclamaciones específicas salvo casos escalados.
- `service_role` no se usa como solución general para las operaciones administrativas de `platform_admin`; solo para operaciones de infraestructura (seed inicial, notificaciones, generación de `audit_log` del sistema).

---

## 5. Seguridad del QR y entrega (C-6)

### 5.1 Flujo de emisión

1. Un `recovery_request` pasa a `approved` por decisión manual de un `reviewer`.
2. Un `custody_staff` prepara la entrega: crea un registro en `deliveries` con `delivery_point`, `qr_expires_at` (configurable por institución, sin plazo definitivo en este diseño), y genera un token aleatorio opaco (mínimo 32 bytes, base64url, generado criptográficamente).
3. El servidor almacena **solo el hash criptográfico** (SHA-256 o superior) del token en `deliveries.qr_token_hash`. El token plano se imprime en el código QR y se descarta de la memoria del servidor tras el hash.
4. El QR codifica una URL de verificación del servidor (no el token plano directamente, ni datos personales). Ejemplo: `https://campus.findit/verify?delivery={delivery_id}&token={token_plano}`. El `delivery_id` es un UUID y **no se confía en que sea secreto**; la seguridad reside en el token de alta entropía y su hash.
5. Se registra una entrada en `audit_log` con acción `delivery.prepare`.

### 5.2 Flujo de verificación

1. El personal de custodia escanea el QR en la aplicación institucional.
2. El servidor extrae `delivery_id` y `token_plano` de la solicitud.
3. **Valida identidad y permisos del actor:** el personal que escanea debe tener membresía activa (`custody_staff` o superior) en la misma institución que la entrega.
4. **Valida pertenencia institucional:** la entrega debe pertenecer a la misma institución que el actor (a través de `recovery_requests → objects → institutions`).
5. **Valida estado de la reclamación y la entrega:** la reclamación asociada debe estar `approved` y la entrega debe seguir activa (`delivered_at IS NULL`, `qr_revoked_at IS NULL`).
6. **Valida expiración:** `qr_expires_at > ahora`.
7. **Valida el token:** `deliveries.qr_token_hash = hash(token_plano)`. El token plano nunca se almacena ni se registra en logs.
8. **Confirma atómicamente** en una transacción:
   ```text
   BEGIN;
   UPDATE deliveries
   SET delivered_at = now(), delivered_by = auth.uid(), delivery_confirmed_at = now()
   WHERE id = :delivery_id
     AND delivered_at IS NULL
     AND qr_revoked_at IS NULL
     AND qr_expires_at > now();
   IF filas_afectadas = 0 THEN ROLLBACK y error;
   INSERT INTO delivery_qr_attempts (delivery_id, attempted_at, success) VALUES (:delivery_id, now(), true);
   INSERT INTO audit_log (...) VALUES (...);
   COMMIT;
   ```
9. Si el UPDATE afecta 0 filas (ya entregado, expirado o revocado), se registra un intento fallido en `delivery_qr_attempts` con `success = false` y se rechaza.

### 5.3 Limitación de intentos (C-6)

- El endpoint de verificación QR aplica **rate limiting** por dirección IP, por `delivery_id` y por institución para prevenir fuerza bruta contra el token.
- Los intentos fallidos se registran en `delivery_qr_attempts` con `failure_reason` controlado (`expired`, `revoked`, `already_used`, `invalid`, `membership_missing`, `hash_mismatch`).
- Tras un umbral configurable de intentos fallidos en un `delivery`, el QR se revoca automáticamente (`qr_revoked_at` se establece).

### 5.4 Escenarios de fallo

| Escenario | Comportamiento del sistema |
|-----------|---------------------------|
| Dos intentos simultáneos para el mismo QR | La transacción atómica permite que solo una fila sea actualizada (`delivered_at IS NULL`). El segundo intento falla y se registra como `success = false`. |
| QR vencido (`qr_expires_at` pasado) | Rechazado. Intento registrado como fallido (`expired`). El personal puede revocar y emitir un nuevo QR. |
| QR reutilizado (ya entregado) | Rechazado. Intento registrado como fallido (`already_used`). |
| QR de otra institución o entrega ajena | Rechazado por falta de membresía o por no coincidir el hash. No se revela si el `delivery_id` existe (respuesta genérica). |
| Solicitud revocada antes de la entrega | El QR se revoca (`qr_revoked_at` se establece). Cualquier intento posterior falla. |
| Token falsificado | El hash no coincide. Rechazado sin revelar información. |
| Token en logs | El token plano nunca se almacena ni se registra; solo se guarda su hash. |

### 5.5 Revocación y recuperación ante errores

- Un QR puede revocarse (`qr_revoked_at` establecido) por `custody_staff` o `institution_admin` de la misma institución antes de la entrega física.
- Tras revocación, se puede emitir un nuevo QR para la misma entrega si la reclamación sigue aprobada.
- Si el objeto ya fue entregado físicamente (`delivered_at` establecido), el proceso se cierra (`delivered` → `closed`) y no se puede emitir un nuevo QR.

### 5.6 ¿Por qué un estudiante no puede cerrar una entrega?

- El campo `delivered_at` solo se escribe mediante la función de servidor de verificación QR, que requiere rol `custody_staff` o superior.
- El cliente nunca envía `delivered_at` ni `delivery_confirmed_at`.
- El token plano solo se genera tras aprobación manual de una reclamación, por lo que un estudiante no tiene un token válido a menos que el personal lo entregue físicamente.

**Garantías de diseño vs implementación:** el diseño garantiza uso único, expiración, hash del token y validación institucional. La prevención de fuerza bruta efectiva, el rate limiting y el almacenamiento seguro del hash dependen de la implementación del servidor.

---

## 6. Privacidad y minimización de datos

### 6.1 ¿Qué es público (catálogo sin sesión)?

- `objects.id`, `title`, `description`, `zone`, `location`, `kind`, `category`, `published_at`, `custody_point`, `reference_code`, imagen de portada.
- **No público:** nombre del reportero, datos de contacto, número de documento, fotografías privadas, notas de custodia, descripción de verificación del reclamante.

### 6.2 ¿Qué es privado (solo personal autorizado)?

- `profiles_private.email`, `phone`, `document_number`, `document_type`.
- `recovery_requests.claimant_id`, `description`, `contact_preference`.
- `custody_records.condition_notes`, `received_from`.
- `deliveries.delivery_point`, `qr_token_hash`.
- `audit_log.old_values`, `audit_log.new_values` (pueden contener datos personales de versiones anteriores).

### 6.3 Fotografías de objetos

- Las fotografías de portada de objetos publicados son visibles en el catálogo.
- Fotografías adicionales se comparten solo con personal de custodia y revisores de la misma institución.
- Se recomienda no publicar fotografías que muestren documentos personales, matrículas, o identificaciones del reportero.

### 6.4 Objetos no reclamados

- No se eliminan ni se declaran abandonados automáticamente.
- Pasan a estado `unclaimed` tras un período configurable por institución (en `institutions.settings`).
- El personal revisa cada caso según la política institucional antes de cualquier acción (devolver al hallador, donar, archivo, etc.).

### 6.5 Conservación y anonimización

- `audit_log` se conserva de forma inmutable. La retención se configura por institución.
- Tras el cierre de un caso (`state = 'closed'`), los datos personales del reclamante (`contact_preference`, descripción de verificación) pueden anonimizarse según la política de cada institución.
- `document_number` se recomienda cifrar o almacenar en un vault separado; no se muestra en ninguna interfaz.
- Ningún plazo legal obligatorio se asume en este diseño; cada institución debe validar sus obligaciones con asesoría jurídica.

---

## 7. Corrección de decisiones y revocación de entregas (I-5)

- El historial de revisiones (`recovery_reviews`) es inmutable. No se edita ni se borra.
- Si una decisión de aprobación fue errónea y la entrega aún no se ha realizado, se registra una nueva entrada en `recovery_reviews` con decisión `rejected` y el motivo de la corrección, y se revoca el QR si existe (`qr_revoked_at`).
- Si el objeto ya fue entregado físicamente (`delivered_at` establecido), no se puede revertir la entrega mediante el sistema; se inicia un proceso administrativo externo y se registra en `audit_log`.
- Todas las correcciones y revocaciones dejan entrada de auditoría inalterable.

---

## 8. Amenazas identificadas y mitigaciones

| Amenaza | Descripción | Mitigación en diseño | Estado |
|---------|-------------|----------------------|--------|
| IDOR | Acceder a objetos/entregas de otra institución cambiando el ID en la URL | RLS valida `institution_id` vs membresía del actor; respuesta 404 genérica | Propuesto |
| Escalada de privilegios | Usuario se asigna rol `institution_admin` | Políticas de inserción rechazan auto-asignación; solo roles superiores | Propuesto |
| Reutilización de QR | Un QR ya usado se presenta de nuevo | `delivered_at` solo se establece una vez mediante UPDATE condicional atómico | Propuesto |
| QR vencido | Uso de QR expirado | `qr_expires_at` validado en el servidor antes de confirmar | Propuesto |
| Falsificación de QR | Token inventado | Comparación de hash criptográfico; token plano nunca almacenado | Propuesto |
| Entrega sin revisión | Objeto entregado sin aprobación de reclamación | `deliveries` solo sobre `recovery_requests.state = 'approved'` | Propuesto |
| Auto-entrega por estudiante | Estudiante marca objeto como entregado | `delivered_at` solo escribible por `custody_staff` o superior | Propuesto |
| Fuga de datos personales | Contacto del reclamante visible en catálogo | Campos privados excluidos de lectura pública; tabla `profiles_private` | Propuesto |
| Acceso cruzado entre instituciones | Usuario de la Universidad A ve objetos de la Universidad B | `institution_id` en tablas + RLS por membresía + restricciones compuestas | Propuesto |
| Fuerza bruta en QR | Muchos intentos de adivinar token | Rate limiting en endpoint; registro en `delivery_qr_attempts`; token alta entropía | Propuesto |

---

## 9. Decisiones que requieren confirmación institucional

- **Plazos de expiración del QR:** ¿cuánto tiempo es válido un QR tras la emisión? (configurable por institución).
- **Período de objetos no reclamados:** ¿cuántos días antes de pasar a `unclaimed`? ¿qué se hace entonces?
- **Retención de auditoría:** ¿cuánto tiempo conservar registros de auditoría tras cerrar un caso?
- **Datos personales mínimos:** ¿qué datos de contacto son necesarios para notificar al reclamante?
- **Inicio de sesión institucional:** ¿usar SSO/SAML de la universidad o autenticación propia de FindIt Campus?
- **Segregación de funciones en entrega:** ¿debe `prepared_by` <> `delivered_by`? (por defecto recomendado, excepción posible).

---

## 10. Riesgos que no resuelve solo la documentación

- La seguridad real depende de la implementación correcta de RLS y de que el `service_role` nunca se exponga al cliente.
- La verificación física del QR requiere un dispositivo o aplicación del personal de custodia; el diseño no define ese canal.
- La prevención de colusión interna (personal de custodia y reclamante acordando una entrega fraudulenta) requiere controles procedimentales, no solo técnicos.
- La anonimización y eliminación de datos personales debe cumplir con la normativa de cada país e institución, no cubierta por este diseño técnico.
