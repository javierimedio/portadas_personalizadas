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
| — | Filas con fase mixta (NAV-06, NOT-11, UI-07) | 3 |
| **Total** | | **~230** |

*(Contados fila a fila al redactar este documento; se recuentan de verdad cada vez que se añada o cierre una fila — es un recuento vivo, no una cifra fija.)*

---

## Autenticación y sesión — Fase 1

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| AUT-01 | Login con email/contraseña | Validada | 1 | Valida que ambos campos no estén vacíos antes de llamar a Supabase (`doLogin`, ~1714) — `login.action.ts` |
| AUT-02 | Mensaje de error de login genérico | Validada | 1 | Cualquier error de Supabase se traduce siempre a "Correo o contraseña incorrectos", sin exponer el mensaje real del backend — preservar, no "mejorar" el mensaje |
| AUT-03 | Botón de login con spinner inline | Validada | 1 | Sustituye el texto "Entrar" por "Entrando…" mientras la petición está en curso (`useActionState`, sin spinner gráfico — mismo propósito funcional, distinto detalle visual) |
| AUT-04 | Logout con restauración de impersonación | Pendiente | 1 | Implementado el cierre de sesión básico (`logout.action.ts`); la restauración de impersonación llega con el selector "Ver como rol" en el bloque de Layout/topbar — no marcar como completa hasta entonces |
| AUT-05 | Mostrar formulario de recuperación de contraseña | Validada | 1 | Enlace "¿Olvidaste tu contraseña?" revela un formulario oculto por defecto |
| AUT-06 | Solicitar enlace de recuperación (anti-enumeración) | Validada | 1 | Responde siempre "Si el correo existe, recibirás un enlace..." exista o no el email — preservar este comportamiento de seguridad |
| AUT-07 | Flujo de recuperación vía deep-link (`#access_token=...&type=recovery`) | Validada | 1 | Next.js usa el patrón PKCE recomendado por `@supabase/ssr` (`?code=...` + `/auth/confirm`) en vez del hash `#access_token=...` original — cambio de implementación, no de comportamiento observable: misma pantalla dedicada de "Nueva contraseña", mismo mensaje de token inválido |
| AUT-08 | Validación de nueva contraseña en recuperación | Validada | 1 | Mínimo 8 caracteres y ambos campos deben coincidir, con mensajes específicos por caso |
| AUT-09 | Redirección temporizada tras recuperación exitosa | Validada | 1 | A los 2s redirige a `/login` tras el éxito |
| AUT-10 | Persistencia de sesión en localStorage | Validada | 1 | Sustituida por cookies de `@supabase/ssr` gestionadas por el middleware — resultado observable equivalente (sesión persiste tras recargar) |
| AUT-11 | Verificación de validez de token al arrancar | Validada | 1 | `supabase.auth.getUser()` en el middleware revalida el token contra Supabase en cada petición |
| AUT-12 | Fallback a clave pública si no hay sesión | Pendiente | 1 | No es un entregable de este bloque — el resultado (acceso denegado por RLS) ya está garantizado desde la Fase 0, se valida junto al resto |
| AUT-13 | Pantalla de carga con mensajes de progreso | No aplicable | 1 | Aprobado por el usuario (2026-08-03): en el SPA original, "Verificando sesión..."/"Cargando perfil..." cubren el hueco entre pintar la página vacía y que el cliente resuelva la sesión de forma asíncrona. En SSR ese hueco no existe — el servidor ya resuelve la sesión y el perfil antes de generar la respuesta, así que no hay ningún estado intermedio que el usuario pueda llegar a ver. No es una funcionalidad perdida, es un paso de la arquitectura anterior sin momento equivalente en la nueva |
| AUT-14 | Fallo silencioso de `initApp` tras login | Pendiente | 1 | Si falla la inicialización, solo se oculta el loader y se loguea en consola, sin error visible — **caso límite deliberadamente ambiguo**: confirmar si se preserva tal cual (posible bug latente) o se decide corregir como parte de la migración (violaría el principio inamovible salvo decisión explícita) |
| AUT-15 | Preferencia de notificación en topbar sincronizada con Perfil | Pendiente | 1 | Ver también PERF-11; el valor se guarda pero no filtra ningún envío real (ver NOT-12) |

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
| NAV-13 | Cierre de modales predefinidos con Escape | Pendiente | 1 | Sin relación con Layout/nav — pertenece a los modales de Solicitudes/Usuarios/Campañas, todavía no migrados |
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
| SOL-01 | Código SAP obligatorio, normalizado a mayúsculas | Pendiente | 2 | — |
| SOL-02 | Nombre de empresa normalizado a mayúsculas | Pendiente | 2 | — |
| SOL-03 | Idioma obligatorio (25 opciones fijas) | Pendiente | 2 | Español + 24 idiomas europeos |
| SOL-04 | Provincia condicional al idioma | Pendiente | 2 | Select de 54 provincias si idioma=Español (obligatorio); texto libre y opcional para el resto |
| SOL-05 | Normalización de idioma capitalizado al reeditar | Pendiente | 2 | El idioma se guarda en mayúsculas pero el select espera capitalizado — detalle de implementación a preservar |
| SOL-06 | Comentarios generales opcionales | Pendiente | 2 | Solo se muestra en detalle si no está vacío |
| SOL-07 | Selector de campaña en el formulario (solo activas o la propia si está cerrada) | Pendiente | 2 | Marca "(cerrada)" si aplica |
| SOL-08 | Recalculo de catálogos al cambiar de campaña en el formulario | Pendiente | 2 | **Caso límite**: pierde datos no guardados de catálogos ya rellenados si se cambia de campaña a mitad de formulario — preservar tal cual salvo decisión explícita |
| SOL-09 | Bloqueo de creación en campaña cerrada | Pendiente | 2 | Toast + redirección a pestaña Campañas |
| SOL-10 | Revalidación de cierre de campaña al guardar | Pendiente | 2 | Doble check por si la campaña cerró entre apertura del modal y el guardado |
| SOL-11 | Detección de código SAP duplicado en la misma campaña | Pendiente | 2 | Solo al crear, no al editar |
| SOL-12 | Campo canal+comercial asignado solo visible para admin/marketing | Pendiente | 2 | Para el resto de roles, `comercial_id` se autoasigna al usuario actual |
| SOL-13 | Cascada canal → lista de comerciales asignables | Pendiente | 2 | Filtra por rol de canal, solo activos, orden alfabético |
| SOL-14 | Mensaje de error acumulado truncado a 3 + "N más" | Pendiente | 2 | — |
| SOL-15 | Guardar como borrador vs enviada con validaciones distintas | Pendiente | 2 | Un borrador puede guardarse vacío; enviar exige validación completa de catálogos |
| SOL-16 | `enviada_at` se fija solo al pasar a "enviada" | Pendiente | 2 | — |
| SOL-17 | Toast final distinto según destino (enviada/borrador) | Pendiente | 2 | Incluye conteo de archivos adjuntados en el caso de envío |
| SOL-18 | Indicador visual de progreso de subida de adjuntos | Pendiente | 2 | — |
| SOL-19 | Log de creación/edición con detalle de estado y SAP | Pendiente | 2 | — |
| SOL-20 | Log por cada adjunto subido | Pendiente | 2 | — |
| SOL-21 | Notificación automática al guardar (si no es borrador) | Pendiente | 2 | Ver módulo Notificaciones |
| SOL-22 | Fallo de subida de un archivo no aborta el resto | Pendiente | 2 | Toast con nombre y código de error, continúa con el siguiente |
| SOL-23 | Badge de campaña distinta en tabla comercial | Pendiente | 2 | Si la solicitud no pertenece a la campaña activa seleccionada |
| SOL-24 | Resumen compacto de catálogo en tablas (`catSummary`) | Pendiente | 2 | "—" / "No" / "{unidades} uds" + chip de portada |
| SOL-25 | Cálculo de campos incompletos (`missingFields`) | Pendiente | 2 | Reglas condicionales por idioma/catálogo/impreso — es la regla de dominio más compleja del sistema, requiere tests unitarios exhaustivos |

