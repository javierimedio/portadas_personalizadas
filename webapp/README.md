# Portadas Personalizadas — entorno de desarrollo (migración a Next.js)

Este directorio es el proyecto Next.js de la migración descrita en `../docs/`. **No es producción** — `index.html` en la raíz del repositorio sigue siendo la aplicación real hasta el cutover (`../docs/06-roadmap.md`).

Antes de tocar código, lee `../docs/00-resumen-ejecutivo.md`. El principio inamovible y el protocolo de validación (`../docs/08-protocolo-validacion.md`) aplican a todo lo que se añada aquí.

## Registro de entorno de desarrollo

- **Proyecto Supabase de desarrollo**: `portadas-personalizadas-dev`, Reference ID `xjyftgvyzyzmccobynzt`, región West EU (Ireland). Creado desde el Dashboard en la Fase 0 (ver `../docs/06-roadmap.md`).

## Método de trabajo: Dashboard primero, terminal solo si es imprescindible

Desde la Fase 0 (ver `../docs/00-resumen-ejecutivo.md` § "Principio de trabajo"), la preparación de este entorno se hace por defecto desde **GitHub (web), Supabase Dashboard y Vercel Dashboard**, incluido el SQL Editor de Supabase para leer o aplicar esquema. Se evita pedir instalación de CLI, `pg_dump` u otras herramientas locales salvo que no exista alternativa razonable desde el navegador — y en ese caso se explica antes por qué ese caso concreto lo requiere.

## Puesta en marcha (Fase 0) — pasos que requieren tu cuenta

Ninguno de estos pasos necesita terminal ni instalar nada; todos se hacen desde el navegador. El único momento en que se toca una terminal es cuando Claude trabaja el código de `webapp/` en sus propias sesiones (build, tests) — no en tu máquina.

1. ~~Crear el proyecto Supabase de desarrollo~~ — hecho (ver "Registro de entorno" arriba).
2. **Leer el esquema real de producción**: consultas de solo lectura en el SQL Editor del Dashboard de producción. Revisar el resultado contra `../docs/03-modelo-datos.md` § 3.4 y corregir donde difiera.
3. **Aplicar el esquema al proyecto de desarrollo**: pegar el SQL correspondiente en el SQL Editor de `portadas-personalizadas-dev`.
4. **Aplicar la migración de RLS** (`supabase/migrations/20260731000100_enable_rls_and_policies.sql`) pegándola en el mismo SQL Editor de desarrollo — revisar antes el TODO marcado sobre el rol legacy `responsable`.
5. **Desplegar la Edge Function** `create-user` desde el editor de Edge Functions del Dashboard de desarrollo (copiar el contenido de `supabase/functions/create-user/index.ts`) — revisar antes el TODO marcado ahí: es un placeholder, no una copia verificada del original.
6. **Crear el bucket** `portadas-adjuntos` desde Dashboard → Storage → New bucket (vacío por ahora, ver `../docs/06-roadmap.md` § "Fase 5.5" para cuándo se llena con datos realistas).
7. **Crear los usuarios de prueba** desde Dashboard → Authentication → Add user (uno por cada rol real, incluidas las variantes legacy) y sus filas correspondientes en `perfiles` desde Dashboard → Table Editor o pegando un `INSERT` en el SQL Editor.
8. **Crear el segundo proyecto Vercel**: Vercel Dashboard → New Project → mismo repositorio → Root Directory `webapp` → rama de despliegue la rama de migración (no `main`) → variables de entorno (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` del proyecto de desarrollo, desde su Dashboard → Project Settings → API) → fijar el dominio de desarrollo a esa rama.

`scripts/seed.ts` y `.env.example` quedan en el repo como referencia/automatización futura (por ejemplo, para tests end-to-end en CI), no como parte del flujo manual de puesta en marcha.

## Comandos locales

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run test
```

## Estructura

Ver `../docs/04-estructura-carpetas.md` para la organización completa por features (dominio/aplicación/infraestructura/UI). En la Fase 0 solo existe el esqueleto base (`src/app/layout.tsx`, `src/app/page.tsx` de comprobación, clientes de Supabase en `src/shared/infrastructure/supabase/`); las carpetas de `src/features/*` se rellenan a partir de la Fase 1.
