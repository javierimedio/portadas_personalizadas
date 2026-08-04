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
| AUT-14 | Fallo silencioso de `initApp` tras login | Implementada | 1 | **Decisión del usuario (2026-08-04, H-05)**: no replicar el fallo silencioso. `src/app/(app)/error.tsx` (error boundary de Next.js, cubre layout + cualquier página bajo `(app)`) muestra "No ha sido posible cargar la aplicación." + botón "Reintentar" (`reset()`), con el error completo por `console.error` para desarrollo — sustituye tanto al fallo silencioso original como a la página de error genérica sin estilo que Next.js mostraría por defecto |
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
| NAV-09 | Efectos secundarios al entrar en una página | Implementada | 2/3/1 | Resuelto por la propia arquitectura de rutas reales del App Router: cada navegación a `/campanas`, `/dashboard` o `/perfil` ejecuta su Server Component con datos frescos, equivalente al `if (id === ...) loadX()` de `showPage()` sin necesitar ese cableado manual |
| NAV-10 | Nav móvil tipo drawer con hamburguesa | Validada | 1 | Bloquea scroll del body (`document.body.style.overflow`), muestra backdrop |
| NAV-11 | Cierre automático del drawer al pulsar un botón de nav (≤480px) | Validada | 1 | En la réplica se cierra en cualquier ancho móvil (breakpoint único `md`, sin distinguir 480px de 768px como el original) — mismo resultado observable, breakpoint simplificado |
| NAV-12 | Cierre automático del drawer al redimensionar a escritorio | Validada | 1 | Resuelto por CSS (`md:translate-x-0`) en vez de un listener de `resize` — el drawer no puede quedar visible en escritorio independientemente del estado de React, mismo resultado observable con una implementación más simple |
| NAV-13 | Cierre de modales predefinidos con Escape | Implementada | 2/3/4 | `shared/ui/use-escape-to-close.ts`, aplicado a los 6 modales (`SolicitudModal`, `SolicitudDetalleModal`, `CampanaModal`, `UsuarioModal`, `ImportarUsuariosModal`, `CargaMasivaModal`). H-04: a diferencia del original (que solo cerraba los modales predefinidos en el HTML), aquí se aplica por igual a todos — no hay razón funcional para que "Asignar canal"/"Asignar diseñador"/carga masiva se comporten distinto |
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
| SOL-25 | Cálculo de campos incompletos (`missingFields`) | Implementada | 5 | `features/panel-global/domain/missing-fields.ts`, columna "Campos incompletos" de Panel Global. Usa los catálogos de la campaña de cada solicitud, no una lista global |
| SOL-26 | Filtro de comercial en "Mis solicitudes" (solo responsables/admin/marketing) | Implementada | 2 | `muestraFiltroComercial`/`comercialesFiltroMisSolicitudes`. Colectivo distinto del de Panel Global: cada responsable de canal ve solo su propio colectivo; admin/marketing ven los comerciales rasos de los 3 canales, sin incluir a otros responsables — réplica exacta de la rama `else` de `renderComercialTable()` (~2024-2029), completado tras quedar pendiente en el Bloque 1 de esta fase |
| SOL-27 | Filtro de idioma en "Mis solicitudes" (solo exportación) | Implementada | 2 | Mismo listado de `IDIOMAS` que el formulario, ordenado alfabéticamente para esta lista (a diferencia del select del formulario, que pone Español primero — mismo orden que el `#filter-idioma-comercial` original). Completado tras quedar pendiente en el Bloque 1 de esta fase |

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
| CAT-18 | Auto-adjudicación de portadas (`autoAdjudicar`) | Implementada | 5 | `features/panel-global/domain/auto-adjudicar.ts` + Server Action `auto-adjudicar.action.ts` (revalida rol admin/marketing). Ordena por antigüedad, asigna 1ª opción libre evitando repetir en la misma provincia; **excluye XMAS del reparto automático**; usa `confirm()`/`alert()` nativos del navegador |
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
| NOT-11 | Preferencia de notificación por usuario (ambas/email/herramienta/ninguna) | Implementada | 1 y 2 | Editable desde Perfil (Fase 1); NOT-12 (H-03) ahora sí la consume al enviar |
| NOT-12 | La preferencia de notificación gobierna el envío | Implementada | 2 | **Corregido (2026-08-04, H-03), a petición explícita del propietario del proyecto**: `resolverEntrega()` (`features/notificaciones/domain/enviar-notificacion.ts`) decide por destinatario, en los 3 puntos de envío (`enviarNotificacion`, `enviarNotificacionAsignacion`, `enviarNotificacionesMencion`): `ninguna` → no se crea ningún registro; `email` → tampoco (no hay canal de email real implementado — `docs/07-propuestas-futuras.md` § 4 — y "solo email" pide explícitamente no aparecer en la herramienta); `herramienta` → se crea y se marca `enviado:true` (nada más pendiente); `ambas`/sin preferencia → se crea, visible en la herramienta, pero `enviado:false` (el email real sigue pendiente de implementar) |
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
| CAMP-01 | Cálculo de campaña activa por defecto | Implementada | 3 | `activeCampanaId()`/`getDefaultCampanaId()` en `shared/domain/campanas.ts` |
| CAMP-02 | Marcador "★" en el selector junto a la campaña por defecto | Implementada | 3 | Selectores de Solicitudes, Diseño y Dashboard |
| CAMP-03 | Banner de aviso de cierre de campaña (rojo si ya cerró, ámbar si ≤7 días) | Implementada | 3 | `campanaBanner()`, mostrado en el Dashboard (único sitio donde el original lo pinta) |
| CAMP-04 | Tabla de campañas con badge "ACTIVA" (seleccionada) distinto del flag `activa` (booleano) | Implementada | 3 | Son dos conceptos distintos, preservados sin fusionar — la tabla muestra ambos |
| CAMP-05 | Botón "Usar como activa" solo si `activa=true` y no es ya la seleccionada | Implementada (corregido, ver H-12) | 3 | En el original nunca sobrevivía a la recarga que la propia función disparaba — aquí sí persiste, vía cookie de sesión |
| CAMP-06 | Selector de catálogos por checkbox sincroniza filas de subida de PDFs | Implementada | 3 | Adelanto acotado — ver nota de sección |
| CAMP-07 | Validación obligatoria de PDFs por catálogo seleccionado | Implementada | 3 | Adaptada al cambio funcional: portadas sigue exigiendo 1 PDF; instrucciones ahora exige al menos 1 idioma con PDF (no los 24) |
| CAMP-08 | Zonas de subida por catálogo, solo aceptan `.pdf` | Implementada | 3 | Ya no son 8 fijas: portadas (1 por catálogo) + instrucciones (una por idioma, cantidad abierta — se puede añadir cualquier idioma por nombre libre, sin lista cerrada en código) — cambio funcional solicitado |
| CAMP-09 | Reutilización de archivos existentes al editar (enlace "Ver" + "sube otro para reemplazar") | Implementada | 3 | Adelanto acotado |
| CAMP-10 | Nombre de archivo determinista al subir PDFs | Implementada | 3 | `covers/{campanaId}/{key}_{timestamp}.pdf`, `instrucciones/{campanaId}/{key}_{idioma}_{timestamp}.pdf`. Sin el ID temporal del original (`new_{timestamp}`) — aquí la campaña se crea primero y se sube después con su ID real, evitando esa carpeta huérfana |
| CAMP-11 | Selector radio custom Activa/Inactiva (flag `activa`) | Implementada | 3 | Migrado a `<input type=radio>` real, mismo criterio que CAT-09 |
| CAMP-12 | Confirmación nativa antes de fijar una campaña como seleccionada | Implementada | 3 | `window.confirm()` en `usarComoActiva()` |
| CAMP-13 | Eliminación de campaña en cascada con aviso del nº exacto de solicitudes afectadas | Implementada | 3 | `eliminarCampana()` — borra manualmente catálogos, adjuntos, logs, notificaciones y solicitudes de cada una |
| CAMP-14 | `activeCampana` se limpia a `null` si se elimina la campaña activa | Implementada | 3 | Se borra la cookie de sesión si la campaña eliminada era la activa — cae de nuevo al default algorítmico |
| CAMP-15 | 4 selectores de campaña sincronizados en toda la app | Implementada | 3 | Panel global queda pendiente de su propio bloque (todavía no existe la página); Dashboard, Diseño y Solicitudes ya comparten la misma cookie de sesión como fuente única |
| CAMP-16 | **[Cambio funcional solicitado, no existe en `index.html`]** PDF de instrucciones por catálogo y por idioma, sin lista de idiomas fija en código | Implementada | 3 | `campanas.covers_instrucciones` pasa de `{ [catalogo]: url }` a `{ [catalogo]: { [idioma]: url } }`. El conjunto de idiomas se descubre en tiempo de ejecución a partir de lo que Marketing escriba/suba — añadir un idioma nuevo no requiere ningún cambio de código. En Solicitudes, "Ver instrucciones" solo se muestra si existe PDF para el idioma elegido (se oculta si no, nunca muestra uno incorrecto) |