## Solicitudes — catálogos — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CAT-01 | Catálogos disponibles dependen de la campaña | Pendiente | 2 | `ALL_CATS` filtrado por el array `catalogos` de cada campaña |
| CAT-02 | Solo Stamina y XMAS tienen "Diseño 100% propio" | Pendiente | 2 | Roly y Roly WRK no la tienen |
| CAT-03 | Toggle maestro "Portada personalizada" con cascada de visibilidad | Pendiente | 2 | — |
| CAT-04 | Toggle "Catálogo impreso" revela campo Unidades obligatorio | Pendiente | 2 | `min=1` |
| CAT-05 | Fila "Con precios" solo visible si idioma=Español y catálogo tiene diseño propio | Pendiente | 2 | Oculta para Roly/Roly WRK y para cualquier idioma no español |
| CAT-06 | Toggle "Diseño 100% propio" oculta preferencias y posición de logo | Pendiente | 2 | Solo Stamina/XMAS |
| CAT-07 | Enlaces "Ver portadas disponibles"/"Ver instrucciones" por catálogo | Pendiente | 2 | Solo si la campaña tiene el PDF correspondiente cargado |
| CAT-08 | Expandir/contraer secciones de catálogo (solo en memoria) | Pendiente | 2 | No persiste en BD |
| CAT-09 | Radios custom (no `<input type=radio>` real) | Pendiente | 2 | Implementados a mano con clases CSS — detalle de implementación a reproducir con un componente real accesible, comportamiento observable idéntico |
| CAT-10 | 3 preferencias de portada por catálogo (1ª obligatoria) | Pendiente | 2 | — |
| CAT-11 | Posición de logo (A/B/C), obligatoria si aplica | Pendiente | 2 | — |
| CAT-12 | Zona de subida de diseño propio Stamina (`.pdf,.ai,.eps`) | Pendiente | 2 | — |
| CAT-13 | Reset completo de secciones al abrir "nueva solicitud" | Pendiente | 2 | — |
| CAT-14 | Restauración completa de catálogos al editar | Pendiente | 2 | Expande automáticamente las secciones con datos |
| CAT-15 | Guardado usa catálogos de la campaña del formulario, no la global activa | Pendiente | 2 | Evita guardar catálogos de otra campaña |
| CAT-16 | `portada_diseno_propio` siempre `false`, nunca `null` | Pendiente | 2 | A diferencia del resto de booleanos del catálogo |
| CAT-17 | Selección de portada final ("Portada elegida") inline | Pendiente | 2 | Solo marketing/admin, solo en `en_revision_marketing`/`en_diseno`, solo si hay preferencia registrada y no es diseño propio |
| CAT-18 | Auto-adjudicación de portadas (`autoAdjudicar`) | Pendiente | 2 | Solo marketing/admin; ordena por antigüedad, asigna 1ª opción libre evitando repetir en la misma provincia; **excluye XMAS del reparto automático** — preservar esta exclusión; usa `confirm()`/`alert()` nativos del navegador |
| CAT-19 | Auto-asignación de diseñador al abrir el detalle | Pendiente | 2 | Si está en `en_diseno` sin `asignado_id` y quien abre es diseñador/responsable_diseno |

