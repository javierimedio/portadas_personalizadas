# Portadas Personalizadas — entorno de desarrollo (migración a Next.js)

Este directorio es el proyecto Next.js de la migración descrita en `../docs/`. **No es producción** — `index.html` en la raíz del repositorio sigue siendo la aplicación real hasta el cutover (`../docs/06-roadmap.md`).

Antes de tocar código, lee `../docs/00-resumen-ejecutivo.md`. El principio inamovible y el protocolo de validación (`../docs/08-protocolo-validacion.md`) aplican a todo lo que se añada aquí.

## Puesta en marcha (Fase 0) — pasos que requieren tu cuenta

Estos pasos no se pueden automatizar desde aquí porque requieren acceso a tus cuentas de Supabase/Vercel/GitHub:

1. **Crear el proyecto Supabase de desarrollo** (nuevo, distinto del de producción `paqtohmxagfebeyyurlq.supabase.co`).
2. **Clonar el esquema real**: `supabase login`, `supabase link --project-ref <ref-de-producción>`, `supabase db pull` (operación de solo lectura sobre producción). Revisar el resultado contra `../docs/03-modelo-datos.md` § 3.4 y corregir donde difiera.
3. **Aplicar el esquema clonado al proyecto de desarrollo**: `supabase link --project-ref <ref-de-desarrollo>` y `supabase db push`.
4. **Aplicar la migración de RLS** (`supabase/migrations/20260731000100_enable_rls_and_policies.sql`) al proyecto de desarrollo — revisar antes el TODO marcado sobre el rol legacy `responsable`.
5. **Desplegar la Edge Function** `create-user` al proyecto de desarrollo (`supabase functions deploy create-user`) — revisar antes el TODO marcado en `supabase/functions/create-user/index.ts`: es un placeholder, no una copia verificada del original.
6. **Crear el bucket** `portadas-adjuntos` en el proyecto de desarrollo (vacío por ahora, ver `../docs/06-roadmap.md` § "Fase 5.5" para cuándo se llena con datos realistas).
7. **Copiar `.env.example` a `.env.local`** y rellenar con las claves del proyecto de desarrollo.
8. **Sembrar datos de prueba**: `npm install && npm run seed` (crea un usuario de prueba por cada rol y una campaña de ejemplo — ver `scripts/seed.ts`).
9. **Crear el segundo proyecto Vercel**: mismo repositorio, Root Directory `webapp`, rama de despliegue la rama de migración (no `main`), variables de entorno del paso 7. Fijar el dominio de desarrollo a esa rama.

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