## Usuarios — Fase 4

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| USR-01 | Botón "Nuevo usuario" solo para rol admin (ni siquiera marketing) | Implementada | 4 | Marketing puede editar pero no crear |
| USR-02 | Filtros: nombre/email/código, rol, estado activo/inactivo | Implementada | 4 | `filterPerfiles()` |
| USR-03 | Tarjetas de estadísticas por rol (solo usuarios activos) | Implementada | 4 | Colores fijos por rol — `statsPorRol()`/`ROL_COLORS` |
| USR-04 | Fila de usuario inactivo con opacidad reducida | Implementada | 4 | — |
| USR-05 | Badge de estado con color semántico | Implementada | 4 | — |
| USR-06 | Campo de contraseña solo visible al crear, nunca al editar | Implementada | 4 | No se puede resetear contraseña desde este modal |
| USR-07 | Edición actualiza solo nombre/rol/código (no email ni contraseña) | Implementada | 4 | El campo email se deshabilita visualmente al editar (mejora de claridad, sin cambiar el guardado: en el original el campo era editable pero el valor tecleado se descartaba en silencio igual) |
| USR-08 | Creación vía Edge Function `create-user` (Service Role Key) | Implementada | 4 | `crearUsuario()` llama a la Edge Function con el token de sesión del usuario, igual que el original — la service_role solo se usa dentro de la función, nunca en código Next.js que responde a una petición |
| USR-09 | Validaciones al crear: contraseña ≥8 caracteres, código obligatorio | Implementada | 4 | — |
| USR-10 | Mensaje de estado intermedio "Creando usuario..." | Implementada | 4 | — |
| USR-11 | Activar/desactivar con un solo clic, sin confirmación | Implementada | 4 | `toggleUsuario()` |
| USR-12 | Importación masiva de usuarios desde Excel/CSV | Implementada | 4 | `parseImportRows()` — detecta cabecera automáticamente; columnas fijas por posición (email, nombre, password, rol, código) — **no es importación de solicitudes** |
| USR-13 | Validación de roles permitidos en importación | Corregido (ver H-13) | 4 | Se amplía la lista a los roles reales de la app (con sufijo de canal + responsable_diseno), sin quitar ninguno de los que el original ya aceptaba; sigue sin bloquear el resto de la importación si una fila tiene rol inválido, igual que el original |
| USR-14 | Previsualización limitada a 10 filas con "...y N más" | Implementada | 4 | — |
| USR-15 | Import fila a fila con progreso en vivo, continúa si una fila falla | Implementada | 4 | En vez de llamar directamente a `/auth/v1/admin/users` (que exige `service_role`, nunca disponible en código Next.js que responde a una petición de usuario — docs/02-arquitectura.md § 2.6/2.7), cada fila pasa por la misma Edge Function `create-user` que la creación individual (USR-08); el progreso en vivo es real (bucle en el cliente con un `await` por fila), no simulado |