## Solicitudes — flujo de estados — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| EST-01 | Máquina de estados completa | Pendiente | 2 | `borrador → enviada → en_revision_marketing → en_diseno ⇄ modificar_diseno → diseno_en_revision_comercial → confirmada`, + `archivada` lateral |
| EST-02 | Botones de acción condicionados por rol+estado en el detalle | Pendiente | 2 | Ver combinaciones completas en el inventario — cada combinación rol×estado debe probarse por separado |
| EST-03 | Guard anti doble-clic en cambio de estado | Pendiente | 2 | Flag global `_cambiarEstadoInProgress` |
| EST-04 | No-op si el estado destino es idéntico al actual | Pendiente | 2 | — |
| EST-05 | Cambio de estado dispara update + log + notificación + recarga + toast, siempre junto | Pendiente | 2 | Debe ser una operación atómica en el nuevo sistema |
| EST-06 | Confirmación nativa antes de archivar, con aviso de exclusión de KPIs/Excel | Pendiente | 2 | — |
| EST-07 | Eliminación de solicitud en cascada manual (catálogos, adjuntos, logs, notificaciones, solicitud) | Pendiente | 2 | Con `confirm()` mostrando el código SAP |
| EST-08 | "Enviar a diseño" sin asignar diseñador | Pendiente | 2 | El primer diseñador que abre la solicitud se autoasigna |
| EST-09 | Modal de asignación de diseñador (overlay dinámico) | Pendiente | 2 | Lista solo diseñadores/responsables activos, preselecciona el ya asignado |
| EST-10 | Notificación al diseñador tras asignación manual | Pendiente | 2 | — |
| EST-11 | Modal "Asignar canal y comercial" (overlay dinámico) | Pendiente | 2 | Bloquea guardado si falta canal o comercial |
| EST-12 | Reapertura automática del detalle tras guardar canal | Pendiente | 2 | — |
| EST-13 | Modal "Solicitar modificación" con comentario obligatorio y adjunto opcional | Pendiente | 2 | — |
| EST-14 | Comentario de modificación concatenado con enlace al adjunto | Pendiente | 2 | Formato `📎 Adjunto: [nombre](url)` dentro del mismo log |
| EST-15 | Historial colapsable con contador dinámico | Pendiente | 2 | "Ver historial (N)" |
| EST-16 | Entradas de log diferenciadas visualmente por tipo | Pendiente | 2 | `cambio_estado` con badges, `comentario` con menciones resaltadas |
| EST-17 | Logs de tipo `adjunto` excluidos de comentarios e historial visual | Pendiente | 2 | Se muestran aparte como archivos |

