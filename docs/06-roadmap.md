# 6. Roadmap por fases

Migración por módulos: en todo momento la aplicación de producción (`index.html`) está 100% operativa para los usuarios reales, y el sistema nuevo se construye y valida en un entorno de desarrollo completamente separado. Cada fase termina con un criterio de salida verificable **por comparación de comportamiento**, no por "parece que funciona": se replican los mismos escenarios (mismos roles, mismos datos de prueba) en ambos entornos y se comprueba que el resultado es idéntico.

## Estrategia de entornos

Dos entornos con **URLs, proyectos Vercel y proyectos Supabase completamente separados** durante toda la migración — ver el análisis y la justificación completa en la conversación de diseño; resumen de las decisiones:

| | Producción | Desarrollo |
|---|---|---|
| URL | La actual, estable durante todo el proyecto | Nueva, fija, apunta siempre a la última versión de la rama de migración |
| Código | `index.html` en la raíz del repo, rama `main` — **no se toca** hasta el cutover | Next.js en `/webapp` del mismo repositorio, rama dedicada a la migración |
| Proyecto Vercel | El actual, sin cambios de configuración | Uno nuevo, Root Directory `/webapp`, dominio fijado a la rama de migración |
| Proyecto Supabase | El actual (`paqtohmxagfebeyyurlq.supabase.co`), **sin RLS hasta el cutover** | Uno nuevo: mismo esquema (clonado con `supabase db pull` sobre producción, operación de solo lectura), datos sintéticos, usuarios de prueba propios (nunca credenciales reales) |
| Storage | Bucket público actual, sin cambios | Bucket propio, vacío o con archivos de prueba |
| Edge Functions | `create-user` existente, sin tocar | Copia de `create-user` redesplegada en el proyecto de desarrollo |

Como cada entorno tiene su propia base de datos, **nada de lo que se haga en desarrollo puede afectar a producción** — no hay filas compartidas, no hay RLS compartida, no hay sesión compartida. Esto es más simple de razonar que una convivencia a nivel de nav/rutas, aunque signifique que la validación de cada fase se hace en desarrollo con datos de prueba representativos, no con el uso real de los usuarios hasta el cutover final.

## Fase 0 — Fundaciones (sin funcionalidad visible para usuarios reales)

**Objetivo**: entorno de desarrollo funcionando de extremo a extremo, sin tocar nada de producción.

- `supabase db pull` sobre el proyecto de **producción** (solo lectura) para obtener el esquema real exacto; reconciliar con `03-modelo-datos.md` § 3.4.
- Crear el proyecto Supabase de **desarrollo**: aplicar ese mismo esquema (DDL), redesplegar la Edge Function `create-user`, crear el bucket `portadas-adjuntos`, crear un usuario de prueba por cada rol (incluidas las variantes legacy) y sembrar datos sintéticos que cubran todos los estados de solicitud, catálogos y casos límite.
- Repositorio Next.js 15 + TypeScript + Tailwind + shadcn/ui en `/webapp`, con `@supabase/supabase-js` + `@supabase/ssr` apuntando **al proyecto de desarrollo**.
- Segundo proyecto Vercel (Root Directory `/webapp`) desplegando desde la rama de migración hacia la URL de desarrollo.
- RLS activada tabla por tabla según `03-modelo-datos.md` § 3.5, verificada contra los usuarios de prueba del proyecto de desarrollo — incluido el caso legacy `responsable` sin canal, que requiere confirmación explícita de su comportamiento actual antes de escribir su policy.
- CI (lint, typecheck) sobre la rama de migración.

**Criterio de salida**: cada usuario de prueba, en el entorno de desarrollo, ve exactamente lo que su rol equivalente ve hoy en producción — verificado comparando resultados, no solo revisando el código. La URL de producción no ha cambiado en absoluto.

## Fase 1 — Login + Layout + Dashboard

**Objetivo**: en la URL de desarrollo, el usuario de prueba puede entrar, navegar por el layout con el mismo nav condicionado por rol, y ver el Dashboard con los mismos KPIs y los mismos 7 gráficos que production muestra para el escenario equivalente.

- Login, recuperación de contraseña, impersonación de rol (admin) — mismas pantallas y mensajes que hoy.
- Layout autenticado: nav lateral con las mismas páginas visibles por rol que `buildNav()` decide hoy (las páginas de Solicitudes/Campañas/Usuarios/Panel existen como placeholders hasta sus propias fases).
- Dashboard completo: KPIs de estado/unidades/precios y los 7 gráficos, filtrable por campaña, acotado por canal para `responsable_nacional`/`responsable_exportacion`.

**Criterio de salida**: para un conjunto de datos de prueba sembrado de forma idéntica en ambos entornos, el Dashboard de desarrollo produce números y gráficos idénticos a los que `index.html` produciría con esos mismos datos.

