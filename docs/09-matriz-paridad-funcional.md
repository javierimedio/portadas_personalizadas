# 9. Matriz de paridad funcional

Inventario completo de las funcionalidades existentes en `index.html`, incluidas las poco usadas y los casos límite. No es un roadmap — es la herramienta de seguimiento que garantiza que ninguna se pierde durante la migración. Se revisa y actualiza junto con el checklist de cada fase (`08-protocolo-validacion.md`); antes del cutover, todas las filas deben estar en `Validada`.

## Cómo se usa

- Cada fila tiene un ID único (`<MÓDULO>-NN`) para poder referenciarla desde un checklist o una PR.
- **Estado** tiene 5 valores posibles: `Pendiente` (no empezada), `Implementada` (código migrado, aún sin verificar por comparación), `Validada` (comparada 1:1 contra `index.html` según `08-protocolo-validacion.md` y sin diferencias bloqueantes), `Regresión detectada` (se comportó distinto de forma que pierde funcionalidad — bloquea el checklist de la fase hasta corregirse y volver a `Validada`), `No aplicable` (la funcionalidad original era un artefacto de la arquitectura anterior sin equivalente posible ni necesario en la nueva — motivo documentado en Observaciones; no bloquea el checklist de su fase, pero exige la misma aprobación explícita del motivo que cualquier otra fila antes de cerrarla).
- **Fase** referencia las fases de `06-roadmap.md`.
- Al terminar cada fase, se actualiza el estado de todas las filas de esa fase antes de generar su checklist — el checklist no puede aprobarse con filas de su fase todavía en `Pendiente` o `Regresión detectada`.
- Todas las filas empiezan en `Pendiente` porque el desarrollo aún no ha comenzado (Fase 0 sin construir).

## Resumen por fase

| Fase | Módulos | Nº de funcionalidades |
|---|---|---|
| 1 | Autenticación y sesión, Layout y navegación (parte), Dashboard, Perfil de usuario, UI transversal (base) | 61 |
| 2 | Solicitudes (datos generales, catálogos, flujo de estados), Diseño, Carga masiva de diseños, Comentarios y menciones, Notificaciones (parte), UI transversal (realtime/drag&drop de este módulo) | 117 |
| 3 | Campañas | 15 |
| 4 | Usuarios (incluida la importación masiva) | 15 |
| 5 | Panel global y exportación, más 1 ítem de navegación (acceso al Panel) | 16 |
| 5.5 | Validación documental (no añade funcionalidades nuevas — valida con datos reales las de subida/descarga ya migradas en Fases 2 y 3) | — |
| — | Filas con fase mixta (NAV-06, NAV-09, NAV-13, NOT-11, UI-01, UI-03, UI-04, UI-07) | 8 |
| **Total** | | **~230** |

*(Contados fila a fila al redactar este documento; se recuentan de verdad cada vez que se añada o cierre una fila — es un recuento vivo, no una cifra fija.)*

---

## Autenticación y sesión — Fase 1

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| AUT-01 | Login con email/contraseña | Validada | 1 | Valida que ambos campos no estén vacíos antes de llamar a Supabase (`doLogin`, ~1714) — `login.action.ts` |
| AUT-02 | Mensaje de error de login genérico | Validada | 1 | Cualquier error de Supabase se traduce siempre a "Correo o contraseña incorrectos", sin exponer el mensaje real del backend — preservar, no "mejorar" el mensaje |
| AUT-03 | Botón de login con spinner inline | Validada | 1 | Sustituye el texto "Entrar" por "Entrando…" mientras la petición está en curso (`useActionState`, sin spinner gráfico — mismo propósito funcional, distinto detalle visual) |
| AUT-04 | Logout con restauración de impersonación | Validada | 1 | `logout.action.ts` borra la cookie de impersonación (`IMPERSONATION_COOKIE`) además de cerrar la sesión real — completado en el bloque de Layout, ver UI-11 |
| AUT-05 | Mostrar formulario de recuperación de contraseña | Validada | 1 | Enlace "¿Olvidaste tu contraseña?" revela un formulario oculto por defecto |
| AUT-06 | Solicitar enlace de recuperación (anti-enumeración) | Validada | 1 | Responde siempre "Si el correo existe, recibirás un enlace..." exista o no el email — preservar este comportamiento de seguridad |
| AUT-07 | Flujo de recuperación vía deep-link (`#access_token=...&type=recovery`) | Validada | 1 | Next.js usa el patrón PKCE recomendado por `@supabase/ssr` (`?code=...` + `/auth/confirm`) en vez del hash `#access_token=...` original — cambio de implementación, no de comportamiento observable: misma pantalla dedicada de "Nueva contraseña", mismo mensaje de token inválido |
| AUT-08 | Validación de nueva contraseña en recuperación | Validada | 1 | Mínimo 8 caracteres y ambos campos deben coincidir, con mensajes específicos por caso |
| AUT-09 | Redirección temporizada tras recuperación exitosa | Validada | 1 | A los 2s redirige a `/login` tras el éxito |
| AUT-10 | Persistencia de sesión en localStorage | Validada | 1 | Sustituida por cookies de `@supabase/ssr` gestionadas por el middleware — resultado observable equivalente (sesión persiste tras recargar) |
| AUT-11 | Verificación de validez de token al arrancar | Validada | 1 | `supabase.auth.getUser()` en el middleware revalida el token contra Supabase en cada petición |
| AUT-12 | Fallback a clave pública si no hay sesión | No aplicable | 1 | El mecanismo original (cliente REST manual que cae a la clave `anon` sin sesión) no tiene equivalente aquí: el servidor nunca hace peticiones a Supabase "sin usuario" de la forma en que lo hacía ese cliente. El resultado observable (acceso denegado sin sesión) está garantizado por dos capas independientes: RLS (Fase 0) y el middleware, que redirige a `/login` antes de que cualquier página autenticada llegue a ejecutarse |
| AUT-13 | Pantalla de carga con mensajes de progreso | No aplicable | 1 | Aprobado por el usuario (2026-08-03): en el SPA original, "Verificando sesión..."/"Cargando perfil..." cubren el hueco entre pintar la página vacía y que el cliente resuelva la sesión de forma asíncrona. En SSR ese hueco no existe — el servidor ya resuelve la sesión y el perfil antes de generar la respuesta, así que no hay ningún estado intermedio que el usuario pueda llegar a ver. No es una funcionalidad perdida, es un paso de la arquitectura anterior sin momento equivalente en la nueva |
| AUT-14 | Fallo silencioso de `initApp` tras login | No aplicable | 1 | **Decisión del usuario (2026-08-03)**: en SSR, si un Server Component falla al cargar datos tras el login, Next.js muestra por defecto una página de error — no hay un hueco equivalente donde el fallo pueda quedar en silencio como en el SPA original. Replicar el silencio exigiría ocultar activamente ese error, algo que no se ha pedido. No es una mejora elegida, es que la arquitectura nueva no reproduce el mecanismo donde vivía el bug |
| AUT-15 | Preferencia de notificación en topbar sincronizada con Perfil | Validada | 1 | La preferencia se guarda desde Perfil (`PERF-11`); el selector del topbar (`#notif-pref`) del original está oculto permanentemente (mismo patrón inerte que NAV-16), así que no hay nada visible en la topbar con lo que sincronizar en esta migración. El valor sigue sin filtrar ningún envío real (ver NOT-12), igual que hoy |

