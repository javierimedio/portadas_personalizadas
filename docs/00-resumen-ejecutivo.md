# Portadas Personalizadas — de SPA monolítica a arquitectura SaaS

## Principio inamovible

> **La funcionalidad existente debe mantenerse al 100%.** Este proyecto no añade funcionalidades nuevas ni rediseña la experiencia de usuario. Su único objetivo es:
> - sustituir el `index.html` monolítico por Next.js;
> - separar dominio, aplicación, infraestructura y UI;
> - mejorar mantenibilidad, tipado, seguridad y capacidad de evolución;
> - conservar la misma base de datos, migrándola únicamente cuando sea **estrictamente necesario** para que la migración funcione;
> - mantener la misma experiencia de usuario, los mismos flujos y las mismas funcionalidades durante toda la migración — incluidos los defectos conocidos de hoy (p. ej. la sesión no se refresca sola), que no se corrigen de paso simplemente porque "ya que estamos".

Cualquier oportunidad de mejora funcional o de UX detectada durante el diseño o la implementación **se documenta en `07-propuestas-futuras.md` y no se implementa** en esta migración. Este documento y los que le siguen aplican este principio de forma estricta: donde en una versión anterior de este diseño se proponía normalizar algo (roles, notificaciones, documentos de campaña), ahora se documenta como propuesta diferida y el esquema/comportamiento se mantiene tal cual existe hoy.

## Índice de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 1 | [`01-analisis-funcional.md`](./01-analisis-funcional.md) | Diagnóstico del sistema actual, actores, módulos y reglas de negocio — tal como funcionan hoy |
| 2 | [`02-arquitectura.md`](./02-arquitectura.md) | Capas, stack, decisiones técnicas y su justificación |
| 3 | [`03-modelo-datos.md`](./03-modelo-datos.md) | Esquema tal como existe hoy en Supabase + RLS añadida encima, sin restructurar tablas |
| 4 | [`04-estructura-carpetas.md`](./04-estructura-carpetas.md) | Organización del repositorio Next.js (feature-based) |
| 5 | [`05-flujo-navegacion.md`](./05-flujo-navegacion.md) | Sitemap por rol y flujos de usuario críticos — sin cambios de comportamiento |
| 6 | [`06-roadmap.md`](./06-roadmap.md) | Migración por módulos en 6 fases, cada una dejando una app 100% funcional |
| 7 | [`07-propuestas-futuras.md`](./07-propuestas-futuras.md) | Mejoras identificadas durante el diseño, explícitamente fuera de esta migración |

## Cómo leer esto

Esto **no es un rediseño de producto**, ni siquiera un "rediseño técnico oportunista". Es una migración de arquitectura: mismo comportamiento, mismos datos, mismos flujos, distinta forma de construirlo por debajo. Si un documento describe algo que hoy no existe en `index.html`, es un error del documento, no una decisión de diseño — repórtalo.

## Punto de partida — esto no es greenfield

Ya existe un proyecto Supabase en producción (`paqtohmxagfebeyyurlq.supabase.co`) con datos reales: `perfiles`, `solicitudes`, `solicitud_catalogos`, `campanas`, `logs`, `notificaciones`, `adjuntos`, y la Edge Function `create-user`. La Fase 0 del roadmap empieza auditando ese esquema real (`supabase db pull`) y las migraciones son incrementales sobre él. Ver `03-modelo-datos.md` § 3.1.

## Migración por módulos (resumen — detalle completo en `06-roadmap.md`)

```
Fase 0  Fundaciones (sin funcionalidad visible)
   ↓
Fase 1  Login + Layout + Dashboard
   ↓
Fase 2  Solicitudes (creación/envío, flujo completo de diseño, comentarios y notificaciones)
   ↓
Fase 3  Campañas
   ↓
Fase 4  Usuarios
   ↓
Fase 5  Panel global, exportación e importación de Excel
   ↓
Cutover  Se apaga index.html
```

Cada fase deja una aplicación completa y usable en producción — nunca hay un estado intermedio donde algo que funcionaba ayer deja de funcionar. La estrategia de convivencia entre `index.html` y el sistema nuevo durante cada fase se detalla en `06-roadmap.md`.

## Preguntas abiertas antes de aprobar el diseño

1. **Dominio/despliegue del sistema nuevo**: ¿en qué dominio o subdominio se despliega el Next.js mientras convive con `index.html`? Afecta a si la sesión de Supabase Auth se puede compartir automáticamente entre ambos (mismo dominio) o si cada fase migrada necesita su propio inicio de sesión hasta el cutover final. Ver `06-roadmap.md` § "Estrategia de convivencia".
2. **Storage de adjuntos**: hoy las URLs del bucket `portadas-adjuntos` son públicas. Añadir RLS a las tablas no cambia esto — ¿confirmamos que el acceso a Storage se mantiene exactamente igual (público) durante toda la migración, dejando cualquier endurecimiento para `07-propuestas-futuras.md`, incluso sabiendo que es una brecha de seguridad conocida?
3. **Ventana de convivencia por fase**: ¿cuánto tiempo debe funcionar cada módulo migrado en paralelo al `index.html` antes de retirar esa parte del sistema viejo (o se retira solo al cutover final, fase 6)?

Cuando estas respuestas y los documentos estén aprobados, se empieza a construir por fases.