## Fase 2 — Solicitudes (incluye diseño, comentarios y notificaciones)

**Objetivo**: el ciclo de vida completo de una solicitud —desde que un comercial la crea hasta que se confirma o archiva— funciona en el entorno de desarrollo sin ninguna diferencia de comportamiento frente a producción.

Alcance confirmado (una solicitud es una sola entidad; separar su flujo en fases distintas no aportaría nada dado que ambos entornos ya están completamente aislados):

- Crear/editar/enviar solicitud, secciones por catálogo, validación de completitud (`missingFields`).
- Máquina de estados completa: `borrador → enviada → en_revision_marketing → en_diseno ⇄ modificar_diseno → diseno_en_revision_comercial → confirmada/archivada`.
- Cola de trabajo de diseño (autoasignación, subida de diseño final) y carga masiva con el mismo parseo de nombre de archivo.
- Comentarios con `@menciones` y su autocompletado.
- Notificaciones (in-app, estado de lectura en `localStorage` igual que hoy — no se traslada a base de datos, ver `07-propuestas-futuras.md` § 2).

**Criterio de salida**: un escenario de prueba completo (varios comerciales, varios diseñadores, varias solicitudes recorriendo toda la máquina de estados) produce en desarrollo el mismo resultado final que el mismo escenario reproducido en producción.

## Fase 3 — Campañas

**Objetivo**: `admin`/`marketing` pueden crear y gestionar campañas desde el entorno de desarrollo con paridad total.

- Listado y ficha de campaña: nombre, descripción, fecha de cierre, catálogos activos.
- Subida de `covers`/`covers_instrucciones` por catálogo (se mantienen como JSON en la fila de `campanas`, sin tabla nueva).
- Cálculo de "campaña activa por defecto" igual que hoy.

**Criterio de salida**: crear la misma campaña (mismos campos) en ambos entornos produce el mismo comportamiento observable en cada uno (catálogos activos, cierre, documentos).

## Fase 4 — Usuarios

**Objetivo**: `admin`/`marketing` gestionan usuarios desde el entorno de desarrollo con paridad total.

- Alta de usuario (invoca la copia de la Edge Function `create-user` desplegada en el proyecto de desarrollo).
- Edición de datos y alta/baja lógica (`activo`), sin borrado — igual que hoy.

**Criterio de salida**: un usuario de prueba dado de alta en desarrollo puede iniciar sesión ahí y tiene exactamente los permisos que ese rol tiene hoy en producción.

## Fase 5 — Panel global, exportación e importación de Excel

**Objetivo**: paridad total en la vista global y el intercambio de datos por Excel.

- Panel global: todas las solicitudes de todas las campañas, con los mismos filtros que hoy.
- Exportación a `.xlsx` de una campaña, con el mismo formato de columnas que genera `exceljs` hoy.
- Importación masiva de solicitudes desde Excel/CSV, con la misma validación de filas.

**Criterio de salida**: exportando el mismo conjunto de datos de prueba desde ambos entornos, los dos `.xlsx` son indistinguibles columna por columna.

## Cutover — el único momento en que producción se toca

**Objetivo**: mover a los usuarios reales al sistema nuevo, con el menor riesgo posible y en pasos independientes y reversibles.

1. **QA end-to-end completo** en el entorno de desarrollo: los 6 criterios de salida anteriores verificados a la vez, sobre el conjunto de datos de prueba más completo posible.
2. **Aplicar RLS al proyecto Supabase de producción** (las mismas políticas ya validadas en desarrollo), con `index.html` todavía siendo lo que ven los usuarios reales. Observar tráfico real durante un periodo sin incidencias — si algo falla, el rollback es el script SQL de reversión (`DROP POLICY`, `DISABLE ROW LEVEL SECURITY`), ya probado en desarrollo, sin ningún despliegue de por medio.
3. **Solo después**, reasignar el dominio de producción del proyecto Vercel actual al proyecto Vercel del sistema nuevo. Es una operación de segundos en el panel de Vercel, y reversible igual de rápido si aparece cualquier problema: reasignar el dominio de vuelta.
4. `index.html` se archiva (no se borra) como referencia histórica, con la fecha de corte documentada.

**Criterio de salida**: los usuarios reales trabajan en el sistema nuevo sin ninguna funcionalidad perdida respecto al día anterior al corte, y ambos pasos (RLS y cambio de dominio) se verificaron por separado antes de encadenarlos.

---

No se empieza a picar código de ninguna fase hasta que los documentos 0-7 y las preguntas abiertas de `00-resumen-ejecutivo.md` estén aprobados. Ninguna fase incluye mejoras funcionales — cualquier idea que surja durante la implementación se añade a `07-propuestas-futuras.md`, no al alcance de la fase en curso.
