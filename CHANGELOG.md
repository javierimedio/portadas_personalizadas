# Changelog

Todas las versiones significativas de este proyecto están documentadas aquí.  
Formato basado en [Keep a Changelog](https://keepachangelog.com/es/1.1.0/).

---

## [v1.0.0] — 2026-08-05 · Primera versión estable en producción

Primera versión del webapp Next.js desplegada en producción y validada de extremo a extremo con usuarios comerciales reales. Sustituye la versión HTML/JS estática anterior (etiquetada como `v1.0-html-estable`).

### Infraestructura y arquitectura

- Next.js 15 App Router + TypeScript + Supabase (Auth, Database, Storage, Edge Functions, Realtime)
- Despliegue continuo en Vercel (rama `main`); rama `claude/custom-covers-saas-structure-lmxigd` como entorno DEV permanente
- RLS habilitado en todas las tablas con políticas por rol (`comercial`, `responsable_diseno_<canal>`, `disenador`, `admin`)
- Middleware de sesión con `@supabase/ssr`; Edge Runtime para la comprobación de rol en cada ruta protegida
- Pipeline CI: lint (ESLint) + typecheck (tsc) + 201 tests unitarios (Vitest) + build en cada push

### Módulo de solicitudes

- Creación y edición de solicitudes con selección de catálogos, portadas personalizadas y ajuntos (upload a Storage)
- Flujo de estados completo: `pendiente_diseno → en_diseno → diseno_en_revision_comercial → aprobado_por_comercial → completado` y ramas de modificación/rechazo
- Asignación automática de diseñador (`auto_adjudicar_portadas`) con lógica de balanceo de carga
- Vista Kanban y tabla con filtros por canal, campaña, estado y comercial
- Carga masiva de solicitudes vía CSV con validación y preview antes de confirmar

### Módulo de campañas

- CRUD completo de campañas con catálogos disponibles, fecha de cierre y covers opcionales
- Instrucciones de portada por idioma con fallback automático a inglés
- Subida de imágenes de covers a Storage (`portadas-adjuntos/campanas/`, `instrucciones/`)

### Módulo de usuarios

- Importación individual y masiva (CSV) de usuarios comerciales; creación vía Edge Function `create-user` con asignación de contraseña temporal y envío de email de bienvenida por Auth
- Gestión de roles, activación/desactivación, restablecimiento de contraseña

### Panel de notificaciones

- Campana en tiempo real vía Supabase Realtime; panel lateral con historial paginado por usuario
- Preferencias de notificación por usuario (`email`, `app`, `ambas`, `ninguna`)

### Envío de email (Outbox + pg_cron)

- Arquitectura Outbox: toda notificación queda en tabla `notificaciones` con `enviado = false`; la Edge Function `send-notifications` consume la cola una vez por minuto mediante `pg_cron` + `pg_net`
- Control de concurrencia con lease (`bloqueado_hasta`) y reintentos hasta `MAX_INTENTOS` (5)
- Semántica "al menos una vez" documentada conscientemente
- Autenticación del cron mediante `CRON_SECRET` (hex aleatorio); verificación JWT de la API Gateway desactivada por función (requerido porque el secret no es un JWT)
- Plantilla HTML corporativa única centralizada en la Edge Function

### Módulo de perfil

- Edición de nombre, cambio de contraseña y configuración de preferencias de notificación

### Documentación técnica (`docs/`)

- 10 documentos: resumen ejecutivo, análisis funcional, arquitectura, modelo de datos, estructura de carpetas, flujo de navegación, roadmap, propuestas futuras, protocolo de validación, auditoría de despliegue manual
- `docs/10` recoge todos los componentes que requieren despliegue manual (Edge Functions, migraciones, secrets, cron, bucket, toggle JWT) para que ningún entorno quede desincronizado

---

## Tags anteriores

| Tag | Descripción |
|---|---|
| `v1.0-html-estable` | Versión HTML/JS estática previa a la migración a Next.js |
| `pre-next-migration` | Estado del repositorio justo antes de iniciar la migración |
