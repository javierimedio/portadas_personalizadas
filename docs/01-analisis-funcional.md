# 1. Análisis funcional

## 1.1 Diagnóstico del sistema actual

`index.html` no falla por tener 6.000 líneas; falla porque las decisiones que exige un archivo único sin build ni framework son incompatibles con lo que la herramienta ya necesita gestionar hoy:

| Síntoma actual | Causa raíz | Consecuencia |
|---|---|---|
| Un solo archivo de ~445 KB con HTML+CSS+JS mezclados | Sin build, sin componentes, sin módulos | Cualquier cambio pequeño obliga a leer/tocar un archivo gigante; cero tests posibles |
| Los permisos por rol son `if (rol === 'admin' \|\| rol === 'marketing')` repartidos por el JS | La seguridad vive solo en el cliente | Con la clave pública de Supabase y sin RLS estricta verificada, un usuario podría llamar directo a la REST API saltándose los botones ocultos |
| Roles `comercial_nacional`, `comercial_exportacion`, `comercial`, `responsable_nacional`, `responsable_exportacion`, `responsable` | El canal (nacional/exportación) se codificó dentro del nombre del rol en vez de ser su propio campo | Checks de permisos con cadenas de `\|\|` cada vez más largas; añadir un tercer canal exige tocar cada comprobación |
| Cliente Supabase reimplementado a mano (`QueryBuilder` sobre `fetch`) | No se usa `@supabase/supabase-js` | Se mantiene manualmente algo que la librería oficial ya resuelve (filtros PostgREST, refresh de sesión, manejo de errores) |
| Estado de "notificación leída" en `localStorage` | No hay columna `read_at` en la tabla `notificaciones` | No sincroniza entre dispositivos; se pierde al limpiar el navegador |
| Emails de notificación nunca se envían de verdad | Falta el adaptador de envío (Resend u otro) | El usuario depende de abrir la app para enterarse de cualquier cambio |
| `covers`/`covers_instrucciones` de una campaña son objetos JSON sueltos (`{catKey: url}`) | No hay tabla para esos documentos | No se puede auditar quién subió qué ni cuándo, ni versionar |
| Sesión sin renovación automática visible de `refresh_token` | Lógica de auth manual e incompleta | El usuario puede verse deslogueado sin aviso claro al expirar el JWT |

**Conclusión de diseño**: no se trata de "trocear el HTML en componentes" sin más. Se trata de mover la autoridad de seguridad a PostgreSQL (RLS), separar dominio/aplicación/infraestructura, y sustituir los patrones ad-hoc (localStorage como base de datos, JSON sueltos, cliente REST propio) por las piezas que Supabase ya ofrece para esto.

## 1.2 Filosofía de la migración

- **RLS es la autoridad de seguridad, no un refuerzo.** Todo lo que hoy se decide con `if (rol === ...)` en el JS debe poder repetirse exactamente igual si la consulta llega desde Postman con el JWT de ese usuario.
- **El canal es un dato, no una variante de rol.** `perfiles.canal` (nacional/exportación) es una columna propia; `perfiles.rol` tiene un dominio pequeño y estable (`admin`, `marketing`, `comercial`, `responsable_comercial`, `disenador`, `responsable_diseno`).
- **La solicitud sigue siendo un flujo de estados**, no una fila que se edita libremente: cada transición (`borrador → enviada → en_revision_marketing → en_diseno ⇄ modificar_diseno → diseno_en_revision_comercial → confirmada/archivada`) es una operación de dominio explícita, no un `UPDATE` genérico.
- **Nada que hoy es auditoría vive solo en el cliente.** `logs` pasa a ser append-only de verdad (permisos de `UPDATE`/`DELETE` revocados), y el estado de lectura de notificaciones se traslada a base de datos.
- **La carga masiva de diseños es un caso de uso de primera clase**, no un extra: es como el equipo de diseño trabaja hoy (sube 30 PDFs de golpe, el sistema los empareja por SAP+catálogo) y debe mantenerse igual de rápido tras la migración.
- **Es una migración, no un rediseño de producto.** El objetivo funcional es paridad con lo que ya existe, mejorando la base técnica por debajo — no cambiar cómo trabajan comerciales, diseño o marketing salvo que la propia migración lo requiera (p. ej. notificaciones ahora persistentes).

## 1.3 Actores

| Rol (`perfiles.rol`) | Canal (`perfiles.canal`) | Qué hace |
|---|---|---|
| `admin` | — | Acceso total: solicitudes, campañas, usuarios, diseño, dashboard, panel global. Único junto a `marketing` que crea campañas y usuarios. |
| `marketing` | — | Mismos permisos que `admin` sobre el flujo de solicitudes y campañas. |
| `comercial` | `nacional` \| `exportacion` | Crea/edita sus propias solicitudes, las envía, y en la revisión final confirma, pide modificación o archiva. Solo ve las suyas. |
| `responsable_comercial` | `nacional` \| `exportacion` | Igual que `comercial` pero ve y actúa sobre las solicitudes de todo su canal, no solo las propias. También ve el Dashboard. |
| `disenador` | — | Trabaja la cola de solicitudes en `en_diseno`/`modificar_diseno`, se autoasigna al abrir una sin asignar, sube el diseño terminado, usa la carga masiva. |
| `responsable_diseno` | — | Igual que `disenador` pero ve las tareas de todos los diseñadores, no solo las propias, y accede también al Dashboard. |

Nota de migración: los valores legacy `comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion` (y los genéricos `comercial`/`responsable` sin canal) se normalizan a `rol` + `canal` en la Fase 0 (ver `06-roadmap.md`); el comportamiento visible no cambia.

## 1.4 Módulos funcionales