## Diseño (cola de trabajo) — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| DIS-01 | Tabla de diseño filtrada siempre por `en_diseno`/`modificar_diseno` | Pendiente | 2 | Independiente del rol |
| DIS-02 | Selector de campaña propio de la pestaña Diseño | Pendiente | 2 | — |
| DIS-03 | Filtro por diseñador asignado | Pendiente | 2 | — |
| DIS-04 | Contador de tareas por diseñador con umbral de color (>5 = rojo) | Pendiente | 2 | Umbral hardcodeado, preservar el mismo valor |
| DIS-05 | Columna "Asignado a" con "—" si no hay asignación | Pendiente | 2 | — |
| DIS-06 | Zona de subida de diseño en el detalle | Pendiente | 2 | Solo roles de diseño, solo en estados de diseño |
| DIS-07 | Acumulación de archivos entre múltiples interacciones sin reemplazar | Pendiente | 2 | Hasta confirmar "Diseño listo" |
| DIS-08 | "Diseño listo → Revisión cliente" sube todos los archivos acumulados de golpe | Pendiente | 2 | Si no hay archivos pendientes, solo cambia el estado |
| DIS-09 | Exportación CSV de diseño (`exportDisenoCSV`) | Pendiente | 2 | Separador TAB, BOM UTF-8, columnas fijas `CODIGO,ROLY,WRK,STM,XMAS`; filtrado a tareas propias si el rol es `disenador` |
| DIS-10 | Nombre de archivo CSV con campaña y fecha | Pendiente | 2 | — |

