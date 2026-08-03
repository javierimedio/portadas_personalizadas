# Checklist de validación — Fase 1: Login + Layout + Dashboard

Fecha: 2026-08-03
Entorno de desarrollo comparado: URL de desarrollo (proyecto Vercel + `portadas-personalizadas-dev`), validado directamente por el usuario en navegador
Entorno de producción comparado: `index.html` (lectura directa del código) + comportamiento real de la aplicación

## Funcionalidades migradas

Bloques construidos y validados, uno a uno, por orden:

- [x] **Login + recuperación de contraseña + protección de rutas** (AUT-01 a AUT-15 salvo excepciones documentadas abajo). Validado en la URL de desarrollo: credenciales correctas/incorrectas, persistencia de sesión, protección de rutas, logout, flujo completo de recuperación.
- [x] **Layout y navegación por rol** (NAV-01/02/07/08/10/11/12/14/15, UI-10/11). Todos los roles revisados, pestañas visibles coinciden con `buildNav()`, protección de rutas por rol funcionando, impersonación de rol (admin) cambiando nav y datos del Dashboard a la vez.
- [x] **Dashboard completo** (DASH-01 a DASH-15): KPIs, 7 gráficos, barra de progreso, selector de campaña — validado con el dataset de prueba (`webapp/supabase/seed/dataset-base-desarrollo.sql`).
- [x] **Perfil de usuario** (PERF-01 a PERF-12): datos personales, cambio de contraseña con medidor de fortaleza, preferencia de notificaciones.
- [x] **Paridad visual** de las cuatro pantallas anteriores: sistema de diseño de `index.html` (colores, radios, sombras, tipografía, clases `.card`/`.topbar`/`.nav-btn`/`.btn`/etc.) portado a `webapp/src/app/globals.css` y usado en todo lo anterior. Aprobada por el usuario tras comparar lado a lado con `index.html`.

## Funcionalidades pendientes (no bloquean esta fase — documentado por qué)

- **NAV-03/04/05/06** (contenido real de Solicitudes/Diseño/Campañas/Usuarios/Panel): el *acceso* (nav + guard de servidor) ya está validado; el *contenido* de cada página llega en su propia fase (2, 3, 4, 5).
- **NAV-09/13** (efectos secundarios al entrar en una página, cierre de modales con Escape): dependen de páginas y modales que todavía no existen (Fase 2/3/4).
- **UI-01/03/04** (modales, `showAlert`, formateo de fecha): ningún bloque de esta fase necesitó un modal ni mostró una fecha — se construyen la primera vez que la Fase 2 los necesite de verdad, no antes.
- **UI-02** parcialmente: el toast neutro (`ToastProvider`) ya está construido y en uso; `showFormAlert` (rojo, 6s) todavía no tiene ningún llamador real.

Ninguna de estas es una funcionalidad de la Fase 1 sin terminar — son funcionalidades de fases posteriores que estaban catalogadas en esta sección de la matriz por pertenecer al mismo módulo (Layout/UI transversal), no porque tuvieran que completarse ahora. Ver `09-matriz-paridad-funcional.md` § "Filas con fase mixta".

## Diferencias detectadas (documentación vs código real, o index.html vs arquitectura nueva)

- **responsable_diseno no ve el Dashboard**: `01-analisis-funcional.md` afirmaba lo contrario; corregido tras verificar `buildNav()`/`loadData()` en `index.html` — es la documentación la que estaba mal, no el código.
- **Badge de rol de topbar (`#role-tag`) y selector de notificación de topbar (`#notif-pref`)**: ambos permanentemente ocultos en la producción real de hoy (verificado en el código), pese a que la documentación previa sugería lo contrario. No se ha construido ningún equivalente visible — no hay ningún comportamiento observable que preservar.
- **Recuperación de contraseña**: PKCE (`?code=...` + `/auth/confirm`) en vez del hash `#access_token=...` original — cambio de implementación exigido por `@supabase/ssr`, sin cambio de comportamiento observable.
- **AUT-12/AUT-14**: sin equivalente literal en la arquitectura SSR (ver "Posibles regresiones" y hallazgos abajo) — resultado observable preservado por otras vías (RLS + middleware; páginas de error por defecto de Next.js).

## Posibles regresiones

Ninguna detectada. La protección de rutas por rol (necesaria porque en Next.js cada módulo es una URL real navegable directamente, a diferencia del SPA original) se añadió de forma proactiva antes de que pudiera manifestarse ningún acceso indebido.

## Hallazgos (posibles bugs heredados) con decisión registrada

- **H-07** (roles legacy genéricos `comercial`/`responsable` sin nav): sigue con **Decisión: Pendiente** — no bloquea esta fase (replicado tal cual, buildNav real tampoco les da ningún item), pendiente la consulta SQL en producción para saber si algún usuario real tiene hoy ese rol.
- **AUT-14** (fallo silencioso de `initApp` tras login): **Decisión: No aplicable** (aprobada por el usuario, 2026-08-03) — la arquitectura SSR no reproduce el hueco donde vivía ese comportamiento; Next.js muestra un error por defecto en vez de quedarse en silencio, y eso no es una mejora elegida, es la ausencia del mecanismo original.

## Resultado de las pruebas

- `npm run lint` / `typecheck` / `test` / `build`: en verde en cada bloque antes de subirlo (34 tests unitarios: `nav-items`, `dashboard-stats`, `password-strength`, `result`).
- Validación funcional 1:1 contra `index.html`: realizada por el usuario en la URL de desarrollo real, bloque a bloque (login, layout/nav, Dashboard con datos de prueba, Perfil).
- Validación visual: realizada por el usuario comparando ambas aplicaciones lado a lado.

## Riesgos detectados de cara a la Fase 2

1. **H-07 sigue abierto** — antes de escribir el `buildNav()`-equivalent para cualquier ajuste futuro de roles, conviene tener ya la respuesta de la consulta de producción.
2. **Pulido visual fino aplazado**: se completará en una pasada global al final de la Fase 5, no bloque a bloque — cualquier detalle menor detectado durante la Fase 2 se anota, no se corrige de paso.
3. **UI-01/02/03/04 parcialmente pendientes**: la Fase 2 es quien primero necesitará modales, `showAlert` y formateo de fecha — construirlos ahí, no reutilizar nada a medio hacer de esta fase.

## Veredicto

- [x] **Paridad funcional y visual validada — apto para iniciar la Fase 2**

## Aprobación

Aprobado por: el usuario, en la conversación de esta fase — confirmaciones explícitas por bloque (Login, Layout+Dashboard, Perfil) y cierre general: "Perfil validado... Doy por cerrada la Fase 1... Empecemos directamente con la Fase 2".
Fecha: 2026-08-03