### 1.4.1 Autenticación

Login por email/contraseña, recuperación de contraseña, e impersonación de rol (solo `admin`, para probar la UI de otros roles sin cerrar sesión). Sustituye el cliente REST manual y el `localStorage` de sesión por `@supabase/supabase-js` + `@supabase/ssr`, con renovación de sesión automática y el JWT como única fuente de identidad — el rol y canal efectivos se siguen resolviendo contra `perfiles` en cada consulta (igual que hoy), nunca desde el JWT, porque cambiar el rol de alguien no debe requerir que esa persona vuelva a loguearse.

### 1.4.2 Campañas

`admin`/`marketing` crean campañas: nombre, descripción, fecha de cierre (bloquea creación/envío de solicitudes tras esa fecha), qué catálogos de los 4 fijos (`roly`, `roly_wrk`, `stamina`, `xmas`) están activos, y suben el PDF de portadas disponibles y el PDF de instrucciones por catálogo. Existe siempre una "campaña activa por defecto" (la activa con fecha de cierre más próxima/reciente).

### 1.4.3 Solicitudes (núcleo del sistema)

Un comercial crea una solicitud para un cliente (código SAP, nombre, idioma, provincia/región) dentro de una campaña, y por cada catálogo activo de esa campaña indica: si quiere digital/impreso, si quiere portada personalizada (y si es así, preferencias de portada, posición del logo, diseño 100% propio, unidades si es impreso, precios si aplica). Puede guardar como borrador o enviarla. `cod_sap` es único por campaña.

### 1.4.4 Flujo de diseño

Cuando una solicitud entra en `en_diseno`, cualquier diseñador puede autoasignársela al abrirla o ser asignada explícitamente. Sube el diseño final (o usa la **carga masiva**: sube muchos archivos a la vez, con convención de nombre `SAP.ext` o `SAP_<catalogo>.ext`, y el sistema los empareja automáticamente con la solicitud y catálogo correctos, marca `portada_elegida` y mueve la solicitud a revisión del cliente).

### 1.4.5 Revisión del cliente

Con el diseño listo (`diseno_en_revision_comercial`), el comercial (o su responsable) confirma el diseño (`confirmada`), pide una modificación concreta (adjuntando comentario y opcionalmente un archivo, vuelve a `modificar_diseno`) o archiva la solicitud (deja de contar en KPIs y exportaciones, pero no se borra).

### 1.4.6 Comentarios y menciones

Cada solicitud tiene un hilo de comentarios (parte del historial en `logs`) con autocompletado de `@menciones` sobre los usuarios activos; mencionar a alguien genera una notificación dirigida a esa persona.

### 1.4.7 Notificaciones

Se generan automáticamente en cada transición de estado relevante, dirigidas al comercial, a marketing/admin o a diseño según corresponda. Pasan de "solo tabla + lectura en localStorage" a persistidas con `read_at` en base de datos y actualización en tiempo real (Supabase Realtime) del contador de no leídas — el envío real por email queda como pregunta abierta (ver `00-resumen-ejecutivo.md`).

### 1.4.8 Dashboard

KPIs (por estado, unidades por catálogo, nacional vs exportación, con/sin precios) y 7 gráficos (estados, top comerciales, unidades por catálogo, portada personalizada vs sin portada, digital vs impreso, top idiomas, unidades por catálogo×idioma), filtrable por campaña y acotado automáticamente al canal si el usuario es `responsable_comercial`. Las solicitudes archivadas se excluyen de los totales, igual que hoy.

### 1.4.9 Panel global y exportación

Vista de todas las solicitudes (para `admin`/`marketing`) con exportación a Excel (`.xlsx`) de la campaña seleccionada, generada a partir de las mismas tablas que el resto de la app.

### 1.4.10 Usuarios

Alta (requiere contraseña inicial, se ejecuta vía Edge Function con la Service Role Key porque el cliente nunca debe tener esa clave), edición de datos, y alta/baja lógica (`activo`) sin borrado.

### 1.4.11 Importación masiva de solicitudes

Carga de un Excel/CSV con solicitudes para crearlas o actualizarlas en bloque, para cuando el volumen de una campaña no es práctico de introducir una a una.

## 1.5 Requisitos no funcionales

- **RLS real desde la primera migración**: toda tabla de dominio queda protegida en PostgreSQL, no solo oculta en la UI — es el cambio central de esta migración.
- **Auditoría append-only**: `logs` (historial de solicitud) revoca `UPDATE`/`DELETE` a nivel de rol de base de datos, igual que ya se comporta hoy de facto pero sin garantía real.
- **Rendimiento del dashboard**: índices alineados con los filtros que ya usa (`campana_id`, `estado`, `comercial_id`, `canal`) para que no se note el salto de "recalcular en el cliente sobre todo lo cargado" a "consulta contra la base de datos".
- **Accesibilidad**: componentes shadcn/ui (WCAG AA de partida) sustituyen al HTML/CSS a mano actual.
- **i18n del dato, no de la interfaz**: los 24 idiomas del formulario de cliente siguen siendo una constante del dominio; la interfaz interna sigue en español únicamente.

## 1.6 Explícitamente fuera de alcance en esta migración

- Multi-tenant / soporte a más de una empresa (ver decisión en `00-resumen-ejecutivo.md`).
- Envío real de email (pregunta abierta, no descartado, pero no forma parte del alcance mínimo).
- Cambiar el modelo de negocio del flujo de aprobación (sigue siendo comercial → marketing → diseño → revisión cliente, sin aprobaciones multinivel nuevas).
- Rediseño visual del producto — el objetivo es paridad funcional con una base técnica sólida, no un nuevo diseño de UI (más allá de lo que shadcn/ui aporta por defecto).