## Layout y navegación — Fase 1

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| NAV-01 | Nav construido dinámicamente según rol | Validada | 1 | `getNavItemsForRole()` réplica de `buildNav`; "Perfil" no está en el nav, solo en el header. Incluye a propósito el hueco de H-07 (roles legacy genéricos) |
| NAV-02 | Acceso a Dashboard: admin, marketing, responsable_nacional, responsable_exportacion | Validada | 1 | Cubierto por `getNavItemsForRole()`, con test unitario (`tests/unit/nav-items.test.ts`) |
| NAV-03 | Acceso a Solicitudes: admin, marketing, comerciales y responsables | Validada | 2 | `requireRouteAccess()` bloquea `/solicitudes` a cualquier otro rol (redirige a `/`), no solo lo oculta del nav — necesario porque en Next.js la ruta es directamente navegable, a diferencia del SPA original sin URLs propias. Contenido real pendiente de la Fase 2 |
| NAV-04 | Acceso a Panel global: solo admin/marketing | Validada | 5 | Mismo guard de servidor sobre `/panel`. Contenido real pendiente de la Fase 5 |
| NAV-05 | Acceso a Diseño: admin, marketing, disenador, responsable_diseno | Validada | 2 | Mismo guard de servidor sobre `/diseno`. Contenido real pendiente de la Fase 2 |
| NAV-06 | Acceso a Campañas/Usuarios: solo admin/marketing | Validada | 3/4 | Mismo guard de servidor sobre `/campanas` y `/usuarios`. Contenido real pendiente de sus fases |
| NAV-07 | Activación automática de la primera pestaña visible | Validada | 1 | `/` redirige al primer item visible para ese rol (equivalente por rutas reales, en vez de `showPage` sobre un DOM ya cargado) |
| NAV-08 | Cambio de página sin recarga (`showPage`) | Validada | 1 | Sustituido por navegación de cliente de `next/link` + estado activo vía `usePathname()` — mismo resultado observable |
| NAV-09 | Efectos secundarios al entrar en una página | Pendiente | 2/3/1 | Depende del contenido real de cada página (campañas, dashboard, perfil), todavía placeholders |
| NAV-10 | Nav móvil tipo drawer con hamburguesa | Validada | 1 | Bloquea scroll del body (`document.body.style.overflow`), muestra backdrop |
| NAV-11 | Cierre automático del drawer al pulsar un botón de nav (≤480px) | Validada | 1 | En la réplica se cierra en cualquier ancho móvil (breakpoint único `md`, sin distinguir 480px de 768px como el original) — mismo resultado observable, breakpoint simplificado |
| NAV-12 | Cierre automático del drawer al redimensionar a escritorio | Validada | 1 | Resuelto por CSS (`md:translate-x-0`) en vez de un listener de `resize` — el drawer no puede quedar visible en escritorio independientemente del estado de React, mismo resultado observable con una implementación más simple |
| NAV-13 | Cierre de modales predefinidos con Escape | Pendiente | 2/3/4 | Sin relación con Layout/nav pese a estar en esta sección — pertenece a los modales de Solicitudes/Usuarios/Campañas, que se construyen en esas fases |
| NAV-14 | Logos de marca en topbar | Validada | 1 | Roly, Roly WRK, Stamina y `Logo_GOR.png` (el mismo nombre de archivo que usaba `index.html` desde `dev.gorfactory.com`) servidos ahora desde `webapp/public/images/` en vez de por URL externa — ocultos en móvil (`hidden md:flex`) igual que el original oculta elementos no esenciales de la topbar en `@media (max-width: 768px)` |
| NAV-15 | Botón "Mi cuenta" en topbar | Validada | 1 | Navega a `/perfil` (placeholder hasta su propio bloque) |
| NAV-16 | Badge de rol en topbar | No aplicable | 1 | **Corrección de este documento**: verificado en `index.html` (~564) que `#role-tag` tiene `style="display:none"` inline y ningún punto del código (~1891, ~5116) vuelve a mostrarlo — solo actualizan su `textContent`. La observación anterior ("mostrado tras `initApp`") era incorrecta: el badge está oculto permanentemente en la producción real de hoy, no hay ningún comportamiento visible que preservar |

## Dashboard — Fase 1

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| DASH-01 | Selector de campaña propio del dashboard | Validada | 1 | `CampanaSelector` navega a `/dashboard?campana=...` en vez de repintar in-place; mismo resultado observable, con URL propia por campaña |
| DASH-02 | Filtrado por canal para responsable_nacional/exportacion | Validada | 1 | `filterByResponsableCanal()`, con test unitario (`tests/unit/dashboard-stats.test.ts`) |
| DASH-03 | Etiqueta de campaña con contador de archivadas | Validada | 1 | `computeKpis().campanaLabel` |
| DASH-04 | KPIs de estado (8 tarjetas) | Validada | 1 | `computeKpis().estado` |
| DASH-05 | KPIs de unidades (total/nacional/exportación) | Validada | 1 | `computeKpis().unidades` |
| DASH-06 | KPIs de precios (solo Español, Stamina/XMAS) | Validada | 1 | `computeKpis().precios` |
| DASH-07 | Gráfico doughnut de estados | Validada | 1 | `EstadoChart` (Chart.js vía hook `useChart`, sin dependencia adicional) |
| DASH-08 | Gráfico "Top 10 comerciales" | Validada | 1 | `HorizontalBarChart`, compartido con DASH-12 (en el original están duplicados) |
| DASH-09 | Gráfico "Unidades por catálogo" | Validada | 1 | `UnidadesCatalogoChart` |
| DASH-10 | Gráfico "Portada personalizada por catálogo" | Validada | 1 | `PortadasChart`; test unitario cubre la distinción `!== null` (¿tocó el catálogo?) vs `=== true` (¿tiene portada?) |
| DASH-11 | Gráfico "Digital vs Impreso" por catálogo | Validada | 1 | `TipoChart`; test unitario cubre que aquí sí es un chequeo de verdad (`true`), no de "no nulo" — distinto de DASH-10 |
| DASH-12 | Gráfico "Solicitudes por idioma" (Top 10) | Validada | 1 | `HorizontalBarChart`, ver DASH-08 |
| DASH-13 | Gráfico "Unidades por catálogo/idioma" | Validada | 1 | `UnidadesIdiomaChart`; test unitario cubre que reutiliza el mismo top-10 de idiomas de DASH-12, no uno propio por unidades |
| DASH-14 | Barra de progreso de campaña (7 pasos) | Validada | 1 | `Progreso`, oculta si `total`=0 |
| DASH-15 | Destrucción de gráficos antes de repintar | Validada | 1 | Cleanup del `useEffect` de `useChart` por cada gráfico, en vez de un objeto global `dashCharts` — mismo resultado (nunca hay dos instancias de Chart.js vivas sobre el mismo canvas), sin estado global |