## Panel global y exportación — Fase 5

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| PAN-01 | Filtro de responsables restringido a su propio colectivo de comerciales | Implementada | 5 | `filterPanelRows()` — solo `comercial_nacional`/`comercial_exportacion`, sin el fallback por `canal` que sí tiene el filtro de "Mis solicitudes" (son dos reglas distintas en el original, preservadas por separado) |
| PAN-02 | Búsqueda combinada (SAP, empresa, código/nombre de comercial) | Implementada | 5 | — |
| PAN-03 | Archivadas ocultas por defecto, visibles solo con filtro explícito | Implementada | 5 | Mismo patrón en la tabla comercial (Fase 2) |
| PAN-04 | Ordenación de columnas clicable con toggle asc/desc | Implementada | 5 | `sortPanelRows()` |
| PAN-05 | Ordenación especial de la columna "comercial" por nombre del perfil relacionado | Implementada | 5 | — |
| PAN-06 | Columna "Campos incompletos" en rojo / "✓ Completa" en verde | Implementada | 5 | `missingFields()`, con los catálogos de LA CAMPAÑA DE CADA SOLICITUD, no una lista global |
| PAN-07 | Exportación a Excel: hoja "Portadas" + hoja "Resumen" | Implementada | 5 | `buildWorkbook()` (ExcelJS, generado en el cliente igual que el original) |
| PAN-08 | Columnas dinámicas por catálogo (9 o 10 si tiene diseño propio/precios) | Implementada | 5 | `buildExportRows()` |
| PAN-09 | Exclusión de archivadas del export | Implementada | 5 | — |
| PAN-10 | Formato visual del Excel (colores por catálogo, zebra striping, filas rojas si incompleta, celda verde si confirmada, congelado de 3 filas) | Implementada | 5 | — |
| PAN-11 | Hoja "Resumen" con 6 métricas | Implementada (replicado tal cual, decisión pendiente) | 5 | La hoja Resumen calcula sus métricas sobre TODAS las solicitudes, no sobre las filtradas por la campaña seleccionada (que sí usa la hoja "Portadas") — inconsistencia real del original, replicada tal cual mientras no haya una decisión explícita en contra (docs/08-protocolo-validacion.md § 8.7) |
| PAN-12 | Nombre de archivo `{campaña}_{fecha}.xlsx` | Implementada | 5 | `exportFilename()` — espacios reemplazados por guion bajo |
| PAN-13 | Botón "Auto-adjudicar" disponible en el panel | Implementada | 5 | `computeAdjudicaciones()`/`autoAdjudicar()` — opera sobre todas las solicitudes en `en_revision_marketing` del sistema, sin acotar por campaña (igual que el original: el nombre de la campaña activa solo se usa en el texto del diálogo de confirmación) |
| PAN-14 | Selectores de campaña sincronizados con el resto de la app | Implementada | 5 | Comparte la cookie de sesión de CAMP-15 |
| PAN-15 | Filtro de estado con el mismo comportamiento especial de archivadas que el resto de tablas | Implementada | 5 | — |
| PAN-16 | Mini-stats del panel (8 tarjetas: Total/Borrador/Enviadas/En revisión de Marketing/En diseño/En revisión del cliente/Confirmadas/Incompletas) | Implementada | 5 | Corregido durante el barrido de paridad visual (2026-08-04): se había omitido por completo en el bloque original de Panel Global. `panelStats()` réplica `renderStats()` (~2395-2414) — filtra SOLO por la campaña seleccionada, independiente del resto de filtros de la tabla (búsqueda/estado/comercial/provincia), igual que el original calcula sobre `allSolicitudes` en vez de sobre las filas ya filtradas. Añadida también la regla CSS `.stats-row` (grid `repeat(auto-fit,minmax(140px,1fr))`) que faltaba en `globals.css` — Usuarios la usaba con un `display:flex` de repuesto porque la regla real nunca se había portado; se limpia esa clase también para que use el grid real |

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
| UI-03 | `showAlert` genérico inyectado por ID de contenedor | Implementada | 1/2/4 | Sin una función global equivalente (no hace falta: cada modal es su propio componente) — cada llamador real de `showAlert()` en el original (`user-alert`, `campana-alert`, `import-alert`) tiene su equivalente en React: estado `error`/`info` propio + `<div className="alert alert-error/alert-info">`, en `UsuarioModal`, `CampanaForm` (vía `formAlert` de `useToast`) e `ImportarUsuariosModal` |
| UI-04 | Formateo de fecha localizado `es-ES` | Implementada | 1/2 | `fmtDate()` en `shared/domain/format.ts`, con test unitario — en uso en la tabla "Mis solicitudes" (Bloque 1) |
| UI-05 | Formateo de número con separador de miles español | Validada | 1 | `fmtNum()` en `features/dashboard/domain/dashboard-stats.ts`, con test unitario — ya en uso en las tarjetas KPI del Dashboard |
| UI-06 | Sistema de archivos adjuntos por categoría con deduplicación por nombre+tamaño | Implementada | 2 | `FileDropZone` (logo/diseño propio del formulario) — dedup por nombre+tamaño al añadir |
| UI-07 | Múltiples zonas de drag&drop con implementación duplicada por zona (logo, catálogo, diseño propio, diseño en detalle, modificación, covers de campaña, carga masiva) | Pendiente | 2 y 3 | Sin abstracción común hoy — cada zona sigue con su propia implementación (`FileDropZone` para logo/diseño propio del formulario, y una zona propia para diseño en detalle/modificación/carga masiva/covers de campaña, cada una con su propia variante visual y reglas de eliminación) — se podría unificar en Next.js **sin cambiar el comportamiento observable** de cada una, pero no es necesario para la paridad funcional |
| UI-08 | Previsualización de archivo único con opción "Quitar" (modal de modificación) | Implementada | 2 | Zona de arrastrar/soltar con previsualización ✅ nombre+KB y botón "✕ Quitar", igual que `setModifFile()` |
| UI-09 | Previsualización de múltiples archivos con chip y eliminación individual | Implementada | 2 | `FileDropZone` (chips + ✕ por archivo) y `CargaMasivaModal` (lista con ✕ por archivo). La zona de "Subir diseño" del detalle muestra lista de archivos pero **sin** eliminación individual — fiel al original, que tampoco la tiene ahí (`updateDisenoZone()`) |
| UI-10 | Selector de impersonación de rol (solo admin) | Validada | 1 | Estado de cliente en `AppShell` (`useState`) para el nav, igual que el original; además escribe una cookie (`impersonated_rol`) + `router.refresh()` para que el Dashboard (bloque siguiente, ya construido) recalcule sus datos con el rol impersonado — sin esto, impersonar habría cambiado el nav sin cambiar ningún dato. La sesión real y sus permisos de RLS no cambian en ningún caso, igual que en el original |
| UI-11 | Restauración forzada del rol real al cerrar sesión durante impersonación | Validada | 1 | Al ser estado de React (no persistido), cerrar sesión / recargar la página lo descarta automáticamente — no puede quedar "atascado" entre sesiones |
| UI-12 | Sincronización en tiempo real vía WebSocket manual (protocolo Phoenix) | Implementada | 2 | Suscrito a `solicitudes` y `notificaciones`; sustituido por el canal Realtime de `supabase-js` (`RealtimeSync`, `NotifBell`) manteniendo el mismo resultado observable — requiere Realtime habilitado en ambas tablas, ver `03-modelo-datos.md` § 3.4.4 |
| UI-13 | Reconexión automática tras cierre del WebSocket (espera 5s) | Implementada (delegada a la librería) | 2 | La reconexión la gestiona `supabase-js` internamente, no un `setTimeout` propio — mismo resultado observable |
| UI-14 | Fallback automático a polling si falla el WebSocket | Implementada | 2 | `RealtimeSync` cae a sondeo si el canal termina en `CHANNEL_ERROR`/`TIMED_OUT`/`CLOSED` |
| UI-15 | Polling de respaldo cada 30s con debounce de 2s contra actualizaciones realtime recientes | Implementada | 2 | `debeActualizar()`, compartido entre la vía realtime y la de sondeo |
| UI-16 | Debounce global de 2s entre recargas de datos | Implementada | 2 | Mismo `lastUpdateRef` para ambas vías dentro de `RealtimeSync` |
| UI-17 | Toast sutil "↻ Datos actualizados" tras recarga disparada por evento realtime (no tras polling) | Implementada | 2 | Indicador propio (no el sistema de toasts general), igual que `showRealtimeToast()` — solo se muestra en la vía realtime, nunca en sondeo |
| UI-18 | Dos canales de suscripción realtime independientes (solicitudes vs notificaciones) | Implementada | 2 | `RealtimeSync` (`solicitudes`, refresca la página + aviso) y `NotifBell` (`notificaciones`, solo recarga la lista) |

