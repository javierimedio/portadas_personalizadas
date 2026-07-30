# 1. Análisis funcional

> Este documento describe el sistema **tal como funciona hoy**. No propone cambios de comportamiento — donde algo parece mejorable, se anota como referencia a `07-propuestas-futuras.md`, nunca como parte de esta migración (ver principio inamovible en `00-resumen-ejecutivo.md`).

## 1.1 Diagnóstico técnico del sistema actual

Estos son los problemas de **construcción**, no de **funcionalidad**, que motivan la migración. Ninguno de ellos implica que el comportamiento vaya a cambiar — se resuelven por debajo, de forma invisible para quien usa la app.

| Síntoma actual | Causa raíz | Por qué migrar (no por qué cambiar el comportamiento) |
|---|---|---|
| Un solo archivo de ~445 KB con HTML+CSS+JS mezclados | Sin build, sin componentes, sin módulos | Cualquier cambio pequeño obliga a leer/tocar un archivo gigante; cero tests posibles |
| Los permisos por rol son `if (rol === 'admin' \|\| rol === 'marketing')` repartidos por el JS | La seguridad vive solo en el cliente | Con la clave pública de Supabase, si RLS no está activada, una llamada directa a la REST API podría saltarse esos `if` — la migración cierra esto con RLS, sin cambiar qué ve cada rol |
| Cliente Supabase reimplementado a mano (`QueryBuilder` sobre `fetch`) | No se usa `@supabase/supabase-js` | Se mantiene manualmente algo que la librería oficial ya resuelve — cambio interno, cero impacto visible |
| Todo el estado de la UI vive en variables globales del `<script>` | Sin componentización | Imposible testear una parte sin cargar toda la app |

Los siguientes defectos **también existen hoy** pero no son un problema de construcción sino de comportamiento — por el principio inamovible, se documentan y se dejan intactos durante la migración (detalle en `07-propuestas-futuras.md`):

- Roles con el canal incrustado en el nombre (`comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion`).
- Estado de lectura de notificaciones en `localStorage` (no sincroniza entre dispositivos).
- `covers`/`covers_instrucciones` de una campaña como objetos JSON sueltos.
- Notificaciones que nunca se envían por email de verdad, solo quedan en la tabla `notificaciones`.
- Sesión sin renovación automática visible del `refresh_token`.
- URLs de Storage públicas sin política de acceso.

## 1.2 Filosofía de la migración

- **Paridad exacta, no "mientras estamos aquí lo arreglamos".** Si algo se comporta de forma rara o subóptima hoy, se comporta igual de raro en el sistema nuevo, salvo que sea técnicamente imposible de replicar en Next.js — y en ese caso se documenta la excepción explícitamente, no se decide en silencio.
- **RLS es la única pieza de comportamiento interno que sí cambia**, y es intencionadamente invisible: implementa en PostgreSQL exactamente la misma regla que hoy decide qué botón/fila se muestra en el JS. Ningún usuario legítimo nota diferencia; lo que deja de ser posible es saltarse esa regla llamando directamente a la API.
- **La separación en capas (dominio/aplicación/infraestructura/UI) es un cambio de organización del código, no de comportamiento.** `missingFields()`, `catSummary()`, `parseCargaFilename()` y el resto de reglas se trasladan literalmente, no se "mejoran" de paso.
- **Migración estrictamente por módulos** (ver `06-roadmap.md`), de forma que en todo momento hay una aplicación 100% funcional, ya sea `index.html`, el sistema nuevo, o ambos conviviendo sobre la misma base de datos.
- **El esquema de base de datos no se toca salvo que sea imprescindible.** Añadir políticas RLS no requiere cambiar columnas ni tipos; se escriben contra el esquema exactamente como existe hoy (roles como texto libre incluido). Ver `03-modelo-datos.md`.

## 1.3 Actores (tal como existen hoy, sin normalizar)

| Rol (`perfiles.rol`, texto libre) | Descripción |
|---|---|
| `admin` | Acceso total: solicitudes, campañas, usuarios, diseño, dashboard, panel global. |
| `marketing` | Mismos permisos que `admin` sobre el flujo de solicitudes y campañas. |
| `comercial_nacional` / `comercial_exportacion` / `comercial` (genérico legacy) | Crea/edita sus propias solicitudes, las envía, y en la revisión final confirma, pide modificación o archiva. Solo ve las suyas. El canal (nacional/exportación) está en el propio nombre del rol, no en un campo separado. |
| `responsable_nacional` / `responsable_exportacion` / `responsable` (genérico legacy) | Igual que el comercial de su canal, pero ve y actúa sobre las solicitudes de todo ese canal. También ve el Dashboard. |
| `disenador` | Trabaja la cola de solicitudes en `en_diseno`/`modificar_diseno`, se autoasigna al abrir una sin asignar, sube el diseño terminado, usa la carga masiva. |
| `responsable_diseno` | Igual que `disenador` pero ve las tareas de todos los diseñadores, no solo las propias, y accede también al Dashboard. |

