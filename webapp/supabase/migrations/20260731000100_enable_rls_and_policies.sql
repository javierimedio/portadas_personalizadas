-- ============================================================================
-- RLS y políticas — Fase 0 (docs/06-roadmap.md, docs/03-modelo-datos.md § 3.5)
-- Versión reconciliada contra el esquema real de producción (verificado por
-- SQL Editor el 2026-07-31, ver docs/03-modelo-datos.md § 3.4-3.5).
-- ============================================================================
-- Hallazgos que motivan la forma de este archivo (detalle completo en
-- docs/03-modelo-datos.md § 3.4.1):
--
-- 1. RLS YA ESTÁ HABILITADA en las 7 tablas en producción, pero cada una
--    tiene una política `allow_all` (USING true, aplicable al rol `public`
--    — incluye peticiones sin login) que neutraliza cualquier otra política
--    permisiva por el OR con el que Postgres las combina. Por eso este
--    archivo empieza cada bloque con `DROP POLICY IF EXISTS allow_all` —
--    sin eso, todo lo que sigue no tendría ningún efecto real.
-- 2. `solicitudes` tiene además una política real, `comercial_solo_sus_solicitudes`,
--    que solo cubre el caso del rol comercial (sin admin/marketing/diseño/
--    responsables). Se elimina y se sustituye por `solicitudes_select`/
--    `solicitudes_update`/`solicitudes_delete`, que cubre el mismo caso y el
--    resto de roles.
-- 3. `rol` (perfiles) y `estado` (solicitudes) son enums reales
--    (`rol_usuario`, `estado_solicitud`) en producción, no texto libre como
--    se asumió en el diseño inicial — no cambia la lógica de las policies
--    (el cast enum→text es automático), solo se documenta aquí para que no
--    sorprenda.
-- 4. El enum `estado_solicitud` tiene un valor adicional, `diseno_en_revision`
--    (sin sufijo `_comercial`), confirmado como inerte por lectura directa
--    de index.html (docs/03-modelo-datos.md § 3.4.2) — no se incluye en
--    ninguna condición de este archivo a propósito.
-- 5. `index.html` SÍ borra filas de verdad (`eliminarSolicitud`,
--    `eliminarCampana`) — sobre solicitudes, solicitud_catalogos, adjuntos,
--    logs, notificaciones y campanas. Sin políticas DELETE, RLS deniega esa
--    operación por defecto para todo el mundo, incluido admin: sería una
--    regresión real, no una mejora de seguridad. `perfiles` es la única
--    tabla sin política DELETE a propósito — nunca se borra un usuario en
--    index.html, solo se desactiva (`activo`).
-- 6. `marketing` puede ver y borrar solicitudes en cualquier estado a través
--    de `eliminarCampana` (borra en cascada todas las solicitudes de la
--    campaña sin filtrar por estado, y solo admin/marketing llegan a esa
--    función) — no solo las que están en `borrador`. Las políticas DELETE
--    de solicitudes y de las tablas que cuelgan de ella reflejan esto.
--
-- El comportamiento del rol legacy `responsable` (sin canal explícito) NO se
-- pudo determinar con certeza solo leyendo index.html — sigue pendiente de
-- verificación antes de aplicar esta migración a ningún proyecto (ver TODO
-- más abajo).
--
-- Por el principio inamovible (docs/00-resumen-ejecutivo.md), esta migración
-- solo añade/corrige RLS — no crea tablas, no renombra columnas, no
-- normaliza roles. Cualquier mejora de esquema identificada está en
-- docs/07-propuestas-futuras.md, no aquí.
-- ============================================================================

-- Funciones auxiliares (docs/03-modelo-datos.md § 3.5)

create or replace function rol_actual()
returns text  -- cast automático desde el enum rol_usuario
language sql stable security definer as $$
    select rol::text from perfiles where id = auth.uid()
$$;

create or replace function email_actual()
returns text
language sql stable security definer as $$
    select email from perfiles where id = auth.uid()
$$;

-- ── solicitudes ──────────────────────────────────────────────────────────

drop policy if exists allow_all on solicitudes;
drop policy if exists comercial_solo_sus_solicitudes on solicitudes;

create policy solicitudes_select on solicitudes for select
using (
    rol_actual() in ('admin', 'marketing')
    or comercial_id = auth.uid()
    or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
    or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
    -- TODO(verificar): comportamiento real de 'responsable' (legacy, sin canal) antes de habilitar en producción.
    or rol_actual() = 'responsable'
    or (
        rol_actual() in ('disenador', 'responsable_diseno')
        and estado in ('en_diseno', 'modificar_diseno', 'diseno_en_revision_comercial', 'confirmada')
        -- NO se incluye 'diseno_en_revision' (sin sufijo): valor de enum inerte, ver cabecera.
    )
);

create policy solicitudes_insert on solicitudes for insert
with check (
    rol_actual() in ('admin', 'marketing', 'comercial_nacional', 'comercial_exportacion', 'comercial',
                      'responsable_nacional', 'responsable_exportacion', 'responsable')
);