## Solicitudes — datos generales — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| SOL-01 | Código SAP obligatorio, normalizado a mayúsculas | Implementada | 2 | Bloque 1 |
| SOL-02 | Nombre de empresa normalizado a mayúsculas | Implementada | 2 | Bloque 1 |
| SOL-03 | Idioma obligatorio (24 opciones fijas) | Implementada | 2 | Español + 23 idiomas europeos. Bloque 1 |
| SOL-04 | Provincia condicional al idioma | Implementada | 2 | Select de 52 provincias/países si idioma=Español (obligatorio); texto libre y opcional para el resto. Corregido (H-08): al reeditar, la provincia guardada en mayúsculas se busca sin distinguir mayúsculas/minúsculas para preseleccionar la opción correcta |
| SOL-05 | Normalización de idioma capitalizado al reeditar | Implementada | 2 | Bloque 1 (`capitalizeIdioma()`) |
| SOL-06 | Comentarios generales opcionales | Implementada | 2 | Bloque 1 |
| SOL-07 | Selector de campaña en el formulario (solo activas o la propia si está cerrada) | Implementada | 2 | Marca "(cerrada)" si aplica. Bloque 1 |
| SOL-08 | Recalculo de catálogos al cambiar de campaña en el formulario | Implementada | 2 | **Caso límite** replicado tal cual: pierde datos no guardados de catálogos ya rellenados si se cambia de campaña a mitad de formulario. Bloque 1 |
| SOL-09 | Bloqueo de creación en campaña cerrada | Implementada | 2 | `handleNueva()` en `mis-solicitudes.tsx` — toast + redirección a Campañas, igual que `checkCampanaAndOpen()`; la comprobación real en el guardado (SOL-10) sigue siendo la que de verdad lo impide |
| SOL-10 | Revalidación de cierre de campaña al guardar | Implementada | 2 | Doble check por si la campaña cerró entre apertura del formulario y el guardado. Bloque 1 |
| SOL-11 | Detección de código SAP duplicado en la misma campaña | Implementada | 2 | Solo al crear, no al editar. Corregido (H-09): la comparación normaliza a mayúsculas en ambos lados, ya no depende de cómo se haya escrito el código |
| SOL-12 | Campo canal+comercial asignado solo visible para admin/marketing | Implementada | 2 | Para el resto de roles, `comercial_id` se autoasigna al usuario actual. Bloque 1 |
| SOL-13 | Cascada canal → lista de comerciales asignables | Implementada | 2 | Filtra por rol de canal, solo activos, orden alfabético. Bloque 1 |
| SOL-14 | Mensaje de error acumulado truncado a 3 + "N más" | Implementada | 2 | Bloque 1 |
| SOL-15 | Guardar como borrador vs enviada con validaciones distintas | Implementada | 2 | Un borrador puede guardarse vacío; enviar exige validación completa de catálogos. Bloque 1 (validación mínima digital/impreso/unidades — la sección rica de catálogos es Bloque 2) |
| SOL-16 | `enviada_at` se fija solo al pasar a "enviada" | Implementada | 2 | Bloque 1 |
| SOL-17 | Toast final distinto según destino (enviada/borrador) | Implementada | 2 | Bloque 2: ya incluye el conteo de archivos adjuntados en el caso de envío |
| SOL-18 | Indicador visual de progreso de subida de adjuntos | Implementada | 2 | Texto "⏳ Subiendo archivos..." junto a los botones, visible solo cuando `pending` y hay archivos seleccionados (logo o diseño propio) — igual que el original, que solo lo muestra `if (allFilesToUpload.length > 0)` |
| SOL-19 | Log de creación/edición con detalle de estado y SAP | Implementada | 2 | Bloque 1 |
| SOL-20 | Log por cada adjunto subido | Implementada | 2 | Bloque 2 |
| SOL-21 | Notificación automática al guardar (si no es borrador) | Implementada | 2 | `enviarNotificacion()` desde `saveSolicitud()` cuando `intent === "enviada"` |
| SOL-22 | Fallo de subida de un archivo no aborta el resto | Implementada | 2 | Bloque 2. Sin el toast individual por archivo fallido del original (~3016) — el fallo simplemente se omite en silencio |
| SOL-23 | Badge de campaña distinta en tabla comercial | Implementada | 2 | Si la solicitud no pertenece a la campaña activa seleccionada. Bloque 1 |
| SOL-24 | Resumen compacto de catálogo en tablas (`catSummary`) | Implementada | 2 | "—" / "No" / "{unidades} uds" + chip de portada. Bloque 1 |
| SOL-25 | Cálculo de campos incompletos (`missingFields`) | Pendiente | 5 | Corrección de fase: es la columna "Campos incompletos" de `#page-panel` (Panel Global), no de "Mis solicitudes" ni del formulario — pertenece a la Fase 5 (`06-roadmap.md`), estaba mal etiquetada como Fase 2 |

## Solicitudes — catálogos — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CAT-01 | Catálogos disponibles dependen de la campaña | Implementada | 2 | `ALL_CATALOGOS` filtrado por el array `catalogos` de cada campaña (`catalogosDeCampana`) |
| CAT-02 | Solo Stamina y XMAS tienen "Diseño 100% propio" | Implementada | 2 | Roly y Roly WRK no la tienen |
| CAT-03 | Toggle maestro "Portada personalizada" con cascada de visibilidad | Implementada | 2 | Réplica exacta, incluido que ocultar no limpia los valores ya introducidos (~2578-2604, quedan en el estado de React aunque no se muestren, igual que en el DOM original) |
| CAT-04 | Toggle "Catálogo impreso" revela campo Unidades obligatorio | Implementada | 2 | `min=1` |
| CAT-05 | Fila "Con precios" solo visible si idioma=Español y catálogo tiene diseño propio | Implementada | 2 | Oculta para Roly/Roly WRK y para cualquier idioma no español |
| CAT-06 | Toggle "Diseño 100% propio" oculta preferencias y posición de logo | Implementada | 2 | Corregido (H-10): independiente por catálogo, ya no solo Stamina |
| CAT-07 | Enlaces "Ver portadas disponibles"/"Ver instrucciones" por catálogo | Implementada | 2 | Corregido (H-11): usan la campaña seleccionada en el formulario. "Ver instrucciones" además depende del idioma elegido (cambio funcional solicitado) |
| CAT-08 | Expandir/contraer secciones de catálogo (solo en memoria) | Implementada | 2 | Contraídas por defecto al crear, expandidas al editar |
| CAT-09 | Radios custom (no `<input type=radio>` real) | Implementada | 2 | Migrado a `<input type=radio>` real y accesible — decisión ya sancionada, comportamiento observable idéntico |
| CAT-10 | 3 preferencias de portada por catálogo (1ª obligatoria) | Implementada | 2 | — |
| CAT-11 | Posición de logo (A/B/C), obligatoria si aplica | Implementada | 2 | — |
| CAT-12 | Zona de subida de diseño propio (`.pdf,.ai,.eps`) | Implementada | 2 | Corregido (H-10): funcional para Stamina y XMAS, no solo Stamina |
| CAT-13 | Reset completo de secciones al abrir "nueva solicitud" | Implementada | 2 | — |
| CAT-14 | Restauración completa de catálogos al editar | Implementada | 2 | Expande automáticamente las secciones con datos |
| CAT-15 | Guardado usa catálogos de la campaña del formulario, no la global activa | Implementada | 2 | Evita guardar catálogos de otra campaña |
| CAT-16 | `portada_diseno_propio` siempre `false`, nunca `null` | Implementada | 2 | A diferencia del resto de booleanos del catálogo |
| CAT-17 | Selección de portada final ("Portada elegida") inline | Implementada | 2 | `guardarPortadaElegida()`, en el modal de detalle — `mostrarSelector`/`puedeElegirPortadaFinal()` |
| CAT-18 | Auto-adjudicación de portadas (`autoAdjudicar`) | Pendiente | 5 | Corrección de fase: vive en `renderMktTable()` de `#page-panel` (Panel Global), no en el detalle de una solicitud — pertenece a la Fase 5. Solo marketing/admin; ordena por antigüedad, asigna 1ª opción libre evitando repetir en la misma provincia; **excluye XMAS del reparto automático** — preservar esta exclusión; usa `confirm()`/`alert()` nativos del navegador |
| CAT-19 | Auto-asignación de diseñador al abrir el detalle | Implementada | 2 | `getSolicitudDetalle()` — si está en `en_diseno` sin `asignado_id` y quien abre es diseñador/responsable_diseno |

## Solicitudes — flujo de estados — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| EST-01 | Máquina de estados completa | Implementada | 2 | `borrador → enviada → en_revision_marketing → en_diseno ⇄ modificar_diseno → diseno_en_revision_comercial → confirmada`, + `archivada` lateral. Bloque 3 (`features/solicitudes/domain/estado-flujo.ts`, con test unitario de todas las combinaciones rol×estado) — sin el envío de notificación en cada transición, ver EST-05/EST-10 y el módulo de Notificaciones (NOT-*), todavía no migrado |
| EST-02 | Botones de acción condicionados por rol+estado en el detalle | Implementada | 2 | `accionesDetalle()`, con test unitario de cada combinación |
| EST-03 | Guard anti doble-clic en cambio de estado | Implementada | 2 | Adaptado: en vez de un flag en memoria del cliente, la Server Action comprueba el estado real en BD antes de escribir (no-op si ya coincide) y la UI desactiva los botones mientras la petición está en curso |
| EST-04 | No-op si el estado destino es idéntico al actual | Implementada | 2 | — |
| EST-05 | Cambio de estado dispara update + log + recarga + toast, siempre junto | Implementada | 2 | Incluida la notificación — `cambiarEstado()` es el único punto por el que pasan todas las transiciones genéricas, así que la dispara una sola vez para todas ellas |
| EST-06 | Confirmación nativa antes de archivar, con aviso de exclusión de KPIs/Excel | Implementada | 2 | `window.confirm` con el mismo texto |
| EST-07 | Eliminación de solicitud en cascada manual (catálogos, adjuntos, logs, notificaciones, solicitud) | Implementada | 2 | Con `confirm()` mostrando el código SAP |
| EST-08 | "Enviar a diseño" sin asignar diseñador | Implementada | 2 | El primer diseñador que abre el detalle se autoasigna (`getSolicitudDetalle`) |
| EST-09 | Selector de asignación de diseñador | Implementada | 2 | Adaptado: panel desplegable dentro del propio modal de detalle en vez de un overlay flotante independiente — mismo contenido y misma restricción (solo diseñadores/responsables activos, preselecciona el ya asignado) |
| EST-10 | Notificación al diseñador tras asignación manual | Implementada | 2 | `enviarNotificacionAsignacion()`, llamada desde `asignarDisenadorYEnviar()` |
| EST-11 | Selector "Asignar canal y comercial" | Implementada | 2 | Adaptado: panel desplegable en vez de overlay flotante. Bloquea guardado si falta canal o comercial |
| EST-12 | Reapertura automática del detalle tras guardar canal | Implementada | 2 | El modal de detalle se recarga en el sitio, sin cerrarse |
| EST-13 | Panel "Solicitar modificación" con comentario obligatorio y adjunto opcional | Implementada | 2 | Adaptado: panel desplegable en vez de modal aparte |
| EST-14 | Comentario de modificación concatenado con enlace al adjunto | Implementada | 2 | Formato `📎 Adjunto: [nombre](url)` dentro del mismo log |
| EST-15 | Historial colapsable con contador dinámico | Implementada | 2 | "Ver historial (N)" |
| EST-16 | Entradas de log diferenciadas visualmente por tipo | Implementada | 2 | `cambio_estado` con badges de estado, `comentario` con menciones resaltadas (sin `dangerouslySetInnerHTML`: `segmentarComentario()` devuelve segmentos, con test unitario) |
| EST-17 | Logs de tipo `adjunto` excluidos de comentarios e historial visual | Implementada | 2 | Se muestran aparte como archivos |