Estas seis variantes de rol (y sus combinaciones legacy) **se mantienen literalmente** durante la migración. La propuesta de separar el canal en su propia columna está documentada en `07-propuestas-futuras.md` § 1, no forma parte de este proyecto.

## 1.4 Módulos funcionales (comportamiento a replicar exactamente)

### 1.4.1 Autenticación

Login por email/contraseña, recuperación de contraseña, e impersonación de rol (solo `admin`). Internamente se sustituye el cliente REST manual y el `localStorage` de sesión por `@supabase/supabase-js` + `@supabase/ssr` — cambio de implementación, no de comportamiento: mismas pantallas, mismos mensajes de error, misma ausencia de renovación automática de sesión que hoy (documentada como propuesta futura, no corregida aquí).

### 1.4.2 Campañas

`admin`/`marketing` crean campañas: nombre, descripción, fecha de cierre, qué catálogos de los 4 fijos (`roly`, `roly_wrk`, `stamina`, `xmas`) están activos, y suben el PDF de portadas disponibles y el PDF de instrucciones por catálogo — seguirán guardándose como hoy (objeto `covers`/`covers_instrucciones`), sin tabla nueva.

### 1.4.3 Solicitudes (núcleo del sistema)

Un comercial crea una solicitud para un cliente (código SAP, nombre, idioma, provincia/región) dentro de una campaña, y por cada catálogo activo indica digital/impreso, portada personalizada, preferencias de portada, posición del logo, diseño propio, unidades y precios según las mismas reglas condicionales de hoy. Guarda como borrador o envía. `cod_sap` sigue siendo único por campaña.

### 1.4.4 Flujo de diseño

Autoasignación al abrir una solicitud sin asignar, subida de diseño final, y **carga masiva**: subir muchos archivos con la convención de nombre `SAP.ext` / `SAP_<catalogo>.ext`, emparejamiento automático, y avance de estado — exactamente igual que hoy.

### 1.4.5 Revisión del cliente

Confirmar (`confirmada`), pedir modificación (`modificar_diseno`, con comentario y adjunto opcional) o archivar (`archivada`, terminal, excluida de KPIs) — mismas transiciones, mismos roles habilitados.

### 1.4.6 Comentarios y menciones

Hilo de comentarios por solicitud (parte de `logs`) con autocompletado de `@menciones` sobre usuarios activos; mencionar genera una notificación.

### 1.4.7 Notificaciones

Se generan igual que hoy en cada transición relevante. El estado de "leída" **se mantiene en `localStorage`**, no se traslada a base de datos en esta migración (ver `07-propuestas-futuras.md` § 2). El envío real por email sigue sin existir (§ 4 de propuestas futuras).

### 1.4.8 Dashboard

Los mismos KPIs y los mismos 7 gráficos (estados, top comerciales, unidades por catálogo, portada personalizada vs sin portada, digital vs impreso, top idiomas, unidades por catálogo×idioma), con el mismo filtrado por campaña y por canal.

### 1.4.9 Panel global y exportación

Vista de todas las solicitudes (`admin`/`marketing`) con exportación a `.xlsx` de la campaña seleccionada, generado igual que hoy.

### 1.4.10 Usuarios

Alta vía Edge Function `create-user` (se conserva tal cual), edición, alta/baja lógica sin borrado.

### 1.4.11 Importación masiva de solicitudes

Carga de Excel/CSV para crear/actualizar solicitudes en bloque, mismo formato de entrada que hoy.

## 1.5 Requisitos no funcionales de esta migración

- **RLS activada sin cambiar visibilidad**: cada política replica exactamente la condición que hoy decide qué ve cada rol en el JS — se verifica comparando ambos comportamientos, no diseñando reglas "mejores".
- **Sin migración de datos**: las filas existentes en `perfiles`, `solicitudes`, `campanas`, etc. no se transforman; el esquema se lee y escribe igual que hoy salvo lo estrictamente necesario (documentado caso por caso en `03-modelo-datos.md`).
- **Tests como red de seguridad de la migración**, no como excusa para "mientras testeamos, arreglamos": los tests verifican que el comportamiento migrado coincide con el actual.
- **Accesibilidad de shadcn/ui** se adopta porque viene de fábrica con los componentes, no porque se busque activamente mejorar accesibilidad como objetivo de esta fase.

## 1.6 Explícitamente fuera de alcance en esta migración

- Cualquier cambio de comportamiento, por pequeño que sea — todo lo detectado como mejora se traslada a `07-propuestas-futuras.md`.
- Normalización de roles/canal, persistencia de lectura de notificaciones, envío real de email, cambios de acceso a Storage, tabla dedicada para documentos de campaña — todos ellos en `07-propuestas-futuras.md`.
- Multi-tenant / soporte a más de una empresa.
- Rediseño visual — se adoptan los componentes shadcn/ui con su apariencia por defecto, sin buscar deliberadamente un aspecto distinto al actual más allá de lo inevitable al cambiar de tecnología de UI.