---

## Hallazgos a verificar — posibles bugs heredados (protocolo en `08-protocolo-validacion.md` § 8.7)

Registro vivo de comportamientos de `index.html` que parecen incorrectos, incompletos o no intencionados. Ninguno se implementa en el sistema nuevo (ni "tal cual" ni "corregido") sin que la fila tenga una **Decisión** distinta de "Pendiente". Se amplía según aparezcan nuevos durante la implementación de cualquier fase, no solo durante el diseño.

### H-01 (USR-15) — Importación masiva de usuarios podría no funcionar hoy

- **Comportamiento original**: `confirmImport` (~5732) llama a `POST {SUPA_URL}/auth/v1/admin/users` usando como `Authorization` el `access_token` de la sesión del usuario, o la clave pública (`SUPA_KEY`) como fallback si no hay sesión — un endpoint administrativo que normalmente exige `service_role`. Esta parte del hallazgo queda **superada por el rediseño**: la migración ya no llama a ese endpoint directamente (USR-08/USR-15) — tanto la creación individual como la importación masiva pasan por la Edge Function `create-user`, que es la única pieza con `service_role` (docs/02-arquitectura.md § 2.6/2.7). No hace falta verificar el comportamiento del original en producción porque no se replica su forma de llamar al Admin API.
- **Regresión propia detectada (2026-08-04) al probar la importación real**: síntoma reportado — "Importación completada: 0 creados, 124 errores", sin ninguna petición de inserción ni error visible en los logs de Supabase, y sin ninguna excepción en la consola del navegador. Causa exacta localizada por comparación línea a línea con el original: `crearUsuario()` (`features/usuarios/application/crear-usuario.action.ts`) incluía dos comprobaciones bloqueantes — contraseña de mínimo 8 caracteres y código obligatorio — copiadas de `saveUser()` (~3756-3757, válidas para el modal de creación individual). El `confirmImport()` original (~5732-5765) NUNCA aplicaba esas dos comprobaciones: enviaba lo que hubiera en el Excel tal cual al Admin API. Al unificar creación individual e importación masiva en la misma Server Action (USR-15), esas dos guardas heredadas hacían fallar el 100% de las filas de cualquier import con alguna contraseña de menos de 8 caracteres o con la columna de código vacía — **antes de la primera llamada de red**, lo que explica la ausencia total de tráfico en los logs de Supabase. Y como `crearUsuario` es un Server Action, ese `return` ocurre en el servidor, nunca en el navegador — de ahí que la consola del cliente no mostrara ninguna excepción.
- **Decisión**: Corregido (2026-08-04) — las dos comprobaciones se quitan de la Server Action compartida (siguen existiendo, intactas, como pre-check de UI en `UsuarioModal`, que es lo único que replica `saveUser()`); `crearUsuario` ahora solo exige nombre+email+password no vacíos, igual que exige la propia Edge Function para poder llamar a `auth.admin.createUser`. Se añade además `console.error` con el detalle completo en los dos puntos de fallo de la Server Action (respuesta no-OK de la Edge Function; excepción al invocarla) y `console.warn` por fila fallida en el bucle de importación — mismo `console.warn('Import error for', u.email, e.message)` que ya tenía el `confirmImport()` original y que esta migración no había replicado.