## Carga masiva de diseños — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CM-01 | Modal de carga masiva creado dinámicamente | Pendiente | 2 | — |
| CM-02 | Parseo de nombre de archivo con sufijo de catálogo opcional | Pendiente | 2 | Orden de evaluación importa: `_ROLY_WRK` antes de `_ROLY` para no capturar el sufijo equivocado — replicar el mismo orden exacto |
| CM-03 | Matching de archivo contra solicitud por SAP | Pendiente | 2 | Solo entre solicitudes en `en_diseno`/`modificar_diseno`; 3 estados: `ok`/`notfound`/`nocatalog` |
| CM-04 | Preview con contador "N de M reconocidos" y badges de color | Pendiente | 2 | — |
| CM-05 | Eliminación individual de un archivo de la cola antes de procesar | Pendiente | 2 | — |
| CM-06 | Botón de procesar deshabilitado si no hay archivos reconocidos | Pendiente | 2 | Texto dinámico con el conteo |
| CM-07 | Procesamiento por lotes con un solo cambio de estado por solicitud | Pendiente | 2 | Aunque una solicitud tenga varios archivos, el cambio de estado y el log se disparan una sola vez (`processedSols` Set) |
| CM-08 | Notificación disparada por solicitud, no por archivo | Pendiente | 2 | — |
| CM-09 | Resumen final con conteo de éxitos y errores | Pendiente | 2 | — |

## Comentarios y menciones — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| COM-01 | Detección de `@` en tiempo real con dropdown | Pendiente | 2 | Regex con soporte de acentos/ñ, máximo 6 sugerencias, excluye al propio usuario, solo perfiles activos |
| COM-02 | Inserción de mención al hacer clic en el dropdown | Pendiente | 2 | Reemplaza desde la posición del `@`, añade espacio, reposiciona cursor |
| COM-03 | Atajo Ctrl/Cmd+Enter para enviar comentario | Pendiente | 2 | Solo si el dropdown no está visible |
| COM-04 | Escape cierra el dropdown sin enviar | Pendiente | 2 | — |
| COM-05 | Cierre del dropdown al hacer clic fuera | Pendiente | 2 | — |
| COM-06 | Extracción de menciones al guardar (regex distinta a la de detección en vivo) | Pendiente | 2 | Matching por `includes` sobre nombre o email, no exacto — **dos regex distintas para lo mismo, preservar ambas tal cual, no unificarlas silenciosamente** |
| COM-07 | Notificación a cada mencionado, excluyendo auto-mención | Pendiente | 2 | — |
| COM-08 | Toast diferenciado según si hubo menciones | Pendiente | 2 | — |
| COM-09 | Reapertura automática del detalle tras comentar | Pendiente | 2 | — |
| COM-10 | Resaltado visual de menciones en el listado (regex distinta a las dos anteriores) | Pendiente | 2 | Tercera variante de regex para lo mismo — mismo comentario que COM-06 |