## Diseño (cola de trabajo) — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| DIS-01 | Tabla de diseño filtrada siempre por `en_diseno`/`modificar_diseno` | Implementada | 2 | Independiente del rol — `filterDisenoTareas()` |
| DIS-02 | Selector de campaña propio de la pestaña Diseño | Implementada | 2 | Estado propio del componente, no comparte el de Mis solicitudes, igual que en el original |
| DIS-03 | Filtro por diseñador asignado | Implementada | 2 | Visible para admin/marketing/responsable_diseno/disenador, igual que el original — no restringe por rol, es solo un selector |
| DIS-04 | Contador de tareas por diseñador con umbral de color (>5 = rojo) | Implementada | 2 | Umbral hardcodeado preservado; se calcula sobre las filas ya filtradas por diseñador si hay uno seleccionado (mismo orden que el original) |
| DIS-05 | Columna "Asignado a" con "—" si no hay asignación | Implementada | 2 | — |
| DIS-06 | Zona de subida de diseño en el detalle | Implementada | 2 | Ya construida en el modal de detalle (bloque de flujo de estados) — "Ver" en Diseño abre el mismo modal |
| DIS-07 | Acumulación de archivos entre múltiples interacciones sin reemplazar | Implementada | 2 | Ídem — `disenoFiles` en `solicitud-detalle-modal.tsx` |
| DIS-08 | "Diseño listo → Revisión cliente" sube todos los archivos acumulados de golpe | Implementada | 2 | Ídem — `marcarDisenoListo()` |
| DIS-09 | Exportación CSV de diseño (`exportDisenoCSV`) | Implementada | 2 | Separador TAB, BOM UTF-8, columnas fijas `CODIGO,ROLY,WRK,STM,XMAS`; un `disenador` exporta siempre solo lo suyo aunque el selector en pantalla muestre "Todos" — regla propia de la exportación, distinta de la del listado, replicada tal cual |
| DIS-10 | Nombre de archivo CSV con campaña y fecha | Implementada | 2 | `disenoCsvFilename()` |

## Carga masiva de diseños — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CM-01 | Modal de carga masiva creado dinámicamente | Implementada | 2 | `CargaMasivaModal`, abierto desde el botón "📦 Carga masiva" de la pestaña Diseño |
| CM-02 | Parseo de nombre de archivo con sufijo de catálogo opcional | Implementada | 2 | Orden de evaluación preservado: `_ROLY_WRK` antes de `_ROLY` — `parseCargaFilename()` |
| CM-03 | Matching de archivo contra solicitud por SAP | Implementada | 2 | Solo entre solicitudes en `en_diseno`/`modificar_diseno`; 3 estados: `ok`/`notfound`/`nocatalog` — `matchCargaFile()`. La previsualización matchea contra las filas ya cargadas en la página; el procesamiento real (`procesarCargaMasiva` server action) recalcula contra la BD en el momento de procesar, no contra el estado en memoria del cliente |
| CM-04 | Preview con contador "N de M reconocidos" y badges de color | Implementada | 2 | — |
| CM-05 | Eliminación individual de un archivo de la cola antes de procesar | Implementada | 2 | — |
| CM-06 | Botón de procesar deshabilitado si no hay archivos reconocidos | Implementada | 2 | Texto dinámico con el conteo |
| CM-07 | Procesamiento por lotes con un solo cambio de estado por solicitud | Implementada | 2 | Aunque una solicitud tenga varios archivos, el cambio de estado y el log se disparan una sola vez (`processedSols` Set, reutiliza `cambiarEstado()`) |
| CM-08 | Notificación disparada por solicitud, no por archivo | Implementada | 2 | La dispara `cambiarEstado()` una sola vez por solicitud (`processedSols` Set), no `procesarCargaMasiva()` por archivo |
| CM-09 | Resumen final con conteo de éxitos y errores | Implementada | 2 | Toast con el mismo formato de mensaje que el original |

## Comentarios y menciones — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| COM-01 | Detección de `@` en tiempo real con dropdown | Implementada | 2 | Máximo 6 sugerencias, solo perfiles activos. Sin excluir al propio usuario (simplificación menor, sin `currentUserId` en este componente todavía) |
| COM-02 | Inserción de mención al hacer clic en el dropdown | Implementada | 2 | Reemplaza desde la posición del `@`, añade espacio, reposiciona cursor |
| COM-03 | Atajo Ctrl/Cmd+Enter para enviar comentario | Implementada | 2 | Solo si el dropdown no está visible |
| COM-04 | Escape cierra el dropdown sin enviar | Implementada | 2 | — |
| COM-05 | Cierre del dropdown al hacer clic fuera | Implementada | 2 | Adaptado: `onBlur` del textarea con retardo corto (en vez de un listener global de `click`), para que la selección de una sugerencia (que usa `onMouseDown`) se procese antes de cerrarse |
| COM-06 | Extracción de menciones al guardar | Implementada | 2 | **Corregido** (cambio de criterio, ya no se replican bugs): el original tenía tres variantes de la misma regex, una de ellas con una trampa de cuantificador perezoso que en la práctica solo llegaba a capturar la primera palabra tras el `@`. Unificada en una sola función (`extractMentionNames` en `domain/comentarios.ts`, con test unitario) que captura una palabra de forma consistente y sin la trampa — el matching por subcadena sobre nombre/email para resolver a qué perfil corresponde sigue igual |
| COM-07 | Notificación a cada mencionado, excluyendo auto-mención | Implementada | 2 | `enviarNotificacionesMencion()`, llamada desde `addComentario()` filtrando al propio autor por id |
| COM-08 | Toast diferenciado según si hubo menciones | Implementada | 2 | — |
| COM-09 | Reapertura automática del detalle tras comentar | Implementada | 2 | El modal se recarga en el sitio, sin cerrarse |
| COM-10 | Resaltado visual de menciones en el listado | Implementada | 2 | Misma función unificada que COM-06 (`segmentarComentario`, sin `dangerouslySetInnerHTML`) |