create policy solicitudes_update on solicitudes for update
using (
    rol_actual() in ('admin', 'marketing')
    or comercial_id = auth.uid()
    or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
    or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
    or (rol_actual() in ('disenador', 'responsable_diseno') and estado in ('en_diseno', 'modificar_diseno'))
);

create policy solicitudes_delete on solicitudes for delete
using (
    rol_actual() in ('admin', 'marketing') -- cualquier estado: eliminarSolicitud (admin) y eliminarCampana (admin/marketing, sin filtrar por estado)
    or (
        estado = 'borrador' -- el resto de roles solo puede borrar mientras está en borrador (botón "Eliminar" del detalle), y solo si además pueden ver la fila
        and (
            comercial_id = auth.uid()
            or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
            or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
            or rol_actual() = 'responsable'
        )
    )
);

-- ── solicitud_catalogos, adjuntos, logs: heredan la visibilidad/borrado de su solicitud ──
-- Nota: NO se usa una única política FOR ALL para select/insert/update/delete —
-- eso permitiría borrar con solo poder VER la solicitud padre, sin exigir
-- borrador/admin/marketing (el mismo error de diseño que allow_all).

drop policy if exists allow_all on solicitud_catalogos;
drop policy if exists solicitud_catalogos_all on solicitud_catalogos; -- por si ya se creó como FOR ALL en una aplicación anterior de este archivo

create policy solicitud_catalogos_select on solicitud_catalogos for select
using (exists (select 1 from solicitudes s where s.id = solicitud_catalogos.solicitud_id));

create policy solicitud_catalogos_insert on solicitud_catalogos for insert
with check (exists (select 1 from solicitudes s where s.id = solicitud_catalogos.solicitud_id));

create policy solicitud_catalogos_update on solicitud_catalogos for update
using (exists (select 1 from solicitudes s where s.id = solicitud_catalogos.solicitud_id));

create policy solicitud_catalogos_delete on solicitud_catalogos for delete
using (exists (
    select 1 from solicitudes s
    where s.id = solicitud_catalogos.solicitud_id
      and (s.estado = 'borrador' or rol_actual() in ('admin', 'marketing'))
));

drop policy if exists allow_all on adjuntos;

create policy adjuntos_select on adjuntos for select
using (exists (select 1 from solicitudes s where s.id = adjuntos.solicitud_id));

create policy adjuntos_insert on adjuntos for insert
with check (exists (select 1 from solicitudes s where s.id = adjuntos.solicitud_id));

create policy adjuntos_delete on adjuntos for delete
using (exists (
    select 1 from solicitudes s
    where s.id = adjuntos.solicitud_id
      and (s.estado = 'borrador' or rol_actual() in ('admin', 'marketing'))
));

drop policy if exists allow_all on logs;

create policy logs_select on logs for select
using (exists (select 1 from solicitudes s where s.id = logs.solicitud_id));

create policy logs_insert on logs for insert
with check (exists (select 1 from solicitudes s where s.id = logs.solicitud_id));

create policy logs_delete on logs for delete
using (exists (
    select 1 from solicitudes s
    where s.id = logs.solicitud_id
      and (s.estado = 'borrador' or rol_actual() in ('admin', 'marketing'))
));

-- ── notificaciones ───────────────────────────────────────────────────────

drop policy if exists allow_all on notificaciones;

create policy notificaciones_select on notificaciones for select
using (destinatario = email_actual());

create policy notificaciones_update on notificaciones for update
using (destinatario = email_actual())
with check (destinatario = email_actual());

create policy notificaciones_delete on notificaciones for delete
using (exists (
    select 1 from solicitudes s
    where s.id = notificaciones.solicitud_id
      and (s.estado = 'borrador' or rol_actual() in ('admin', 'marketing'))
));

-- ── campanas: lectura abierta a cualquier autenticado, escritura solo admin/marketing ──

drop policy if exists allow_all on campanas;

create policy campanas_select on campanas for select using (true);

create policy campanas_insert on campanas for insert
with check (rol_actual() in ('admin', 'marketing'));

create policy campanas_update on campanas for update
using (rol_actual() in ('admin', 'marketing'));

create policy campanas_delete on campanas for delete
using (rol_actual() in ('admin', 'marketing'));

-- ── perfiles: lectura abierta a cualquier autenticado (se necesita para asignar
--    comerciales/diseñadores, menciones, etc.); escritura solo admin/marketing.
--    SIN política DELETE a propósito: index.html nunca borra un usuario,
--    solo lo desactiva (toggleUser cambia "activo") ──

drop policy if exists allow_all on perfiles;

create policy perfiles_select on perfiles for select using (true);

create policy perfiles_update on perfiles for update
using (rol_actual() in ('admin', 'marketing') or id = auth.uid())
with check (rol_actual() in ('admin', 'marketing') or id = auth.uid());