### H-02 (PAN-11) — Hoja "Resumen" del Excel no está filtrada por campaña

- **Comportamiento actual**: en `exportExcel` (~3989-3999), las métricas de la hoja "Resumen" (total, completas, incompletas, confirmadas) se calculan sobre `allSolicitudes` (todas las campañas), mientras que la hoja principal "Portadas" usa `exportSols`, ya filtrado por la campaña seleccionada en el export.
- **Por qué se sospecha bug**: son dos fuentes de datos distintas dentro del mismo archivo exportado para la misma acción del usuario ("exportar esta campaña") — lo esperable es que ambas hojas describan el mismo conjunto de datos.
- **Decisión**: Pendiente.

### H-03 (NOT-12) — La preferencia de notificación no filtra ningún envío

- **Comportamiento actual**: `notif_preferencia` (ambas/email/herramienta/ninguna) se guarda por usuario y se muestra en la UI, pero `enviarNotificacion` inserta la notificación igual para todos los destinatarios sin consultar esa preferencia. **Detalle exacto confirmado durante la reconciliación del esquema (`03-modelo-datos.md` § 3.4.3)**: `enviarNotificacion` escribe `enviado`/`enviado_at` como `n.solo_herramienta ? true/now() : false/null`, pero la función `push()` que construye cada notificación nunca asigna la propiedad `solo_herramienta` — la condición es siempre falsa, así que `enviado` es siempre `false` y `enviado_at` siempre `null`, para toda notificación, sin excepción.
- **Por qué se sospecha bug**: existe un control de UI completo (selector, guardado, sincronización entre dos pantallas) y hasta la lógica de escritura condicional en el backend (`solo_herramienta ? ... : ...`) para una preferencia que nunca llega a tener ningún efecto observable — todo el cableado está a medio hacer, falta exactamente el paso que asignaría `solo_herramienta` a partir de `notif_preferencia` del destinatario. No parece una decisión de diseño deliberada.
- **Decisión**: Corregido (2026-08-04) — decisión explícita del propietario del proyecto: implementar la preferencia por completo, gobernando todo el sistema de notificaciones a partir de ahora (no replicar el gap). Ver NOT-12 y `resolverEntrega()`.