## Notificaciones — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| NOT-01 | Notificaciones in-app sin envío real de email | Implementada | 2 | `enviado`/`enviado_at` siempre `false`/`null`, igual que el original; ver `07-propuestas-futuras.md` § 4 |
| NOT-02 | Destinatarios por transición: enviada/en_revision_marketing | Implementada | 2 | Marketing+admin y el propio comercial — `buildNotificaciones()` |
| NOT-03 | Destinatarios por transición: en_diseno | Implementada | 2 | Comercial+marketing/admin y todos los diseñadores/responsables_diseno. Solo se dispara al "Enviar a diseño" sin asignar (vía `cambiarEstado()`) — "Asignar y enviar a diseño" dispara en su lugar un aviso directo solo al diseñador asignado (NOT-03b, ver `asignarDisenadorYEnviar()`), exactamente como `confirmAsignar()` en el original |
| NOT-04 | Destinatarios por transición: diseno_en_revision_comercial | Implementada | 2 | Comercial+marketing/admin |
| NOT-05 | Destinatarios por transición: modificar_diseno | Implementada | 2 | Solo diseñadores |
| NOT-06 | Destinatarios por transición: confirmada | Implementada | 2 | Comercial+marketing/admin |
| NOT-07 | Destinatarios por transición: vuelta a borrador | Implementada | 2 | Solo el comercial |
| NOT-08 | Deduplicación de destinatarios por email | Implementada | 2 | `buildNotificaciones()` — un mismo email en dos grupos del mismo `push()` recibe un solo mensaje |
| NOT-09 | Resolución de comercial destinatario aunque la solicitud no esté aún en memoria | Implementada (ya no aplica el problema original) | 2 | El original necesitaba un parámetro de fallback porque el cliente podía no tener aún la solicitud recién creada en su caché en memoria; en un Server Action la solicitud y sus perfiles siempre se leen frescos de la BD, así que ese problema — propio de un SPA con caché de cliente — no existe aquí |
| NOT-10 | Carga de perfiles a demanda si no están precargados | Implementada (ya no aplica el problema original) | 2 | Mismo motivo que NOT-09: siempre se consulta `perfiles` fresco, no hace falta una carga "a demanda" separada de una carga "ya hecha" |
| NOT-11 | Preferencia de notificación por usuario (ambas/email/herramienta/ninguna) | Implementada | 1 y 2 | Editable desde Perfil (Fase 1); NOT-12 confirma que no se consume al enviar, igual que hoy |
| NOT-12 | La preferencia de notificación NO filtra realmente el envío | Implementada | 2 | **Gap funcional existente hoy, preservado tal cual**: `buildNotificaciones()`/`enviarNotificacion()` no consultan `notif_preferencia` en ningún punto — se guarda el valor pero todas las notificaciones se insertan igual con `enviado:false` |
| NOT-13 | Carga de notificaciones limitada a 7 días / 30 registros | Implementada | 2 | `getNotificaciones()` |
| NOT-14 | Estado de "leído" en localStorage, no en BD | Implementada | 2 | `features/notificaciones/infrastructure/read-state.ts`; ver `07-propuestas-futuras.md` § 2 |
| NOT-15 | Badge de no leídas con tope visual "9+" | Implementada | 2 | Oculto si es 0 |
| NOT-16 | Panel lateral con animación y auto-marcado de leídas a los 2s de abrir | Implementada | 2 | — |
| NOT-17 | Resaltado visual de no leídas (fondo ámbar + negrita) | Implementada | 2 | — |
| NOT-18 | Truncado del cuerpo a 80 caracteres en el listado | Implementada | 2 | — |
| NOT-19 | Clic en notificación abre el detalle de la solicitud referenciada | Implementada | 2 | Navega a `/solicitudes?ver=<id>` o `/diseno?ver=<id>` según a cuál tenga acceso el rol actual — ambas páginas abren `SolicitudDetalleModal`, que siempre carga la solicitud fresca por id (no depende de que ya esté en memoria) |

## Campañas — Fase 3

**Adelanto acotado (2026-08-03)**: se construyó un formulario mínimo de Campañas antes de tiempo (fuera de su fase), únicamente para poder gestionar el PDF de instrucciones por catálogo y por idioma que necesita el formulario de Solicitudes (cambio funcional solicitado explícitamente). CAMP-06/07/09/10 quedan cubiertos por esa construcción mínima; el resto de la fase (activa por defecto, banner de cierre, "usar como activa", eliminar, sincronización entre los 4 selectores de la app) sigue pendiente para cuando le toque su fase.

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CAMP-01 | Cálculo de campaña activa por defecto | Pendiente | 3 | Entre las activas, la de `fecha_cierre` más reciente; si no hay ninguna activa, la primera de la lista general |
| CAMP-02 | Marcador "★" en el selector junto a la campaña por defecto | Pendiente | 3 | — |
| CAMP-03 | Banner de aviso de cierre de campaña (rojo si ya cerró, ámbar si ≤7 días) | Pendiente | 3 | Singular/plural correcto en "1 día" vs "N días" |
| CAMP-04 | Tabla de campañas con badge "ACTIVA" (seleccionada) distinto del flag `activa` (booleano) | Pendiente | 3 | Son dos conceptos distintos — preservar la distinción, no fusionarlos |
| CAMP-05 | Botón "Usar como activa" solo si `activa=true` y no es ya la seleccionada | Pendiente | 3 | — |
| CAMP-06 | Selector de catálogos por checkbox sincroniza filas de subida de PDFs | Implementada | 3 | Adelanto acotado — ver nota de sección |
| CAMP-07 | Validación obligatoria de PDFs por catálogo seleccionado | Implementada | 3 | Adaptada al cambio funcional: portadas sigue exigiendo 1 PDF; instrucciones ahora exige al menos 1 idioma con PDF (no los 24) |
| CAMP-08 | Zonas de subida por catálogo, solo aceptan `.pdf` | Implementada | 3 | Ya no son 8 fijas: portadas (1 por catálogo) + instrucciones (una por idioma, cantidad abierta — se puede añadir cualquier idioma por nombre libre, sin lista cerrada en código) — cambio funcional solicitado |
| CAMP-09 | Reutilización de archivos existentes al editar (enlace "Ver" + "sube otro para reemplazar") | Implementada | 3 | Adelanto acotado |
| CAMP-10 | Nombre de archivo determinista al subir PDFs | Implementada | 3 | `covers/{campanaId}/{key}_{timestamp}.pdf`, `instrucciones/{campanaId}/{key}_{idioma}_{timestamp}.pdf`. Sin el ID temporal del original (`new_{timestamp}`) — aquí la campaña se crea primero y se sube después con su ID real, evitando esa carpeta huérfana |
| CAMP-11 | Selector radio custom Activa/Inactiva (flag `activa`) | Implementada | 3 | Migrado a `<input type=radio>` real, mismo criterio que CAT-09 |
| CAMP-12 | Confirmación nativa antes de fijar una campaña como seleccionada | Pendiente | 3 | — |
| CAMP-13 | Eliminación de campaña en cascada con aviso del nº exacto de solicitudes afectadas | Pendiente | 3 | Borra manualmente catálogos, adjuntos, logs, notificaciones y solicitudes de cada una |
| CAMP-14 | `activeCampana` se limpia a `null` si se elimina la campaña activa | Pendiente | 3 | — |
| CAMP-15 | 4 selectores de campaña sincronizados en toda la app | Pendiente | 3 | Panel global, dashboard, diseño, comercial — un único punto de repoblación |
| CAMP-16 | **[Cambio funcional solicitado, no existe en `index.html`]** PDF de instrucciones por catálogo y por idioma, sin lista de idiomas fija en código | Implementada | 3 | `campanas.covers_instrucciones` pasa de `{ [catalogo]: url }` a `{ [catalogo]: { [idioma]: url } }`. El conjunto de idiomas se descubre en tiempo de ejecución a partir de lo que Marketing escriba/suba — añadir un idioma nuevo no requiere ningún cambio de código. En Solicitudes, "Ver instrucciones" solo se muestra si existe PDF para el idioma elegido (se oculta si no, nunca muestra uno incorrecto) |