## Notificaciones — Fase 2

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| NOT-01 | Notificaciones in-app sin envío real de email | Pendiente | 2 | Comentario explícito en el código; ver `07-propuestas-futuras.md` § 4 |
| NOT-02 | Destinatarios por transición: enviada/en_revision_marketing | Pendiente | 2 | Marketing+admin y el propio comercial |
| NOT-03 | Destinatarios por transición: en_diseno | Pendiente | 2 | Comercial+marketing/admin y todos los diseñadores/responsables_diseno |
| NOT-04 | Destinatarios por transición: diseno_en_revision_comercial | Pendiente | 2 | Comercial+marketing/admin |
| NOT-05 | Destinatarios por transición: modificar_diseno | Pendiente | 2 | Solo diseñadores |
| NOT-06 | Destinatarios por transición: confirmada | Pendiente | 2 | Comercial+marketing/admin |
| NOT-07 | Destinatarios por transición: vuelta a borrador | Pendiente | 2 | Solo el comercial |
| NOT-08 | Deduplicación de destinatarios por email | Pendiente | 2 | — |
| NOT-09 | Resolución de comercial destinatario aunque la solicitud no esté aún en memoria | Pendiente | 2 | Usa el parámetro explícito como fallback |
| NOT-10 | Carga de perfiles a demanda si no están precargados | Pendiente | 2 | — |
| NOT-11 | Preferencia de notificación por usuario (ambas/email/herramienta/ninguna) | Pendiente | 1 y 2 | Editable desde topbar (Fase 1) y Perfil (Fase 1); consumida — o no — desde el envío de notificaciones (Fase 2) |
| NOT-12 | La preferencia de notificación NO filtra realmente el envío | Pendiente | 2 | **Gap funcional existente hoy**: se guarda el valor pero todas las notificaciones se insertan igual con `enviado:false` — preservar este comportamiento (no implementar el filtrado real, sería una mejora funcional fuera de alcance) |
| NOT-13 | Carga de notificaciones limitada a 7 días / 30 registros | Pendiente | 2 | — |
| NOT-14 | Estado de "leído" en localStorage, no en BD | Pendiente | 2 | Ver `07-propuestas-futuras.md` § 2 |
| NOT-15 | Badge de no leídas con tope visual "9+" | Pendiente | 2 | Oculto si es 0 |
| NOT-16 | Panel lateral con animación y auto-marcado de leídas a los 2s de abrir | Pendiente | 2 | — |
| NOT-17 | Resaltado visual de no leídas (fondo ámbar + negrita) | Pendiente | 2 | — |
| NOT-18 | Truncado del cuerpo a 80 caracteres en el listado | Pendiente | 2 | — |
| NOT-19 | Clic en notificación abre el detalle de la solicitud referenciada | Pendiente | 2 | Recarga la solicitud primero si no está en memoria |

## Campañas — Fase 3

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| CAMP-01 | Cálculo de campaña activa por defecto | Pendiente | 3 | Entre las activas, la de `fecha_cierre` más reciente; si no hay ninguna activa, la primera de la lista general |
| CAMP-02 | Marcador "★" en el selector junto a la campaña por defecto | Pendiente | 3 | — |
| CAMP-03 | Banner de aviso de cierre de campaña (rojo si ya cerró, ámbar si ≤7 días) | Pendiente | 3 | Singular/plural correcto en "1 día" vs "N días" |
| CAMP-04 | Tabla de campañas con badge "ACTIVA" (seleccionada) distinto del flag `activa` (booleano) | Pendiente | 3 | Son dos conceptos distintos — preservar la distinción, no fusionarlos |
| CAMP-05 | Botón "Usar como activa" solo si `activa=true` y no es ya la seleccionada | Pendiente | 3 | — |
| CAMP-06 | Selector de catálogos por checkbox sincroniza filas de subida de PDFs | Pendiente | 3 | `syncCoverCatRows` |
| CAMP-07 | Validación obligatoria de 2 PDFs por catálogo seleccionado | Pendiente | 3 | Mensaje detalla exactamente qué falta por catálogo |
| CAMP-08 | 8 zonas de drag&drop independientes, solo aceptan `.pdf` | Pendiente | 3 | Portadas + instrucciones × 4 catálogos |
| CAMP-09 | Reutilización de archivos existentes al editar (enlace "Ver" + "Sube otro para reemplazar") | Pendiente | 3 | No obliga a resubir |
| CAMP-10 | Nombre de archivo determinista al subir PDFs | Pendiente | 3 | `covers/{campanaId}/{key}_{timestamp}.pdf`, con ID temporal para campañas nuevas sin ID real todavía |
| CAMP-11 | Selector radio custom Activa/Inactiva (flag `activa`) | Pendiente | 3 | Distinto del concepto "seleccionada" de CAMP-04 |
| CAMP-12 | Confirmación nativa antes de fijar una campaña como seleccionada | Pendiente | 3 | — |
| CAMP-13 | Eliminación de campaña en cascada con aviso del nº exacto de solicitudes afectadas | Pendiente | 3 | Borra manualmente catálogos, adjuntos, logs, notificaciones y solicitudes de cada una |
| CAMP-14 | `activeCampana` se limpia a `null` si se elimina la campaña activa | Pendiente | 3 | — |
| CAMP-15 | 4 selectores de campaña sincronizados en toda la app | Pendiente | 3 | Panel global, dashboard, diseño, comercial — un único punto de repoblación |

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
| PERF-01 | Acceso solo desde el botón del topbar, nunca desde el nav | Pendiente | 1 | — |
| PERF-02 | Campos de solo lectura: rol (traducido) y código | Pendiente | 1 | — |
| PERF-03 | Campos editables: nombre y email | Pendiente | 1 | — |
| PERF-04 | Cambio de email requiere confirmación por correo, no se aplica al instante | Pendiente | 1 | — |
| PERF-05 | Validación de formato de email (regex simple) | Pendiente | 1 | — |
| PERF-06 | Validación de nombre no vacío | Pendiente | 1 | — |
| PERF-07 | Cambio de contraseña independiente, con su propio bloque de alertas | Pendiente | 1 | — |
| PERF-08 | Validaciones de contraseña (no vacía, ≥8 caracteres, coincidencia) | Pendiente | 1 | — |
| PERF-09 | Indicador de fortaleza de contraseña en tiempo real (5 niveles) | Pendiente | 1 | Calculado por longitud, mayúsculas/minúsculas, número, carácter especial |
| PERF-10 | Botón de mostrar/ocultar contraseña | Pendiente | 1 | — |
| PERF-11 | Preferencia de notificaciones editable desde Perfil, sincronizada con topbar | Pendiente | 1 | Ver AUT-15/NOT-11/NOT-12 |
| PERF-12 | Botones de guardado con estado deshabilitado + texto de progreso | Pendiente | 1 | "Guardando...", "Actualizando..." |

