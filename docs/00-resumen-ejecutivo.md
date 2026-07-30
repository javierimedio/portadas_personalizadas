# Portadas Personalizadas — de SPA monolítica a arquitectura SaaS

Este documento es el índice de la fase de diseño de la migración. Antes de escribir código, estos seis documentos deben aprobarse (o corregirse) en conjunto:

| # | Documento | Contenido |
|---|-----------|-----------|
| 1 | [`01-analisis-funcional.md`](./01-analisis-funcional.md) | Diagnóstico del sistema actual, filosofía de la migración, actores, módulos y reglas de negocio |
| 2 | [`02-arquitectura.md`](./02-arquitectura.md) | Capas, stack, decisiones técnicas y su justificación |
| 3 | [`03-modelo-datos.md`](./03-modelo-datos.md) | Esquema PostgreSQL: tablas, relaciones, índices, RLS — reconciliado con lo que ya existe en Supabase |
| 4 | [`04-estructura-carpetas.md`](./04-estructura-carpetas.md) | Organización del repositorio Next.js (feature-based) |
| 5 | [`05-flujo-navegacion.md`](./05-flujo-navegacion.md) | Sitemap por rol y flujos de usuario críticos |
| 6 | [`06-roadmap.md`](./06-roadmap.md) | Fases de migración, alcance y criterio de salida de cada una |

## Cómo leer esto

Esto **no es un rediseño de producto**. Portadas Personalizadas ya es una herramienta con roles, flujo de estados, campañas y un dashboard que funcionan y se usan a diario. La migración consiste en llevar esa misma lógica de negocio desde un único archivo HTML de ~6.000 líneas con JS embebido a una arquitectura por capas (Next.js 15 + Supabase) donde la seguridad la garantiza la base de datos (RLS) y no los `if` del cliente, y donde el código se puede testear, versionar y hacer crecer sin miedo a romper algo con cada cambio.

## Punto de partida — esto no es greenfield

A diferencia de un proyecto nuevo, aquí **ya existe un proyecto Supabase en producción** (`paqtohmxagfebeyyurlq.supabase.co`) con datos reales: `perfiles`, `solicitudes`, `solicitud_catalogos`, `campanas`, `logs`, `notificaciones`, `adjuntos`, y una Edge Function (`create-user`). El esquema de `03-modelo-datos.md` describe cómo debería quedar ese esquema, pero **la Fase 0 del roadmap empieza auditando el esquema real** (`supabase db pull`) y escribiendo migraciones incrementales sobre él — nunca un `CREATE TABLE` desde cero que asuma una base vacía. Ver la nota de la sección 3.1 de `03-modelo-datos.md`.

## Decisión de alcance para la v1 de la migración

**Single-tenant real**: Portadas Personalizadas es una herramienta interna de una sola empresa (GOR FACTORY). A diferencia del ejemplo de arquitectura SaaS de referencia (pensado para vender a múltiples clientes), aquí **no se introduce una capa `organizations`/multi-tenant** — sería complejidad sin beneficio real para un caso de un solo inquilino. Lo que sí se conserva y se refuerza es la segmentación por **rol** y **canal** (nacional/exportación) mediante RLS, que ya existe hoy como lógica de negocio.

**Limpieza de roles legacy incluida en el alcance**: hoy existen variantes de rol como `comercial_nacional`/`comercial_exportacion`/`comercial` y `responsable_nacional`/`responsable_exportacion`/`responsable` porque el canal se coló dentro del nombre del rol. La migración separa esto en dos columnas (`rol` + `canal`), sin cambiar el comportamiento visible para el usuario final.

## Preguntas abiertas antes de aprobar el diseño

1. **Notificaciones por email**: hoy la tabla `notificaciones` se rellena pero no se envía ningún correo real (comentario explícito en el código: *"para envío real, configurar Edge Function con Resend"*). ¿Entra el envío real de email en el alcance de esta migración, o se mantiene solo in-app por ahora?
2. **Estado de lectura de notificaciones**: hoy vive en `localStorage` (no sincroniza entre dispositivos). ¿Confirmamos que se traslada a una columna `read_at` en base de datos como parte de la Fase 1, o se puede posponer?
3. **Ventana de datos históricos**: ¿hay solicitudes/campañas antiguas que deban excluirse o archivarse antes de aplicar RLS estricto, o el histórico completo debe seguir siendo visible según las reglas nuevas?
4. **Corte de tráfico (cutover)**: ¿la migración convive con el `index.html` actual en producción durante un periodo (por ejemplo, feature flag o subdominio de pruebas) o se planea un corte único cuando el nuevo sistema alcance paridad funcional?
5. **Idiomas del formulario de cliente**: se mantienen los 24 idiomas actuales como datos, no como catálogo editable — ¿alguna vez se necesita añadir/quitar idiomas sin desplegar código, o basta con que sea una constante?

Cuando estas respuestas y los seis documentos estén aprobados, se empieza a construir por fases (ver `06-roadmap.md`).