### H-04 (NAV-13) — Escape no cierra los modales creados dinámicamente

- **Comportamiento actual**: el listener de Escape (~4020-4028) solo conoce una lista fija de IDs de modal predefinidos en el HTML; los modales creados por JS en tiempo de ejecución (asignar canal, asignar diseñador, carga masiva) no están en esa lista y Escape no los cierra.
- **Por qué se sospecha bug**: es más probable que sea un descuido al añadir esos modales dinámicos después de escribir el listener, que una decisión deliberada de que esos tres modales concretos se comporten distinto al resto.
- **Decisión**: Corregido (2026-08-04) — mismo criterio que H-08 a H-13 (defecto objetivo, no ambigüedad de negocio): el cierre con Escape se implementa de forma uniforme para los 6 modales de la aplicación (`shared/ui/use-escape-to-close.ts`), sin distinguir predefinidos de dinámicos.

### H-05 (AUT-14) — Fallo silencioso de `initApp` tras el login

- **Comportamiento actual**: si `initApp()` lanza una excepción tras un login correcto, el código solo oculta el loader y hace `console.error`, sin mostrar ningún mensaje al usuario — la app podría quedarse en un estado inconsistente sin que la persona sepa por qué.
- **Por qué se sospecha bug**: cualquier otro error de la app (login, guardado, subida de archivo) sí muestra un toast o alerta; que este en concreto no lo haga rompe el patrón del resto del código.
- **Decisión**: Corregido (2026-08-04) — decisión explícita del propietario del proyecto: no replicar el fallo silencioso, mucho mejor UX mostrar un mensaje claro con reintento. Ver AUT-14 (`src/app/(app)/error.tsx`).

### H-06 (USR-13) — Roles aceptados en la importación no cubren todos los roles reales

- **Comportamiento actual**: `processImportFile` (~5695) solo acepta `comercial, marketing, disenador, admin` como roles válidos; no incluye `comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion` ni `responsable_diseno`, que sí existen y se usan en el resto de la aplicación.
- **Por qué se sospecha bug**: parece una lista de roles desactualizada (probablemente escrita antes de que se introdujeran las variantes de canal), no una restricción intencionada de qué roles se pueden crear por Excel.
- **Decisión**: Corregido (2026-08-04) — mismo hallazgo que H-13 (misma lista de roles, mismo código de origen); ver la corrección allí (`VALID_IMPORT_ROLES` en `features/usuarios/domain/import.ts`).

### H-07 (NAV-02/NAV-03) — Los roles legacy genéricos `comercial`/`responsable` (sin sufijo de canal) no ven ningún botón de navegación