## UI transversal — Fase 1 (base) y Fase 2 (extensiones específicas de Solicitudes/Diseño)

| ID | Funcionalidad | Estado | Fase | Observaciones |
|---|---|---|---|---|
| UI-01 | Sistema de modales por clase `.open` | Pendiente | 1 | Sin gestión de foco/accesibilidad aparente — oportunidad de mejora a documentar en `07-propuestas-futuras.md` si se decide, no a implementar de paso |
| UI-02 | Toasts de dos tipos (`showToast` neutro, `showFormAlert` de error) | Pendiente | 1 | Autodestrucción a 3s y 6s respectivamente |
| UI-03 | `showAlert` genérico inyectado por ID de contenedor | Pendiente | 1 | Usado en modales de usuario/campaña/import |
| UI-04 | Formateo de fecha localizado `es-ES` | Pendiente | 1 | `dd/mm/yyyy hh:mm` |
| UI-05 | Formateo de número con separador de miles español | Pendiente | 1 | — |
| UI-06 | Sistema de archivos adjuntos por categoría con deduplicación por nombre+tamaño | Pendiente | 2 | — |
| UI-07 | Múltiples zonas de drag&drop con implementación duplicada por zona (logo, catálogo, diseño propio, diseño en detalle, modificación, covers de campaña, carga masiva) | Pendiente | 2 y 3 | Sin abstracción común hoy — en Next.js se puede unificar en un componente reutilizable **sin cambiar el comportamiento observable** de cada zona |
| UI-08 | Previsualización de archivo único con opción "Quitar" (modal de modificación) | Pendiente | 2 | — |
| UI-09 | Previsualización de múltiples archivos con chip y eliminación individual | Pendiente | 2 | — |
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

Ninguna fase que module estas funcionalidades (Fase 4 para H-01/H-06, Fase 5 para H-02, Fase 2 para H-03, Fase 1 para H-04/H-05/H-07) cierra su checklist mientras su hallazgo correspondiente siga con Decisión "Pendiente".