## Usuarios — Fase 4

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| USR-01 | Botón "Nuevo usuario" solo para rol admin (ni siquiera marketing) | Pendiente | 4 | Marketing puede editar pero no crear |
| USR-02 | Filtros: nombre/email/código, rol, estado activo/inactivo | Pendiente | 4 | — |
| USR-03 | Tarjetas de estadísticas por rol (solo usuarios activos) | Pendiente | 4 | Colores fijos por rol |
| USR-04 | Fila de usuario inactivo con opacidad reducida | Pendiente | 4 | — |
| USR-05 | Badge de estado con color semántico | Pendiente | 4 | — |
| USR-06 | Campo de contraseña solo visible al crear, nunca al editar | Pendiente | 4 | No se puede resetear contraseña desde este modal |
| USR-07 | Edición actualiza solo nombre/rol/código (no email ni contraseña) | Pendiente | 4 | — |
| USR-08 | Creación vía Edge Function `create-user` (Service Role Key) | Pendiente | 4 | — |
| USR-09 | Validaciones al crear: contraseña ≥8 caracteres, código obligatorio | Pendiente | 4 | — |
| USR-10 | Mensaje de estado intermedio "Creando usuario..." | Pendiente | 4 | — |
| USR-11 | Activar/desactivar con un solo clic, sin confirmación | Pendiente | 4 | — |
| USR-12 | Importación masiva de usuarios desde Excel/CSV | Pendiente | 4 | Detecta cabecera automáticamente; columnas fijas por posición (email, nombre, password, rol, código) — **no es importación de solicitudes**, corrección respecto a versiones anteriores de esta documentación |
| USR-13 | Validación de roles permitidos en importación | Pendiente | 4 | Solo `comercial, marketing, disenador, admin` — **no incluye** las variantes nacional/exportación ni `responsable_diseno` que sí existen en el resto de la app; filas con rol inválido se marcan en rojo pero no bloquean el resto de la importación — confirmar si se preserva esta inconsistencia o se decide corregir explícitamente |
| USR-14 | Previsualización limitada a 10 filas con "...y N más" | Pendiente | 4 | — |
| USR-15 | Import fila a fila con progreso en vivo, continúa si una fila falla | Pendiente | 4 | **Verificar antes de nada**: el import llama a `/auth/v1/admin/users`, un endpoint que normalmente exige la `service_role` key; el código usa el token de sesión del usuario o la clave pública como fallback. Confirmar en producción si esto realmente crea usuarios o falla silenciosamente — si nunca ha funcionado, la "paridad" a validar es esa misma ausencia de funcionamiento, no una versión que funcione por primera vez |

## Panel global y exportación — Fase 5

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| PAN-01 | Filtro de responsables restringido a su propio colectivo de comerciales | Pendiente | 5 | — |
| PAN-02 | Búsqueda combinada (SAP, empresa, código/nombre de comercial) | Pendiente | 5 | — |
| PAN-03 | Archivadas ocultas por defecto, visibles solo con filtro explícito | Pendiente | 5 | Mismo patrón en la tabla comercial (Fase 2) |
| PAN-04 | Ordenación de columnas clicable con toggle asc/desc | Pendiente | 5 | Resetea el indicador visual de las demás columnas |
| PAN-05 | Ordenación especial de la columna "comercial" por nombre del perfil relacionado | Pendiente | 5 | — |
| PAN-06 | Columna "Campos incompletos" en rojo / "✓ Completa" en verde | Pendiente | 5 | — |
| PAN-07 | Exportación a Excel: hoja "Portadas" + hoja "Resumen" | Pendiente | 5 | — |
| PAN-08 | Columnas dinámicas por catálogo (9 o 10 si tiene diseño propio/precios) | Pendiente | 5 | — |
| PAN-09 | Exclusión de archivadas del export | Pendiente | 5 | — |
| PAN-10 | Formato visual del Excel (colores por catálogo, zebra striping, filas rojas si incompleta, celda verde si confirmada, congelado de 3 filas) | Pendiente | 5 | — |
| PAN-11 | Hoja "Resumen" con 6 métricas | Pendiente | 5 | **Inconsistencia detectada hoy**: la hoja Resumen calcula sus métricas sobre `allSolicitudes` (todas las campañas), mientras la hoja principal usa `exportSols` filtrado por la campaña seleccionada — confirmar si se preserva esta inconsistencia tal cual o se corrige explícitamente (violaría el principio inamovible salvo decisión expresa) |
| PAN-12 | Nombre de archivo `{campaña}_{fecha}.xlsx` | Pendiente | 5 | Espacios reemplazados por guion bajo |
| PAN-13 | Botón "Auto-adjudicar" disponible en el panel | Pendiente | 5 | Funcionalidad ya cubierta en detalle en CAT-18 (Fase 2); aquí solo el punto de entrada desde el Panel |
| PAN-14 | Selectores de campaña sincronizados con el resto de la app | Pendiente | 5 | Ver CAMP-15 |
| PAN-15 | Filtro de estado con el mismo comportamiento especial de archivadas que el resto de tablas | Pendiente | 5 | — |

## Perfil de usuario — Fase 1

> Nota de alcance: `06-roadmap.md` no mencionaba explícitamente el módulo "Perfil" en la Fase 1 — se incluye aquí porque es una página accesible desde el Layout (topbar) desde el primer momento, y no depende de ningún módulo de fases posteriores. Confirmar esta asignación al aprobar el checklist de la Fase 1.

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| PERF-01 | Acceso solo desde el botón del topbar, nunca desde el nav | Validada | 1 | `getNavItemsForRole()` nunca incluye "perfil"; el link "Mi cuenta" del topbar es la única vía, igual que hoy |
| PERF-02 | Campos de solo lectura: rol (traducido) y código | Validada | 1 | `ROL_LABELS` reutilizado de `features/layout/domain/nav-items.ts` |
| PERF-03 | Campos editables: nombre y email | Validada | 1 | `DatosForm` / `updateDatos()` |
| PERF-04 | Cambio de email requiere confirmación por correo, no se aplica al instante | Validada | 1 | `supabase.auth.updateUser({email})` — comportamiento por defecto de Supabase Auth, equivalente al PUT directo a `/auth/v1/user` del original. Pendiente de que el usuario verifique que la Redirect URL de confirmación de cambio de email está permitida en el proyecto de desarrollo (mismo punto que ya se ajustó para la recuperación de contraseña) |
| PERF-05 | Validación de formato de email (regex simple) | Validada | 1 | Mismo regex literal que el original (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) |
| PERF-06 | Validación de nombre no vacío | Validada | 1 | — |
| PERF-07 | Cambio de contraseña independiente, con su propio bloque de alertas | Validada | 1 | `PasswordForm`, action propia (`updatePerfilPassword`) — no reutiliza la de recuperación de contraseña porque esta tiene mensajes de validación distintos (ver PERF-08) |
| PERF-08 | Validaciones de contraseña (no vacía, ≥8 caracteres, coincidencia) | Validada | 1 | Dos mensajes distintos para "vacía" y "<8 caracteres", igual que `savePerfilPassword()` — a diferencia de la recuperación de contraseña, que los combina en uno solo |
| PERF-09 | Indicador de fortaleza de contraseña en tiempo real (5 niveles) | Validada | 1 | `passwordStrength()`, función pura con test unitario (`tests/unit/password-strength.test.ts`) — mismo cálculo de score que `checkPwdStrength()` |
| PERF-10 | Botón de mostrar/ocultar contraseña | Validada | 1 | Estado de cliente por campo, mismos emojis 👁/🙈 |
| PERF-11 | Preferencia de notificaciones editable desde Perfil, sincronizada con topbar | Validada | 1 | `NotifPrefForm` guarda al cambiar el select, sin botón — el selector del topbar (`#notif-pref`) del original está oculto permanentemente (mismo patrón que NAV-16), así que no hay nada visible con lo que sincronizar en la topbar de esta migración; ver AUT-15/NOT-11/NOT-12 |
| PERF-12 | Botones de guardado con estado deshabilitado + texto de progreso | Validada | 1 | "Guardando...", "Actualizando..." — `useActionState` + `disabled` |

