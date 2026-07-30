# 7. Propuestas futuras (explícitamente fuera de esta migración)

Todo lo listado aquí se identificó durante el diseño de la migración a Next.js, pero por el principio inamovible de `00-resumen-ejecutivo.md` (100% de paridad funcional, sin mejoras de paso) **no se implementa** como parte de este proyecto. Se documenta para que quien decida abordarlas más adelante no tenga que redescubrirlas.

## 1. Normalizar roles: separar el canal del nombre del rol

Hoy `perfiles.rol` mezcla el rol y el canal en el mismo valor (`comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion`, más los genéricos legacy `comercial`/`responsable`). Separar esto en `rol` + `canal` (dos columnas) simplificaría las políticas RLS y cualquier comprobación de permisos futura, y eliminaría los valores legacy ambiguos. Requiere una migración de datos (mapear los 6 valores actuales a las nuevas columnas) y tocar cada policy/consulta que hoy compara contra el string completo.

## 2. Persistir el estado de lectura de notificaciones en base de datos

Hoy vive en `localStorage` (`portadas_notifs_read`), por lo que no sincroniza entre dispositivos ni navegadores y se pierde al limpiar el caché. Añadir `read_at timestamptz` a `notificaciones` y una policy de `update` acotada a esa columna resolvería esto. Es un cambio de comportamiento visible (mejora real, no solo interna) y por tanto no entra en una migración de "solo arquitectura".

## 3. Tabla dedicada para documentos de campaña

`campanas.covers` y `campanas.covers_instrucciones` son objetos JSON (`{catalogo_key: url}`). Una tabla `campana_documentos` (campana_id, catalogo, tipo, storage_path, subido_por, created_at) permitiría auditar quién subió qué y cuándo, y versionar si se sube un PDF nuevo. No es necesaria para que Next.js lea/escriba lo mismo que hoy.

## 4. Envío real de email para notificaciones

La tabla `notificaciones` se rellena pero nunca se envía un correo real — está literalmente comentado en el código actual ("para envío real, configurar Edge Function con Resend"). Añadir esto es una funcionalidad nueva, no una migración de arquitectura, aunque sea una carencia evidente.

## 5. Renovación automática de sesión

Hoy no hay lógica visible de renovación automática del `refresh_token` al expirar el `access_token`; el usuario puede verse deslogueado sin aviso claro. `@supabase/ssr` resuelve esto de fábrica si se activa — pero activarlo cambia el comportamiento actual (sesión que hoy caduca dejaría de caducar), así que se documenta aquí en vez de "arreglarse de paso" durante la migración del módulo de autenticación.

## 6. Storage con acceso controlado (URLs firmadas) en vez de URLs públicas

Hoy cualquiera con la URL de un archivo del bucket `portadas-adjuntos` puede acceder a él, sin comprobar si tiene relación con esa solicitud. Pasar a URLs firmadas por solicitud sería una mejora de seguridad real, pero:
- Cambiaría el comportamiento de cualquier enlace ya compartido fuera de la app (por ejemplo, un PDF de portada enviado por email a alguien externo dejaría de abrir).
- No es necesario para que RLS en las tablas de PostgreSQL funcione — son sistemas de permisos independientes.

Se deja fuera de esta migración; ver pregunta abierta 2 de `00-resumen-ejecutivo.md`, donde se pide confirmación explícita de que esta brecha conocida se mantiene igual durante la migración.

## 7. FK real de `notificaciones.destinatario`

Hoy es un email en texto libre; una FK a `perfiles(id)` sería más correcta relacionalmente y evitaría inconsistencias si un email cambia. No es necesaria para que RLS funcione (se puede resolver contra `perfiles.email` en la policy).

## 8. Endurecer `logs` como append-only real

`REVOKE UPDATE, DELETE ON logs FROM authenticated` no cambiaría ningún comportamiento visible (hoy nadie edita logs desde la UI), pero tampoco es estrictamente necesario para la migración — se deja documentado como mejora de seguridad de bajo riesgo para cuando se revise el modelo de datos con más calma, en vez de colarla dentro del alcance de "solo arquitectura".

---

Ninguna de estas propuestas se implementa sin que el usuario las apruebe explícitamente como un proyecto aparte, tras completar esta migración.
