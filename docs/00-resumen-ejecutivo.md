# Portadas Personalizadas — de SPA monolítica a arquitectura SaaS

## Principio inamovible

> **La funcionalidad existente debe mantenerse al 100%.** Este proyecto no añade funcionalidades nuevas ni rediseña la experiencia de usuario. Su único objetivo es:
> - sustituir el `index.html` monolítico por Next.js;
> - separar dominio, aplicación, infraestructura y UI;
> - mejorar mantenibilidad, tipado, seguridad y capacidad de evolución;
> - conservar la misma base de datos, migrándola únicamente cuando sea **estrictamente necesario** para que la migración funcione;
> - mantener la misma experiencia de usuario, los mismos flujos y las mismas funcionalidades durante toda la migración — incluidos los defectos conocidos de hoy (p. ej. la sesión no se refresca sola), que no se corrigen de paso simplemente porque "ya que estamos".

Cualquier oportunidad de mejora funcional o de UX detectada durante el diseño o la implementación **se documenta en `07-propuestas-futuras.md` y no se implementa** en esta migración. Este documento y los que le siguen aplican este principio de forma estricta: donde en una versión anterior de este diseño se proponía normalizar algo (roles, notificaciones, documentos de campaña), ahora se documenta como propuesta diferida y el esquema/comportamiento se mantiene tal cual existe hoy.

Corolario operativo: **ninguna fase del roadmap empieza sin que la anterior tenga paridad funcional validada y aprobada explícitamente**, mediante el checklist descrito en `08-protocolo-validacion.md`. No es una fase de QA opcional al final — es la condición para avanzar.

## Índice de documentos

| # | Documento | Contenido |
|---|-----------|-----------|
| 1 | [`01-analisis-funcional.md`](./01-analisis-funcional.md) | Diagnóstico del sistema actual, actores, módulos y reglas de negocio — tal como funcionan hoy |
| 2 | [`02-arquitectura.md`](./02-arquitectura.md) | Capas, stack, decisiones técnicas y su justificación |
| 3 | [`03-modelo-datos.md`](./03-modelo-datos.md) | Esquema tal como existe hoy en Supabase + RLS añadida encima, sin restructurar tablas |
| 4 | [`04-estructura-carpetas.md`](./04-estructura-carpetas.md) | Organización del repositorio Next.js (feature-based) |
| 5 | [`05-flujo-navegacion.md`](./05-flujo-navegacion.md) | Sitemap por rol y flujos de usuario críticos — sin cambios de comportamiento |
| 6 | [`06-roadmap.md`](./06-roadmap.md) | Migración por módulos en fases, cada una validada antes de empezar la siguiente |
| 7 | [`07-propuestas-futuras.md`](./07-propuestas-futuras.md) | Mejoras identificadas durante el diseño, explícitamente fuera de esta migración |
| 8 | [`08-protocolo-validacion.md`](./08-protocolo-validacion.md) | Checklist de comparación `index.html` vs Next.js al final de cada fase, y regla de bloqueo entre fases |

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
Fase 5.5  Validación documental con una muestra realista de producción (solo lectura)
   ↓
Cutover  Se apaga index.html
```

Cada fase deja el módulo correspondiente validado al 100% en el **entorno de desarrollo** — nunca se expone a los usuarios reales de forma parcial. La aplicación de producción (`index.html`) permanece intacta y es lo único que usan los usuarios hasta el corte final. La estrategia completa de convivencia se detalla en `06-roadmap.md` § "Estrategia de entornos".

## Decisiones de entornos (resueltas)

1. **Dos proyectos Supabase**: producción (el existente, `paqtohmxagfebeyyurlq.supabase.co`, intacto durante toda la migración) y uno nuevo de desarrollo (clon del esquema real vía `supabase db pull`, con datos sintéticos y usuarios de prueba propios — nunca credenciales ni datos reales). Todo el trabajo de las Fases 0-5, incluida la activación de RLS, se hace y se valida contra el proyecto de desarrollo. RLS **no se activa en producción hasta el corte final** — ver `06-roadmap.md` § "Cutover".
2. **Dos proyectos Vercel sobre el mismo repositorio**: el proyecto actual sigue desplegando `index.html` desde la raíz del repo (rama `main`) hacia la **URL de producción**, sin tocarse. Un segundo proyecto Vercel despliega el código Next.js desde una carpeta nueva (`/webapp`) del mismo repositorio, en una rama dedicada a la migración, hacia la **URL de desarrollo** (dominio fijado a esa rama, estable durante todo el proyecto).
3. **Corte final en dos pasos independientes y reversibles**: (a) aplicar las políticas RLS —ya validadas en desarrollo— al proyecto Supabase de producción mientras `index.html` sigue siendo lo que ven los usuarios, y observar sin incidencias; (b) solo después, reasignar el dominio de producción del proyecto Vercel antiguo al nuevo. Cada paso es reversible por sí solo sin tocar el otro.

## Storage: decisión resuelta

El bucket `portadas-adjuntos` del entorno de desarrollo permanece aislado (archivos de prueba, sin relación con producción) durante las Fases 0-4. Antes del cutover, la **Fase 5.5** valida la gestión documental completa (subida, descarga, visualización, referencias a archivos) con una muestra realista: una copia de solo lectura de un subconjunto representativo de archivos y metadatos reales de producción, importada al entorno de desarrollo — sin escribir nunca sobre el proyecto Supabase ni el bucket de producción. Detalle completo del mecanismo en `06-roadmap.md` § "Fase 5.5" y `08-protocolo-validacion.md` § 8.6.

Las URLs del bucket de **producción** siguen siendo públicas durante toda la migración, sin restricción (ver `07-propuestas-futuras.md` § 6) — es una brecha de seguridad conocida que esta migración no cierra por no ser estrictamente necesaria para el cambio de arquitectura.

Con esto, todas las decisiones de entorno están resueltas. Queda aprobado el diseño completo (documentos 0-8); se empieza a construir la Fase 0.