- **Comportamiento actual**: `buildNav()` (~1900-1922) decide qué botones mostrar con `isComercial = ['comercial_nacional','comercial_exportacion'].includes(rol)` e `isResp = ['responsable_nacional','responsable_exportacion'].includes(rol)` — ninguna de las dos listas incluye los valores genéricos `comercial` o `responsable`. Como además `isAdmin`/`isMarketing`/`isDiseño`/`isRespDis` tampoco los cubren, `items` queda vacío para estos roles y `if (items.length > 0) showPage(items[0].id)` no se ejecuta: el usuario se autentica correctamente pero la zona principal de la app queda completamente vacía, sin ningún botón para navegar a ninguna página (ni siquiera Dashboard, aunque `loadData()` sí calcula sus datos para `responsable` en algunos casos — ver ~1942/~1954 — solo que no hay forma de llegar a verlos).
- **Por qué se sospecha bug**: es el mismo patrón ya confirmado y aceptado como hipótesis en la política `comercial_solo_sus_solicitudes` de producción (`03-modelo-datos.md` § 3.4.1) — código escrito para los roles genéricos originales que quedó desactualizado cuando se introdujeron las variantes `_nacional`/`_exportacion`, sin que alguien volviera a añadir el valor genérico a todas las listas relevantes. El tratamiento es además inconsistente dentro del propio `index.html`: `loadData()` sí trata a `responsable` como válido en dos condiciones (líneas 1942 y 1954) mientras que `buildNav()` no lo trata en ninguna — mismo rol, comportamiento distinto según el archivo de código que se mire.
- **Decisión**: Cerrado (2026-08-04) — confirmado por el propietario del proyecto sobre logs reales de Supabase: no existe ningún usuario con `rol = 'comercial'` ni `rol = 'responsable'` sin sufijo; los únicos roles reales son `comercial_nacional`, `comercial_exportacion`, `responsable_nacional`, `responsable_exportacion`, `responsable_diseno`, `marketing`, `disenador` y `admin`. Se elimina todo el código de compatibilidad con esos dos roles legacy: `VALID_IMPORT_ROLES`/`parseImportRows` (H-13, ya no cae a `comercial` por defecto), `ROL_LABELS`/`ROL_COLORS`/`USER_STAT_LABELS`, `comercialesFiltro` (Panel Global), `muestraFiltroComercial`/`comercialesFiltroMisSolicitudes` (Mis solicitudes), y las 3 policies de `solicitudes` que aún mencionaban `responsable` (migración `20260804000200_remove_legacy_role_support.sql`, ver `03-modelo-datos.md` § 3.4.1). `getNavItemsForRole` no necesitaba cambios: ya excluía correctamente ambos roles, réplica fiel de que `buildNav()` no les da ningún botón.

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

### H-12 (CAMP-05) — "Usar como activa" nunca sobrevive a la recarga que la propia función dispara

- **Comportamiento actual**: `setActiveCampana(id)` (~5067-5074) asigna `activeCampana = c` y en la línea siguiente hace `await loadAndRenderCampanas()`. Esa función llama internamente a `populateCampanaFilter()` (~2155-2191), que resetea `_defaultCampanaId` y termina con `activeCampana = defCamp` usando el resultado de `getDefaultCampanaId()` — el algoritmo puro (campaña activa con `fecha_cierre` más lejana), no la elegida por el usuario. El toast final ("Campaña X establecida como activa.") siempre se muestra, pero la asignación que lo precedía ya ha sido sobrescrita: la elección del usuario no sobrevive ni un ciclo de renderizado salvo que coincida por casualidad con el default algorítmico (y si coincidiera, el botón ni se habría mostrado, porque solo aparece para campañas activas que no son ya la seleccionada).
- **Por qué se sospecha bug**: no es una interpretación, es mecánico — la propia función deshace en su segunda línea lo que hizo en la primera, sin ninguna condición que lo evite. No hay ninguna razón funcional para ofrecer un botón "Usar como activa" que nunca tiene efecto observable más allá del toast.
- **Decisión**: Corregido (2026-08-04) — la selección de campaña activa se guarda en una cookie de sesión (mismo patrón que la impersonación de rol) que sí persiste entre recargas, y la usan por igual los 4 selectores de la app (CAMP-15): Campañas, Solicitudes, Diseño y Dashboard.

### H-13 (USR-13) — La lista de roles válidos para importar usuarios no coincide con los roles reales de la aplicación

- **Comportamiento actual**: `processImportFile()` (~5695) define `validRoles = ['comercial','marketing','disenador','admin']`. Ningún comercial ni responsable real usa el rol genérico `comercial` (H-07: sin nav propio) — los roles que de verdad dan acceso funcional son `comercial_nacional`/`comercial_exportacion`/`responsable_nacional`/`responsable_exportacion`/`responsable_diseno`, ninguno de los cuales está en esta lista. Importar una fila con cualquiera de esos roles reales la marcaba en rojo como "no válida" (aunque igualmente se intentaba crear, ~5697-5699).
- **Por qué se sospecha bug**: la lista no se actualizó cuando el resto de la aplicación introdujo los roles con sufijo de canal — es la misma clase de desajuste que H-06 (importación de usuarios), no una decisión de negocio: no hay ningún escenario en el que "marcar como inválido un comercial de exportación real" sea el comportamiento deseado.
- **Decisión**: Corregido (2026-08-04) — `VALID_IMPORT_ROLES` añade los roles reales que faltaban. **Actualizado el mismo día tras el cierre de H-07**: el rol legacy `comercial` genérico se retira también de esta lista (ya no existe ningún usuario real con ese rol) y ya no es el valor por defecto de una fila sin rol — una fila con la columna de rol vacía se deja vacía y `rolValido` la marca como inválida, en vez de crear en silencio un usuario con un rol legacy inexistente. El resto del comportamiento se preserva tal cual: una fila con rol inválido sigue sin bloquear la importación del resto.