## UI transversal — Fase 1 (base) y Fase 2 (extensiones específicas de Solicitudes/Diseño)

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| UI-01 | Sistema de modales por clase `.open` | Implementada | 1/2 | `.modal-bg`/`.modal`/`.modal-header`/`.modal-body` en `globals.css`, montado condicionalmente en vez de por clase — mismo resultado visual. Primer uso real: el modal de Nueva/Editar solicitud (Bloque 1, decisión explícita de mantener modal en vez de ruta propia). Sin gestión de foco/accesibilidad, igual que el original — oportunidad de mejora a documentar en `07-propuestas-futuras.md`, no a implementar de paso |
| UI-02 | Toasts de dos tipos (`showToast` neutro, `showFormAlert` de error) | Implementada | 1/2 | El toast neutro (`ToastProvider`, `shared/ui/toast.tsx`) en uso desde Perfil. `showFormAlert` (rojo, 6s) ya tiene su primer llamador real: el formulario de Solicitudes (Bloque 1) |
| UI-03 | `showAlert` genérico inyectado por ID de contenedor | Pendiente | 1/2 | Ningún bloque construido hasta ahora lo necesita (los formularios propios usan sus propias alertas con `useActionState`) — se construye junto con los modales de Fase 2 que lo usan |
| UI-04 | Formateo de fecha localizado `es-ES` | Implementada | 1/2 | `fmtDate()` en `shared/domain/format.ts`, con test unitario — en uso en la tabla "Mis solicitudes" (Bloque 1) |
| UI-05 | Formateo de número con separador de miles español | Validada | 1 | `fmtNum()` en `features/dashboard/domain/dashboard-stats.ts`, con test unitario — ya en uso en las tarjetas KPI del Dashboard |
| UI-06 | Sistema de archivos adjuntos por categoría con deduplicación por nombre+tamaño | Implementada | 2 | `FileDropZone` (logo/diseño propio del formulario) — dedup por nombre+tamaño al añadir |
| UI-07 | Múltiples zonas de drag&drop con implementación duplicada por zona (logo, catálogo, diseño propio, diseño en detalle, modificación, covers de campaña, carga masiva) | Pendiente | 2 y 3 | Sin abstracción común hoy — cada zona sigue con su propia implementación (`FileDropZone` para logo/diseño propio del formulario, y una zona propia para diseño en detalle/modificación/carga masiva/covers de campaña, cada una con su propia variante visual y reglas de eliminación) — se podría unificar en Next.js **sin cambiar el comportamiento observable** de cada una, pero no es necesario para la paridad funcional |
| UI-08 | Previsualización de archivo único con opción "Quitar" (modal de modificación) | Implementada | 2 | Zona de arrastrar/soltar con previsualización ✅ nombre+KB y botón "✕ Quitar", igual que `setModifFile()` |
| UI-09 | Previsualización de múltiples archivos con chip y eliminación individual | Implementada | 2 | `FileDropZone` (chips + ✕ por archivo) y `CargaMasivaModal` (lista con ✕ por archivo). La zona de "Subir diseño" del detalle muestra lista de archivos pero **sin** eliminación individual — fiel al original, que tampoco la tiene ahí (`updateDisenoZone()`) |
| UI-10 | Selector de impersonación de rol (solo admin) | Validada | 1 | Estado de cliente en `AppShell` (`useState`) para el nav, igual que el original; además escribe una cookie (`impersonated_rol`) + `router.refresh()` para que el Dashboard (bloque siguiente, ya construido) recalcule sus datos con el rol impersonado — sin esto, impersonar habría cambiado el nav sin cambiar ningún dato. La sesión real y sus permisos de RLS no cambian en ningún caso, igual que en el original |
| UI-11 | Restauración forzada del rol real al cerrar sesión durante impersonación | Validada | 1 | Al ser estado de React (no persistido), cerrar sesión / recargar la página lo descarta automáticamente — no puede quedar "atascado" entre sesiones |
| UI-12 | Sincronización en tiempo real vía WebSocket manual (protocolo Phoenix) | Pendiente | 2 | Suscrito a `solicitudes` y `notificaciones`; en Next.js se sustituye por `supabase-js` Realtime manteniendo el mismo resultado observable |
| UI-13 | Reconexión automática tras cierre del WebSocket (espera 5s) | Pendiente | 2 | — |
| UI-14 | Fallback automático a polling si falla el WebSocket | Pendiente | 2 | — |
| UI-15 | Polling de respaldo cada 30s con debounce de 2s contra actualizaciones realtime recientes | Pendiente | 2 | — |
| UI-16 | Debounce global de 2s entre recargas de datos | Pendiente | 2 | Evita tormentas de refresco con varios eventos realtime juntos |
| UI-17 | Toast sutil "↻ Datos actualizados" tras recarga disparada por evento realtime (no tras polling) | Pendiente | 2 | — |
| UI-18 | Dos canales de suscripción realtime independientes (solicitudes vs notificaciones) | Pendiente | 2 | El de notificaciones es más ligero (solo recarga notificaciones) |

---

## Hallazgos a verificar — posibles bugs heredados (protocolo en `08-protocolo-validacion.md` § 8.7)

Registro vivo de comportamientos de `index.html` que parecen incorrectos, incompletos o no intencionados. Ninguno se implementa en el sistema nuevo (ni "tal cual" ni "corregido") sin que la fila tenga una **Decisión** distinta de "Pendiente". Se amplía según aparezcan nuevos durante la implementación de cualquier fase, no solo durante el diseño.

### H-01 (USR-15) — Importación masiva de usuarios podría no funcionar hoy

- **Comportamiento actual**: `confirmImport` (~5732) llama a `POST {SUPA_URL}/auth/v1/admin/users` usando como `Authorization` el `access_token` de la sesión del usuario, o la clave pública (`SUPA_KEY`) como fallback si no hay sesión.
- **Por qué se sospecha bug**: `/auth/v1/admin/users` es un endpoint administrativo de Supabase que normalmente exige la `service_role` key; ni el JWT de un usuario normal ni la clave `anon`/pública deberían tener permiso para usarlo. Si es así, cada llamada debería fallar con 401/403, y la función nunca habría creado usuarios correctamente en producción.
- **Decisión**: Pendiente — requiere verificación directa en producción (probar la importación con un archivo de prueba y observar si realmente crea usuarios) antes de decidir si se migra "funcionando" o se migra "tal cual, fallando".

### H-02 (PAN-11) — Hoja "Resumen" del Excel no está filtrada por campaña

- **Comportamiento actual**: en `exportExcel` (~3989-3999), las métricas de la hoja "Resumen" (total, completas, incompletas, confirmadas) se calculan sobre `allSolicitudes` (todas las campañas), mientras que la hoja principal "Portadas" usa `exportSols`, ya filtrado por la campaña seleccionada en el export.
- **Por qué se sospecha bug**: son dos fuentes de datos distintas dentro del mismo archivo exportado para la misma acción del usuario ("exportar esta campaña") — lo esperable es que ambas hojas describan el mismo conjunto de datos.
- **Decisión**: Pendiente.

### H-03 (NOT-12) — La preferencia de notificación no filtra ningún envío

- **Comportamiento actual**: `notif_preferencia` (ambas/email/herramienta/ninguna) se guarda por usuario y se muestra en la UI, pero `enviarNotificacion` inserta la notificación igual para todos los destinatarios sin consultar esa preferencia. **Detalle exacto confirmado durante la reconciliación del esquema (`03-modelo-datos.md` § 3.4.3)**: `enviarNotificacion` escribe `enviado`/`enviado_at` como `n.solo_herramienta ? true/now() : false/null`, pero la función `push()` que construye cada notificación nunca asigna la propiedad `solo_herramienta` — la condición es siempre falsa, así que `enviado` es siempre `false` y `enviado_at` siempre `null`, para toda notificación, sin excepción.
- **Por qué se sospecha bug**: existe un control de UI completo (selector, guardado, sincronización entre dos pantallas) y hasta la lógica de escritura condicional en el backend (`solo_herramienta ? ... : ...`) para una preferencia que nunca llega a tener ningún efecto observable — todo el cableado está a medio hacer, falta exactamente el paso que asignaría `solo_herramienta` a partir de `notif_preferencia` del destinatario. No parece una decisión de diseño deliberada.
- **Decisión**: Pendiente.

### H-04 (NAV-13) — Escape no cierra los modales creados dinámicamente

- **Comportamiento actual**: el listener de Escape (~4020-4028) solo conoce una lista fija de IDs de modal predefinidos en el HTML; los modales creados por JS en tiempo de ejecución (asignar canal, asignar diseñador, carga masiva) no están en esa lista y Escape no los cierra.
- **Por qué se sospecha bug**: es más probable que sea un descuido al añadir esos modales dinámicos después de escribir el listener, que una decisión deliberada de que esos tres modales concretos se comporten distinto al resto.
- **Decisión**: Pendiente.

### H-05 (AUT-14) — Fallo silencioso de `initApp` tras el login

