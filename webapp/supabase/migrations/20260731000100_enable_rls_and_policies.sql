-- ============================================================================
-- RLS y políticas — Fase 0 (docs/06-roadmap.md, docs/03-modelo-datos.md § 3.5)
-- ============================================================================
-- IMPORTANTE — leer antes de aplicar esta migración a ningún proyecto:
--
-- 1. Este archivo asume el esquema descrito en docs/03-modelo-datos.md § 3.4,
--    reconstruido a partir del comportamiento observado en index.html, NO de
--    una inspección directa del esquema SQL real. Antes de aplicar esta
--    migración al proyecto Supabase de DESARROLLO, hay que:
--      a) leer el esquema real desde el SQL Editor del Dashboard del
--         proyecto de PRODUCCIÓN (consultas de solo lectura, sin CLI —
--         ver docs/00-resumen-ejecutivo.md § "Principio de trabajo");
--      b) cargar ese esquema real como línea base en el proyecto de
--         desarrollo, pegándolo en su propio SQL Editor;
--      c) contrastar los nombres/tipos de columna reales contra lo asumido
--         aquí y corregir esta migración si difieren (especialmente:
--         ¿"rol" y "estado" son TEXT o ya son un tipo enumerado?, ¿existe de
--         verdad `solicitudes.canal` como columna propia?).
--    Ver docs/03-modelo-datos.md § 3.1 — ninguna migración de este archivo
--    debe ejecutarse contra producción antes del Cutover (docs/06-roadmap.md).
--
-- 2. El comportamiento del rol legacy `responsable` (sin canal explícito) NO
--    se pudo determinar con certeza solo leyendo index.html — está marcado
--    más abajo como TODO. Verificarlo contra producción antes de habilitar
--    esta policy tal cual.
--
-- 3. Por el principio inamovible (docs/00-resumen-ejecutivo.md), esta
--    migración solo añade RLS — no crea tablas, no renombra columnas, no
--    normaliza roles. Cualquier mejora de esquema identificada está en
--    docs/07-propuestas-futuras.md, no aquí.
-- ============================================================================

-- Funciones auxiliares (docs/03-modelo-datos.md § 3.5)

create or replace function rol_actual()
returns text
language sql stable security definer as $$
    select rol from perfiles where id = auth.uid()
$$;

create or replace function email_actual()
returns text
language sql stable security definer as $$
    select email from perfiles where id = auth.uid()
$$;

-- ── solicitudes ──────────────────────────────────────────────────────────

alter table solicitudes enable row level security;

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

-- ── solicitud_catalogos, adjuntos, logs: heredan la visibilidad de su solicitud ──

alter table solicitud_catalogos enable row level security;

create policy solicitud_catalogos_select on solicitud_catalogos for select
using (exists (
    select 1 from solicitudes s where s.id = solicitud_catalogos.solicitud_id
));

create policy solicitud_catalogos_write on solicitud_catalogos for all
using (exists (
    select 1 from solicitudes s where s.id = solicitud_catalogos.solicitud_id
));

alter table adjuntos enable row level security;

create policy adjuntos_select on adjuntos for select
using (exists (
    select 1 from solicitudes s where s.id = adjuntos.solicitud_id
));

create policy adjuntos_insert on adjuntos for insert
with check (exists (
    select 1 from solicitudes s where s.id = adjuntos.solicitud_id
));

alter table logs enable row level security;

create policy logs_select on logs for select
using (exists (
    select 1 from solicitudes s where s.id = logs.solicitud_id
));

create policy logs_insert on logs for insert
with check (exists (
    select 1 from solicitudes s where s.id = logs.solicitud_id
));

-- ── notificaciones ───────────────────────────────────────────────────────

alter table notificaciones enable row level security;

create policy notificaciones_select on notificaciones for select
using (destinatario = email_actual());

create policy notificaciones_update on notificaciones for update
using (destinatario = email_actual())
with check (destinatario = email_actual());

-- ── campanas: lectura abierta a cualquier autenticado, escritura solo admin/marketing ──

alter table campanas enable row level security;

create policy campanas_select on campanas for select using (true);

create policy campanas_insert on campanas for insert
with check (rol_actual() in ('admin', 'marketing'));

create policy campanas_update on campanas for update
using (rol_actual() in ('admin', 'marketing'));

-- ── perfiles: lectura abierta a cualquier autenticado (se necesita para asignar
--    comerciales/diseñadores, menciones, etc.); escritura solo admin/marketing ──

alter table perfiles enable row level security;

create policy perfiles_select on perfiles for select using (true);

create policy perfiles_update on perfiles for update
using (rol_actual() in ('admin', 'marketing') or id = auth.uid())
with check (rol_actual() in ('admin', 'marketing') or id = auth.uid());
