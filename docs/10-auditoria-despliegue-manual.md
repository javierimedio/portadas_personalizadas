# Auditoría de despliegue manual (2026-08-04)

Motivada directamente por el hallazgo del error de importación masiva de usuarios (§ H-01 en `09-matriz-paridad-funcional.md`): la causa más probable — una Edge Function distinta de la que hay en el repositorio, porque Supabase no la redespliega sola al hacer `git push` — es un caso concreto de un problema más general. Este documento identifica **todos** los elementos del proyecto que no viajan automáticamente desde el commit hasta producción, para que este tipo de desincronización no vuelva a pasar desapercibida.

## Resumen — qué se despliega solo, qué no

| Componente | ¿Dónde vive en el repo? | ¿Se aplica solo con `git push`? |
|---|---|---|
| Código de la app Next.js (`webapp/src/**`) | Sí, todo el árbol de código | **Sí** — Vercel redespliega automáticamente en cada push (asumido por convención de esta migración; el proyecto Vercel en sí no es visible desde este entorno de trabajo, ver nota al final) |
| Variables de entorno de la app (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | Solo una plantilla sin valores reales, `webapp/.env.example` | **No** — los valores reales se configuran a mano en Vercel → Project Settings → Environment Variables; el `.env.example` documenta qué hace falta, no lo aplica |
| Edge Function `create-user` | `webapp/supabase/functions/create-user/index.ts` | **No** — hay que copiar el archivo entero en Dashboard → Edge Functions → `create-user` → editor → *Deploy*. No existe ningún paso de CI/CD (`supabase functions deploy` ni equivalente) en `.github/workflows/webapp-ci.yml` |
| Secretos de la Edge Function (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` que usa `create-user` internamente) | No viven en ningún archivo del repo (ni siquiera en `.env.example` — son gestionados por Supabase, no por Next.js) | **No** — se configuran en Dashboard → Edge Functions → Secrets. Es un almacén de variables de entorno completamente distinto del de Vercel; cambiar una no afecta a la otra |
| Migraciones SQL (esquema, RLS, policies, funciones SQL) | `webapp/supabase/migrations/*.sql` (3 archivos, ver detalle abajo) | **No** — están versionadas en git y `webapp-ci.yml` las linta implícitamente al no fallar el checkout, pero ningún paso del CI ejecuta `supabase db push` ni las aplica de ninguna otra forma. Aplicarlas exige copiarlas a mano en el SQL Editor del Dashboard, en orden, o enlazar el proyecto con la CLI de Supabase y ejecutar `supabase db push` desde una máquina con las credenciales |
| Funciones SQL (`rol_actual()`, `email_actual()`) | Dentro de `20260731000100_enable_rls_and_policies.sql` (no son archivos separados) | **No** — mismo mecanismo que el resto de esa migración: manual |
| Políticas RLS (todas las tablas + `storage.objects`) | Repartidas entre `20260731000100_enable_rls_and_policies.sql`, `20260804000100_storage_objects_portadas_adjuntos.sql` y `20260804000200_remove_legacy_role_support.sql` | **No** — mismo mecanismo: manual |
| Bucket de Storage `portadas-adjuntos` | **No existe ningún archivo en el repo que lo cree** — ni una migración SQL con `insert into storage.buckets`, ni ninguna llamada de la app a `.storage.createBucket()` | **No, y además no está ni documentado como código** — el bucket tiene que existir ya en el proyecto (creado a mano desde Dashboard → Storage → *New bucket*, en algún momento no rastreado por este repositorio) antes de aplicar la migración de políticas de arriba, que asume que ya existe |
| Datos semilla de desarrollo (`dataset-base-desarrollo.sql`) | `webapp/supabase/seed/dataset-base-desarrollo.sql`, ejecutado por `npm run seed` (`scripts/seed.ts`) | **No** — es un script que hay que ejecutar a mano (`npm run seed`) contra el proyecto de desarrollo; no se ejecuta en ningún CI ni en ningún despliegue, ni siquiera en desarrollo |
| Triggers en `auth.users` (p. ej. `handle_new_user()`) | **Ninguno en este repositorio** — el único trigger de este tipo documentado (`handle_new_user()`) aparece solo en `creacion_de_tablas.sql`, un script SQL histórico que el propietario del proyecto compartió fuera de git (ZIP de consultas del SQL Editor), nunca comiteado aquí | **No aplica** — no hay nada que este repo pueda desplegar ni desinstalar; si ese trigger existe hoy en producción, existe por una acción manual de la que este repositorio no tiene ni rastro ni control. Sigue sin confirmarse si existe hoy (ver H-01) |
| Cron jobs (`pg_cron` o cualquier tarea programada en Postgres/Supabase) | Ninguno — no hay ninguna mención de un cron job real en ningún archivo de código ni de migración de este repositorio | **No aplica** — no se ha encontrado evidencia de que exista ninguno, ni en el repo ni en la documentación de fases; no verificado contra la base de datos real (requeriría `select * from cron.job;` en el SQL Editor, no ejecutado desde este entorno) |
| Vínculo del repo con un proyecto Supabase concreto (`supabase link` / `supabase/config.toml`) | **No existe ningún `config.toml` de la CLI de Supabase en el repositorio** | **No aplica al despliegue** — significa que ni siquiera hay un "proyecto por defecto" registrado en el repo para la CLI; cualquiera que quiera correr `supabase db push`/`supabase functions deploy` desde su máquina tiene que enlazar el proyecto a mano primero (`supabase link --project-ref ...`) |
| Edge Function `send-notifications` (2026-08-05: implementada en DEV, arquitectura Outbox + pg_cron acordada explícitamente — ver detalle abajo) | `webapp/supabase/functions/send-notifications/index.ts` **y** `config.ts` (dos archivos, `index.ts` importa `./config.ts`) | **No** — mismo mecanismo que `create-user`, pero hay que copiar **ambos archivos** en Dashboard → Edge Functions → `send-notifications` → editor → *Deploy*, en cada proyecto. Olvidar `config.ts` rompe el `import` |
| Secrets de `send-notifications` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, **`CRON_SECRET`**) — los SMTP ya existían en producción (confirmado, 2026-08-04); `CRON_SECRET` es nuevo (2026-08-05): ver detalle abajo. No usar `RESEND_API_KEY`, descartado explícitamente | No viven en el repo | **No** — Dashboard → Edge Functions → Secrets, **por proyecto**. `CRON_SECRET` debe existir en cada proyecto donde se despliegue `send-notifications` (DEV y Producción son proyectos distintos con Secrets independientes). Sin él la función arranca pero rechaza todas las invocaciones del cron con 401. |
| pg_cron + extensión `pg_net` (disparador único de `send-notifications`, una vez por minuto) | SQL de referencia en este documento (más abajo) — **no** en `webapp/supabase/migrations/`, porque `cron.schedule()` no es DDL de esquema, es una tarea programada que vive en el catálogo del propio proyecto | **No** — (1) habilitar las extensiones `pg_cron` y `pg_net` en Database → Extensions (no se pueden activar desde una migración), (2) ejecutar una vez el `select cron.schedule(...)` de este documento en el SQL Editor, sustituyendo URL y service_role key del proyecto en cuestión |
| `vercel.json` (raíz del repo) | Cabeceras de caché HTTP | **Sí, pero no afecta a `webapp/`** — es del despliegue del `index.html` legacy en la raíz del repo, un target de Vercel totalmente distinto (confirmado por el propio comentario de `webapp-ci.yml`: "No toca ni despliega index.html/vercel.json de la raíz") |

## Detalle de las migraciones SQL versionadas

Los archivos de `webapp/supabase/migrations/`, en el orden en que deben aplicarse (el nombre ya empieza por fecha/hora, así que un `ls` ordenado alfabéticamente ya da el orden correcto):

1. **`20260731000100_enable_rls_and_policies.sql`** (214 líneas) — activa políticas reales sobre las 7 tablas (sustituyendo las `allow_all` heredadas de producción), define `rol_actual()`/`email_actual()`.
2. **`20260804000100_storage_objects_portadas_adjuntos.sql`** (75 líneas) — políticas de RLS sobre `storage.objects` acotadas al bucket `portadas-adjuntos` (select público, insert/update solo autenticado, sin delete). Sin esto, cualquier subida a Storage devuelve 400 (`new row violates row-level security policy`) — ya ocurrió una vez durante el desarrollo (ver cabecera del propio archivo).
3. **`20260804000200_remove_legacy_role_support.sql`** (54 líneas) — afina 3 políticas de `solicitudes` para quitar el rol legacy `responsable` sin sufijo de canal.
4. **`20260805000100_fix_disenador_update_with_check.sql`** — añade `with check` explícito a `solicitudes_update`: sin él, un disenador/responsable_diseno no podía marcar "Diseño listo → Revisión cliente" (`new row violates row-level security policy for table "solicitudes"`, incidencia de estabilización del 2026-08-05).
5. **`20260805000200_add_notificaciones_insert_policy.sql`** — añade la policy `notificaciones_insert` que faltaba por completo: sin ella, RLS denegaba cualquier inserción en `notificaciones` (estados, asignaciones, menciones), así que nunca llegaba ninguna notificación dentro de la app (incidencia de estabilización del 2026-08-05).
6. **`20260805000300_notificaciones_outbox_reclamo.sql`** — añade a `notificaciones` las columnas de trazabilidad (`intentos`, `ultimo_intento_at`, `ultimo_error`) y de reclamo con caducidad (`bloqueado_hasta`), más la función `reclamar_notificaciones_pendientes()` que usa `send-notifications` para tomar un lote de forma atómica sin bloquear filas indefinidamente si una ejecución falla a mitad.
7. **`20260805000400_notificaciones_indice_pendientes.sql`** — índice parcial (`where enviado = false`) para que el reclamo de pendientes siga siendo rápido cuando la tabla acumule histórico (nunca se borran filas enviadas). Encontrado en la revisión de código previa al merge a `main`, no en producción real todavía.

Aplicar siempre primero en DEV y validar antes de llevarlas a producción — cutover ya cerrado, cualquier migración nueva sigue el flujo DEV → validación → Producción de ahora en adelante, no un "recordatorio de cutover" puntual.

## Puesta en marcha de `send-notifications` (una vez por proyecto)

### 1 · Generar el valor de `CRON_SECRET`

`send-notifications` se autentica con un secreto propio (`CRON_SECRET`) en vez de depender de las claves internas de Supabase, cuyo formato de inyección varía entre versiones de la plataforma. El valor es un string aleatorio que el propietario del proyecto controla por completo en ambos extremos (secret de la función **y** cabecera del cron). Generarlo en el SQL Editor del proyecto:

```sql
select encode(gen_random_bytes(32), 'hex');
```

Guardar el resultado — se necesita en los pasos 2 y 3.

### 2 · Añadir `CRON_SECRET` a los secrets de la función

Dashboard → Edge Functions → Secrets → añadir:
- **Nombre**: `CRON_SECRET` (exactamente — es el valor de `CONFIG.CRON_SECRET_ENV` en `config.ts`)
- **Valor**: el string generado en el paso anterior

⚠️ **Este secret es independiente por proyecto.** DEV y Producción son proyectos Supabase distintos con Secrets completamente separados. Añadir el secret en un proyecto no lo crea en el otro. Sin él, la función arranca correctamente pero rechaza todas las invocaciones del cron con 401 y el mensaje `CRON_SECRET no configurado en Edge Functions → Secrets`.

### 3 · Desplegar la Edge Function

Dashboard → Edge Functions → `send-notifications` → editor → copiar **ambos archivos** del repo y hacer Deploy:
- `webapp/supabase/functions/send-notifications/index.ts`
- `webapp/supabase/functions/send-notifications/config.ts`

### 4 · Habilitar extensiones y programar el cron

Habilitar `pg_cron` y `pg_net` en Database → Extensions (si no están ya activas). Luego ejecutar una sola vez en el SQL Editor, sustituyendo los dos placeholders por los valores reales del proyecto:

```sql
select cron.schedule(
  'send-notifications',
  '* * * * *',
  format(
    $$
      select net.http_post(
        url := '%s/functions/v1/send-notifications',
        headers := jsonb_build_object('Authorization', 'Bearer %s')
      );
    $$,
    '<URL_DEL_PROYECTO>',
    '<VALOR_DE_CRON_SECRET>'
  )
);
```

Comprobar que ha quedado activo: `select * from cron.job where jobname = 'send-notifications';`. Para desactivarlo (rollback rápido si algo falla): `select cron.unschedule('send-notifications');`.

**Ninguna tiene un script de "rollback"** ni un registro de qué migraciones ya se aplicaron a qué proyecto (no hay tabla de control de versiones tipo `supabase_migrations.schema_migrations` gestionada por este repo — si se usa la CLI de Supabase enlazada al proyecto, la CLI sí mantiene esa tabla ella misma, pero es responsabilidad de quien la ejecute, no algo que el repo garantice). Si estas migraciones no se han aplicado nunca a mano contra el proyecto de desarrollo o el de producción, el esquema real de esos proyectos no coincide con lo que asume el código de `webapp/src` (RLS, funciones, columnas) — otra clase de bug con la misma forma que el de la Edge Function: código correcto en el repo, entorno real desincronizado, sin ningún error visible que lo señale directamente.

## Dos almacenes de variables de entorno independientes

Vale la pena remarcarlo porque es una fuente fácil de confusión: este proyecto tiene **dos configuraciones de entorno separadas, sin relación entre sí**:

1. **Vercel** (la app Next.js): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — las lee el código de `webapp/src` (cliente y servidor). Se configuran en Vercel → Project Settings → Environment Variables.
2. **Supabase Edge Functions**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — las lee `create-user/index.ts` con `Deno.env.get(...)`. Se configuran en Supabase Dashboard → Edge Functions → Secrets, **por proyecto Supabase**, no por función individual.

Cambiar una no cambia la otra. Si alguna vez se apunta la app de Next.js a un proyecto Supabase distinto (p. ej. pasar de desarrollo a producción), hay que actualizar el punto 1 en Vercel — el punto 2 vive dentro del propio proyecto Supabase de destino y no necesita tocarse, pero sí hay que confirmar que ese proyecto de destino tiene sus propios secretos ya configurados y su propia copia de la Edge Function ya desplegada (son cosas del proyecto Supabase, no de la app).

## Checklist para no repetir este tipo de incidente

**Regla permanente mientras no se introduzca la CLI de Supabase** (decisión explícita del propietario del proyecto, 2026-08-05: flujo manual — código y Edge Functions versionados en el repo, migraciones por SQL Editor, despliegue de Edge Functions por Dashboard, sin `supabase db push` ni `supabase functions deploy`): cualquier Edge Function nueva o modificada actualiza la fila correspondiente de la tabla del principio de este documento con el **listado exacto y completo** de los archivos de su carpeta que hay que copiar — no asumir que es solo `index.ts`.

Antes de dar por buena cualquier corrección que toque uno de estos componentes, comprobar explícitamente cuál de estas acciones manuales hace falta repetir:

- [ ] ¿Cambié algo dentro de `webapp/supabase/functions/create-user/` o `webapp/supabase/functions/send-notifications/`? → copiar **todos los archivos de esa carpeta** (no solo `index.ts` si tiene más, como `send-notifications/config.ts`) en Dashboard → Edge Functions → esa función → editor → Deploy, en **cada** proyecto Supabase afectado (desarrollo y producción son proyectos distintos con Edge Functions independientes).
- [ ] ¿Añadí o cambié un archivo en `webapp/supabase/migrations/`? → aplicarlo a mano en el SQL Editor en **cada** proyecto Supabase afectado, en orden. Mientras no se use la CLI de Supabase (decisión vigente, 2026-08-05), esta es la única vía — no hay `supabase db push` en este flujo.
- [ ] ¿Necesito un bucket de Storage nuevo? → crearlo a mano desde Dashboard → Storage antes de escribir cualquier política RLS que lo referencie — no hay ningún mecanismo en este repo que lo haga por ti.
- [ ] ¿Cambié una variable `NEXT_PUBLIC_*` o añadí una nueva? → actualizar Vercel → Environment Variables y volver a desplegar (un cambio de env var en Vercel normalmente no redespliega solo).
- [ ] ¿La Edge Function necesita un secreto nuevo? → añadirlo en Dashboard → Edge Functions → Secrets, no en `.env` de Next.js — no lo va a leer desde ahí.

## Checklist de comparación Dashboard producción vs. desarrollo (2026-08-04)

A petición del propietario del proyecto, para cerrar definitivamente la parte de infraestructura antes de seguir con la validación funcional. Cada punto es algo que Supabase guarda solo en el proyecto (no en este repositorio) y que, si difiere entre producción y desarrollo, puede hacer que una funcionalidad se comporte distinto sin que ningún commit lo explique.

1. **Edge Functions desplegadas** — Dashboard → Edge Functions: mismo listado de funciones en ambos proyectos (hoy: `create-user`; comprobar si `send-notifications` se añade también) y, para cada una, el código realmente pegado coincide con el de este repo cuando exista (`webapp/supabase/functions/create-user/index.ts`).
2. **Edge Function Secrets** — Dashboard → Edge Functions → Secrets: `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` los inyecta Supabase automáticamente en cada función, no hace falta crearlos a mano. Cualquier otro secreto (`RESEND_API_KEY`, `SMTP_*`) solo hace falta si `send-notifications` se despliega también.
3. **Database Webhooks** — Database → Webhooks: confirmar si hay alguno sobre `notificaciones` (u otra tabla) llamando a `send-notifications` — la pregunta abierta ya planteada.
4. **Database Triggers** — Database → Triggers (o Table Editor → cada tabla → pestaña Triggers), en particular sobre `auth.users` (`handle_new_user()`, H-01) y sobre `notificaciones`.
5. **Auth Hooks** — Authentication → Hooks: en particular el hook "Send Email" — si producción lo tiene conectado a una función personalizada (posible explicación adicional de por qué existen `RESEND_API_KEY`/`SMTP_*`: podrían enviar los emails propios de Supabase Auth —confirmación, recuperación de contraseña—, no solo notificaciones de la app).
6. **Authentication → Settings**: SMTP personalizado para los emails propios de Auth (distinto de los secrets de la Edge Function), rate limits de creación de usuarios/envío de email (relevante para la importación masiva), política de contraseña (longitud mínima — si es distinta a la de producción, un Excel válido en producción podría fallar en desarrollo o viceversa), "Confirm email" on/off.
7. **Authentication → URL Configuration**: Site URL y Redirect URLs permitidas — ya se ajustó una vez para recuperación de contraseña (docs/09 § PERF-04); confirmar que cambio de email y cualquier otro flujo de confirmación tienen su URL de desarrollo en la lista.
8. **Authentication → Providers**: que Email/Password esté habilitado igual en ambos, y que no haya ningún proveedor OAuth activo en producción que falte en desarrollo (la app solo usa email/password, pero conviene confirmarlo).
9. **Storage Buckets** — Storage: que exista `portadas-adjuntos` en desarrollo con la misma configuración (público, límite de tamaño de archivo, tipos MIME permitidos) que en producción — nada en este repo lo crea (ver tabla de arriba).
10. **Storage Policies** — Storage → Policies (o `storage.objects` en Table Editor): comparar contra `20260804000100_storage_objects_portadas_adjuntos.sql`, la única pieza de esto que sí vive en el repo — confirmar que está aplicada en ambos proyectos y que no hay ninguna política adicional en producción que no esté en esa migración.
11. **RLS y funciones SQL** — Table Editor → cada tabla → RLS, y Database → Functions: confirmar que las 3 migraciones de `webapp/supabase/migrations/` están aplicadas en ambos proyectos (no solo que existan en el repo).
12. **Database → Replication (Realtime)**: `solicitudes` y `notificaciones` son las dos tablas que la app suscribe por Realtime (`realtime-sync.tsx`, `notif-bell.tsx`) — confirmar que ambas están añadidas a la publicación `supabase_realtime` en los dos proyectos; no hay ninguna migración que lo haga.
13. **Database → Extensions**: `uuid-ossp` (o la que provea `uuid_generate_v4()`, usada como default de varias claves primarias) habilitada en ambos — es anterior a este repositorio, ninguna migración la crea.
14. **Cron jobs** (`pg_cron`, si el proyecto lo usa) — Database → Cron Jobs (o `select * from cron.job` en el SQL Editor): no hay evidencia de que exista ninguno, pero solo se puede confirmar mirando ahí.
15. **Cualquier otra cosa que no encaje en lo anterior**: revisar Database → Roles/permisos concedidos a mano (el ZIP histórico de consultas SQL mencionaba `conceder_permisos.sql`) y Project Settings → API (que las claves anon/service_role de cada proyecto coincidan con las configuradas en Vercel/Secrets correspondientes, nunca cruzadas entre proyectos).

## Limitación de este entorno de trabajo

Todo lo anterior se ha determinado por **lectura exhaustiva del repositorio y de `.github/workflows/webapp-ci.yml`**, no por inspección directa de la configuración real de Vercel ni de ningún proyecto Supabase — este entorno de trabajo no tiene credenciales ni acceso a ninguno de los dos Dashboards. En concreto, quedan sin verificar desde aquí (requieren que el propietario del proyecto las compruebe directamente):
- Que el proyecto de Vercel esté efectivamente configurado con auto-deploy en push a la rama correspondiente (se asume por convención de esta migración, documentada desde la Fase 0, pero no se ha visto la configuración real del proyecto Vercel).
- Qué contenido tiene realmente desplegado la Edge Function `create-user` hoy, en cada proyecto Supabase.
- Si las tres migraciones de `webapp/supabase/migrations/` están realmente aplicadas hoy contra el esquema real de cada proyecto Supabase (desarrollo y producción).
- Si existe hoy un trigger `handle_new_user()` (o cualquier otro) en `auth.users` del proyecto de producción.
- Si existe cualquier cron job (`pg_cron`) en cualquiera de los proyectos.