- **Comportamiento actual**: si `initApp()` lanza una excepción tras un login correcto, el código solo oculta el loader y hace `console.error`, sin mostrar ningún mensaje al usuario — la app podría quedarse en un estado inconsistente sin que la persona sepa por qué.
- **Por qué se sospecha bug**: cualquier otro error de la app (login, guardado, subida de archivo) sí muestra un toast o alerta; que este en concreto no lo haga rompe el patrón del resto del código.
- **Decisión**: Pendiente.

### H-06 (USR-13) — Roles aceptados en la importación no cubren todos los roles reales

- **Comportamiento actual**: `processImportFile` (~5695) solo acepta `comercial, marketing, disenador, admin` como roles válidos; no incluye `comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion` ni `responsable_diseno`, que sí existen y se usan en el resto de la aplicación.
- **Por qué se sospecha bug**: parece una lista de roles desactualizada (probablemente escrita antes de que se introdujeran las variantes de canal), no una restricción intencionada de qué roles se pueden crear por Excel.
- **Decisión**: Pendiente.

### H-07 (NAV-02/NAV-03) — Los roles legacy genéricos `comercial`/`responsable` (sin sufijo de canal) no ven ningún botón de navegación

- **Comportamiento actual**: `buildNav()` (~1900-1922) decide qué botones mostrar con `isComercial = ['comercial_nacional','comercial_exportacion'].includes(rol)` e `isResp = ['responsable_nacional','responsable_exportacion'].includes(rol)` — ninguna de las dos listas incluye los valores genéricos `comercial` o `responsable`. Como además `isAdmin`/`isMarketing`/`isDiseño`/`isRespDis` tampoco los cubren, `items` queda vacío para estos roles y `if (items.length > 0) showPage(items[0].id)` no se ejecuta: el usuario se autentica correctamente pero la zona principal de la app queda completamente vacía, sin ningún botón para navegar a ninguna página (ni siquiera Dashboard, aunque `loadData()` sí calcula sus datos para `responsable` en algunos casos — ver ~1942/~1954 — solo que no hay forma de llegar a verlos).
- **Por qué se sospecha bug**: es el mismo patrón ya confirmado y aceptado como hipótesis en la política `comercial_solo_sus_solicitudes` de producción (`03-modelo-datos.md` § 3.4.1) — código escrito para los roles genéricos originales que quedó desactualizado cuando se introdujeron las variantes `_nacional`/`_exportacion`, sin que alguien volviera a añadir el valor genérico a todas las listas relevantes. El tratamiento es además inconsistente dentro del propio `index.html`: `loadData()` sí trata a `responsable` como válido en dos condiciones (líneas 1942 y 1954) mientras que `buildNav()` no lo trata en ninguna — mismo rol, comportamiento distinto según el archivo de código que se mire.
- **Decisión**: Pendiente — antes de decidir si se replica tal cual (bloqueo total de la app para ese rol) o se corrige, hace falta una consulta de solo lectura en producción (`select rol, count(*) from perfiles group by rol order by 1;`) para saber si algún usuario real tiene hoy `rol = 'comercial'` o `rol = 'responsable'` sin sufijo — si no hay ninguno, es análogo a `diseno_en_revision`: un valor inerte que no bloquea la Fase 1, y la decisión se puede diferir sin riesgo.

### H-08 (SOL-04) — Al reeditar un borrador en español, la provincia aparece vacía

- **Comportamiento actual**: `provincia` se guarda en mayúsculas (`PROVINCIA.toUpperCase()`, ~2934) pero `openFormModal()` asigna ese valor tal cual a `f-provincia-select.value` (~2744) — un `<select>` no selecciona ninguna opción si el valor no coincide EXACTAMENTE con `value` de una `<option>` (`"MADRID"` no es `"Madrid"`). El input de texto libre (idioma≠Español) no tiene este problema porque acepta cualquier valor.
- **Por qué se sospecha bug**: es casi con certeza un descuido de mayúsculas/minúsculas, no una decisión de diseño — el dato sigue guardado correctamente, solo su representación visual al reeditar se pierde.
- **Decisión**: Corregido (2026-08-03) — cambio de criterio del usuario: a partir de esta fecha los defectos objetivos detectados se corrigen directamente en vez de replicarse (ya no aplica el principio de la sección anterior a los hallazgos ya identificados). El formulario ahora busca la opción real de la lista sin distinguir mayúsculas/minúsculas antes de preseleccionarla.

### H-09 (SOL-11) — Detección de SAP duplicado sensible a mayúsculas

- **Comportamiento actual**: la comparación de duplicados (~2913-2922) usa el código tal como se escribió (sin mayusculizar) contra los ya guardados (que sí se guardan en mayúsculas, ~2932) — solo protege de duplicados cuando el SAP es puramente numérico.
- **Por qué se sospecha bug**: la normalización a mayúsculas se aplica de forma consistente en el resto de `saveSolicitud()`; que la comparación de duplicados sea la única que no la usa parece un descuido, no una decisión deliberada.
- **Decisión**: Corregido (2026-08-03) — la comprobación de duplicados ahora compara en mayúsculas en ambos lados.

### H-10 (CAT-08) — "Diseño 100% propio" está cableado al catálogo 'stamina', incluso pintado en la sección de XMAS

- **Comportamiento actual**: en `buildCatSections()` (~2506-2513), el radio "Diseño 100% propio" tiene `data-cat="stamina"` literal (no `${cat.key}`) para CUALQUIER catálogo con `hasDisenoProp` (Stamina y XMAS), igual que `toggleDisenoPropio('stamina', ...)` en sus `onclick`, el `id="diseno-propio-upload-stamina"` de la zona de subida, y el `handleDrop(event,'stamina_diseno')` de su `ondrop`. Efecto: al rellenar la sección de XMAS, "Diseño 100% propio" en realidad lee/escribe el valor de **Stamina** — nunca el de XMAS, que se guarda siempre como `false` (`getRadioVal('xmas','portada_diseno_propio')` nunca encuentra su propio radio). La zona de subida de diseño propio de XMAS (`diseno-propio-upload-xmas`, con id correcto) nunca se revela porque nada la referencia por su id real, y el archivo asociado (`catFiles.xmas_diseno`) tampoco se incluye en la lista de subida final (~2982-2988) — funcionalidad muerta por dos vías independientes.
- **Por qué se sospecha bug**: `con_precios`, en la misma plantilla y a un par de líneas de distancia, sí usa `${cat.key}` correctamente — el contraste sugiere que "Diseño 100% propio" se escribió cuando solo Stamina tenía `hasDisenoProp: true`, y no se actualizó al añadirse XMAS a esa lista.
- **Decisión**: Corregido (2026-08-03) — "Diseño 100% propio" es ahora un campo independiente por catálogo; Stamina y XMAS ya no comparten estado, y ambos tienen su propia zona de subida de diseño propio funcional.

### H-11 (SOL-07/CAT-01) — Los enlaces "Ver portadas"/"Ver instrucciones" del formulario ignoraban la campaña seleccionada en ese mismo formulario

- **Comportamiento actual**: `buildCatSections()` (~2429-2440) lee `activeCampana?.covers`/`activeCampana?.covers_instrucciones` — la campaña activa GLOBAL de la app — no la campaña que el usuario tiene seleccionada en el propio `<select id="f-campana">` del formulario (`onFormCampanaChange()` solo actualiza `CATS`, nunca `activeCampana`). Si un comercial cambia de campaña dentro del formulario, los enlaces de portadas/instrucciones no se actualizaban y podían corresponder a una campaña distinta de la que está rellenando.
- **Por qué se sospecha bug**: no hay ninguna razón funcional para que estos enlaces dependan de una campaña distinta a la que se está rellenando; parece un descuido al no propagar la campaña seleccionada del formulario a esta sección.
- **Decisión**: Corregido (2026-08-03) — los enlaces usan ahora la campaña realmente seleccionada en el formulario (`selectedCampana`), no la activa por defecto.

Ninguna fase que module estas funcionalidades (Fase 4 para H-01/H-06, Fase 5 para H-02, Fase 2 para H-03, Fase 1 para H-04/H-05/H-07) cierra su checklist mientras su hallazgo correspondiente siga con Decisión "Pendiente". H-08 a H-11 ya están corregidos y no bloquean ninguna fase.