### H-14 (USR-12) — `openImportModal()` no se llama desde ningún sitio: la importación masiva de usuarios es inalcanzable en el original

- **Comportamiento actual**: `#modal-import-users`, `processImportFile()` y `confirmImport()` están completos en `index.html`, pero `openImportModal()` (la única función que abre ese modal) no tiene ningún `onclick` ni ningún otro llamador en todo el archivo — se confirmó con una búsqueda exhaustiva de `openImportModal(` en el fichero completo, un único resultado: la propia definición de la función. La única forma teórica de disparar esta importación sería tecleando `openImportModal()` en la consola del navegador; ningún usuario real de la aplicación puede llegar a ella desde la interfaz.
- **Por qué se sospecha bug**: es una funcionalidad completa (UI, parseo de Excel, progreso en vivo, incluso su propio botón de confirmación con estilos) a la que sencillamente le falta el botón que la abre — no hay ninguna razón de negocio para construir toda esa pantalla y luego no exponerla.
- **Decisión**: Corregido (no era necesario decidir nada): la migración ya construyó y expone un botón real ("📊 Importar", visible para admin y marketing en `UsuariosPageClient`) que abre `ImportarUsuariosModal` — accesible desde el primer día de esta funcionalidad en la migración (Fase 4), antes de detectarse que el original nunca la exponía. No hay ningún motivo para retirarlo y replicar el original inalcanzable: sería una regresión pura, sin ninguna ventaja.

Ninguna fase que module estas funcionalidades (Fase 5 para H-02) cierra su checklist mientras su hallazgo correspondiente siga con Decisión "Pendiente". H-01, H-04 a H-14 (salvo H-02) ya están corregidos y no bloquean ninguna fase. H-02 sigue genuinamente pendiente de una decisión funcional del propietario del proyecto (¿la hoja "Resumen" debe filtrarse también por la campaña del export, o se mantiene tal cual?).

## Barrido de paridad visual (2026-08-04)

Revisión sistemática, página por página, de textos, iconos, tooltips, orden de botones, colores, espaciados, responsive y coherencia visual contra `index.html`, a petición explícita del propietario del proyecto. Diferencias objetivas encontradas y corregidas (además de H-14, que también salió de este barrido):

- **Layout/nav**: orden del hamburguesa en la topbar (iba al final, debía ir primero, como en `.topbar-right`); sin feedback de `:hover` en "Mi cuenta" y "Cerrar sesión" (el original lo tenía vía `onmouseover`/`onmouseout`); sin `:hover` en las filas del panel de notificaciones; margen inferior duplicado en el subtítulo del Dashboard.
- **Campañas**: cabecera "Cierre" renombrada a "Fecha cierre" sin motivo; layout de la fila de cabecera distinto (gap/wrap/alineación); subtítulo de la página con otro texto; encabezado "Solicitudes" centrado cuando el original solo centra el cuerpo; catálogos del modal en mayúsculas cuando el original los escribe en minúscula/mayúscula normal ("Roly", "Stamina"...); orden/mayúscula de "PDF cargado · Ver · Sube otro para reemplazar"; margen superior de sobra en el campo Estado.
- **Solicitudes (formulario y detalle)**: cabeceras de catálogo en texto plano cuando el original pinta el logo de marca (Roly/Roly WRK/Stamina); radios "Sí"/"No" cuando el original usa "SI"/"NO"; "Con precios"/"Sin precios" cuando el original usa "CON PRECIOS"/"SIN PRECIOS".
- **Diseño**: título/subtítulo en fila propia en vez de compartir la fila con los botones y filtros (como en el original); orden de las estadísticas por diseñador respecto a esa fila (el original las pinta después, no antes); instrumentación de diagnóstico temporal de la incidencia de Storage (ya cerrada) sin retirar.
- **Panel Global**: faltaba por completo la fila de mini-stats (`renderStats()`, 8 tarjetas) — nunca se había construido en el bloque original de Fase 5.
- **Usuarios**: sin hallazgos de texto/color: se documenta H-14 (importación inalcanzable en el original) en la sección de hallazgos, no aquí, porque no es una diferencia visual sino un botón que faltaba en el original.
- **Perfil**: el mensaje "Datos actualizados correctamente." se mostraba en azul (`alert-info`) cuando el original lo muestra en verde (`alert-ok`/`alert-success`) — solo el aviso de confirmación de email debía ser azul.
- **CSS compartido**: faltaba la regla `.stats-row` (grid) en `globals.css` — nunca se había portado porque ninguna página la necesitó hasta ahora; Usuarios la compensaba con un `display:flex` inline que ya no hace falta.
