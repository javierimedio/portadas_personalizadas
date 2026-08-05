-- ============================================================================
-- Dataset base de desarrollo — portadas-personalizadas-dev
--
-- Deja de ser "solo para el Dashboard": esta es la base de datos de prueba
-- que reutilizan también las Fases 2-5 (Solicitudes, Diseño, Campañas,
-- Panel global, Usuarios). Docs relevantes: 06-roadmap.md,
-- 09-matriz-paridad-funcional.md § DASH-01 a DASH-15.
--
-- SOLO para el proyecto de desarrollo. Nunca ejecutar esto contra producción.
--
-- Totalmente reproducible sin editar nada a mano:
-- - Idempotente: borra primero cualquier dato de una ejecución anterior
--   (identificado por `cod_sap like 'TEST-%'` y campañas 'TEST - %') y lo
--   vuelve a insertar desde cero.
-- - Los UUID de los usuarios de prueba se resuelven automáticamente por
--   email contra auth.users (bloque `do $$ ... $$` de más abajo) y se
--   reutilizan en todo el script vía `current_setting('seed.xxx')` — no hay
--   ningún marcador que sustituir a mano.
--
-- ÚNICO REQUISITO PREVIO (no se puede evitar por SQL — perfiles.id es una
-- foreign key contra auth.users(id), la misma razón por la que en este
-- proyecto nunca se escribe directamente en auth.users): que existan en
-- Authentication estos 3 usuarios (con cualquier contraseña, no se usan
-- para iniciar sesión, solo como comercial/diseñador de los datos de
-- prueba):
--   - comercial.nacional.test@gorfactory.es
--   - comercial.exportacion.test@gorfactory.es
--   - disenador.test@gorfactory.es
-- Si en el futuro se recrea el proyecto de Supabase, basta con volver a
-- crear estos 3 usuarios y ejecutar este script tal cual.
-- ============================================================================

begin;

-- 0. Resolver los UUID de los usuarios de prueba por email -----------------
do $$
declare
  v_comercial_nacional    uuid;
  v_comercial_exportacion uuid;
  v_disenador             uuid;
begin
  select id into v_comercial_nacional    from auth.users where email = 'comercial.nacional.test@gorfactory.es';
  select id into v_comercial_exportacion from auth.users where email = 'comercial.exportacion.test@gorfactory.es';
  select id into v_disenador             from auth.users where email = 'disenador.test@gorfactory.es';

  if v_comercial_nacional is null or v_comercial_exportacion is null or v_disenador is null then
    raise exception 'Faltan uno o más usuarios de prueba en Authentication. Créalos primero (ver cabecera del script) y vuelve a ejecutar.';
  end if;

  perform set_config('seed.comercial_nacional',    v_comercial_nacional::text,    false);
  perform set_config('seed.comercial_exportacion', v_comercial_exportacion::text, false);
  perform set_config('seed.disenador',             v_disenador::text,             false);
end $$;

-- 1. Limpieza de datos de prueba de una ejecución anterior ------------------
delete from notificaciones      where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from logs                where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from adjuntos            where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from solicitud_catalogos where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from solicitudes where cod_sap like 'TEST-%';
delete from campanas    where nombre like 'TEST - %';

-- 2. Perfiles de prueba (upsert — los usuarios ya existen en Authentication) -
insert into perfiles (id, nombre, email, rol, codigo, activo)
values
  (current_setting('seed.comercial_nacional')::uuid,    'Comercial Prueba Nacional',    'comercial.nacional.test@gorfactory.es',    'comercial_nacional',    'T-COM-NAC', true),
  (current_setting('seed.comercial_exportacion')::uuid, 'Comercial Prueba Exportación', 'comercial.exportacion.test@gorfactory.es', 'comercial_exportacion', 'T-COM-EXP', true),
  (current_setting('seed.disenador')::uuid,             'Diseñador Prueba',             'disenador.test@gorfactory.es',             'disenador',             'T-DIS',     true)
on conflict (id) do update set
  nombre = excluded.nombre,
  email  = excluded.email,
  rol    = excluded.rol,
  codigo = excluded.codigo,
  activo = excluded.activo;

-- 3. Campañas de prueba ------------------------------------------------------
-- Tres campañas: activa con los 4 catálogos, activa sin xmas (distinta
-- catsForDashboard), e inactiva/cerrada (para Campañas/Panel — filtros de
-- "campaña activa" en las Fases 3 y 5).
insert into campanas (nombre, descripcion, fecha_cierre, activa, catalogos)
values
  ('TEST - Campaña Principal 2026',  'Campaña de prueba (todos los catálogos, activa)', '2026-12-31', true,  '["roly","roly_wrk","stamina","xmas"]'::jsonb),
  ('TEST - Campaña Secundaria 2026', 'Campaña de prueba (sin xmas, activa)',             '2026-06-30', true,  '["roly","roly_wrk","stamina"]'::jsonb),
  ('TEST - Campaña Archivada 2024',  'Campaña de prueba ya cerrada (inactiva)',          '2024-12-31', false, '["roly","roly_wrk","stamina"]'::jsonb);

-- 4. Solicitudes de prueba ---------------------------------------------------
-- 16 solicitudes cubriendo: los 8 estados, las 3 campañas, los 4 catálogos,
-- 4 idiomas (Español + 3 de exportación), 3 comerciales distintos + "sin
-- asignar", con/sin diseñador asignado, con/sin diseño finalizado
-- (diseno_url), y volúmenes de unidades de 10 a 5000.
insert into solicitudes (campana_id, comercial_id, asignado_id, cod_sap, nombre_empresa, idioma, canal, estado)
values
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_nacional')::uuid, null, 'TEST-001', 'Empresa Prueba 1', 'Español', 'nacional', 'borrador'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_nacional')::uuid, null, 'TEST-002', 'Empresa Prueba 2', 'Español', 'nacional', 'enviada'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_exportacion')::uuid, null, 'TEST-003', 'Empresa Prueba 3', 'Inglés', 'exportacion', 'en_revision_marketing'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, current_setting('seed.disenador')::uuid, 'TEST-004', 'Empresa Prueba 4', 'Español', 'nacional', 'en_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, null, 'TEST-005', 'Empresa Prueba 5', 'Francés', 'exportacion', 'en_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_nacional')::uuid, current_setting('seed.disenador')::uuid, 'TEST-006', 'Empresa Prueba 6', 'Español', 'nacional', 'modificar_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_exportacion')::uuid, current_setting('seed.disenador')::uuid, 'TEST-007', 'Empresa Prueba 7', 'Alemán', 'exportacion', 'diseno_en_revision_comercial'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   current_setting('seed.comercial_nacional')::uuid, current_setting('seed.disenador')::uuid, 'TEST-008', 'Empresa Prueba 8', 'Español', 'nacional', 'confirmada'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, null, 'TEST-009', 'Empresa Prueba 9', 'Español', 'nacional', 'archivada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   current_setting('seed.comercial_exportacion')::uuid, null, 'TEST-010', 'Empresa Prueba 10', 'Inglés', 'exportacion', 'enviada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   current_setting('seed.comercial_nacional')::uuid, null, 'TEST-011', 'Empresa Prueba 11', 'Español', 'nacional', 'borrador'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   null, null, 'TEST-012', 'Empresa Prueba 12', 'Español', 'nacional', 'en_revision_marketing'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   null, current_setting('seed.disenador')::uuid, 'TEST-013', 'Empresa Prueba 13', 'Francés', 'exportacion', 'confirmada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   current_setting('seed.comercial_exportacion')::uuid, null, 'TEST-014', 'Empresa Prueba 14', 'Inglés', 'exportacion', 'archivada'),
  ((select id from campanas where nombre = 'TEST - Campaña Archivada 2024'),
   current_setting('seed.comercial_nacional')::uuid, current_setting('seed.disenador')::uuid, 'TEST-015', 'Empresa Prueba 15', 'Español', 'nacional', 'archivada'),
  ((select id from campanas where nombre = 'TEST - Campaña Archivada 2024'),
   current_setting('seed.comercial_exportacion')::uuid, null, 'TEST-016', 'Empresa Prueba 16', 'Inglés', 'exportacion', 'archivada');

-- 5. Catálogos por solicitud --------------------------------------------------
-- catalogo_digital/catalogo_impreso: boolean|null — null = "no tocado".
-- portada_personalizada, con_precios: boolean|null.
-- diseno_url: solo en solicitudes cuyo diseño ya estaría terminado hoy
-- (diseno_en_revision_comercial/confirmada/archivada tras confirmar) — el
-- resto lo deja null.
insert into solicitud_catalogos (solicitud_id, catalogo, catalogo_digital, catalogo_impreso, portada_personalizada, con_precios, unidades, diseno_url)
values
  ((select id from solicitudes where cod_sap = 'TEST-001'), 'roly',     true,  null,  false, null,  50,   null),
  ((select id from solicitudes where cod_sap = 'TEST-002'), 'roly_wrk', true,  true,  true,  null,  120,  null),
  ((select id from solicitudes where cod_sap = 'TEST-003'), 'stamina',  false, true,  true,  true,  300,  null),
  ((select id from solicitudes where cod_sap = 'TEST-004'), 'xmas',     true,  true,  true,  true,  1000, null),
  ((select id from solicitudes where cod_sap = 'TEST-005'), 'roly',     true,  false, false, null,  75,   null),
  ((select id from solicitudes where cod_sap = 'TEST-006'), 'stamina',  true,  true,  true,  false, 450,  null),
  ((select id from solicitudes where cod_sap = 'TEST-007'), 'roly_wrk', true,  true,  true,  null,  200,  'https://example-dev-bucket/test/TEST-007-roly_wrk.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-008'), 'xmas',     true,  true,  true,  true,  800,  'https://example-dev-bucket/test/TEST-008-xmas.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-008'), 'stamina',  true,  true,  false, false, 600,  'https://example-dev-bucket/test/TEST-008-stamina.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-009'), 'roly',     true,  null,  false, null,  30,   null),
  ((select id from solicitudes where cod_sap = 'TEST-010'), 'roly_wrk', true,  true,  false, null,  5000, null),
  ((select id from solicitudes where cod_sap = 'TEST-011'), 'stamina',  false, true,  false, null,  10,   null),
  ((select id from solicitudes where cod_sap = 'TEST-012'), 'roly',     true,  false, false, null,  90,   null),
  ((select id from solicitudes where cod_sap = 'TEST-013'), 'roly',     true,  true,  true,  null,  150,  'https://example-dev-bucket/test/TEST-013-roly.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-013'), 'roly_wrk', true,  true,  true,  null,  150,  'https://example-dev-bucket/test/TEST-013-roly_wrk.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-014'), 'stamina',  false, true,  false, null,  60,   null),
  ((select id from solicitudes where cod_sap = 'TEST-015'), 'roly',     true,  true,  true,  null,  40,   'https://example-dev-bucket/test/TEST-015-roly.pdf'),
  ((select id from solicitudes where cod_sap = 'TEST-016'), 'stamina',  false, true,  false, null,  20,   null);

-- 6. Adjuntos de prueba -------------------------------------------------------
-- Un logo de cliente + un diseño final por cada solicitud que ya tendría
-- diseño terminado hoy (mismas filas de solicitud_catalogos con
-- diseno_url) — útil desde ya para la Fase 2 (ver adjuntos existentes).
insert into adjuntos (solicitud_id, nombre, tipo, url, subido_por, subido_por_nombre, catalogo)
values
  ((select id from solicitudes where cod_sap = 'TEST-007'), 'logo-empresa-7.png',  'logo_general',   'https://example-dev-bucket/test/TEST-007-logo.png',     current_setting('seed.comercial_exportacion')::uuid, 'Comercial Prueba Exportación', null),
  ((select id from solicitudes where cod_sap = 'TEST-007'), 'diseno-roly_wrk.pdf', 'diseno_portada', 'https://example-dev-bucket/test/TEST-007-roly_wrk.pdf', current_setting('seed.disenador')::uuid, 'Diseñador Prueba', 'roly_wrk'),
  ((select id from solicitudes where cod_sap = 'TEST-008'), 'logo-empresa-8.png',  'logo_general',   'https://example-dev-bucket/test/TEST-008-logo.png',     current_setting('seed.comercial_nacional')::uuid, 'Comercial Prueba Nacional', null),
  ((select id from solicitudes where cod_sap = 'TEST-008'), 'diseno-xmas.pdf',     'diseno_portada', 'https://example-dev-bucket/test/TEST-008-xmas.pdf',     current_setting('seed.disenador')::uuid, 'Diseñador Prueba', 'xmas'),
  ((select id from solicitudes where cod_sap = 'TEST-013'), 'diseno-roly.pdf',     'diseno_portada', 'https://example-dev-bucket/test/TEST-013-roly.pdf',     current_setting('seed.disenador')::uuid, 'Diseñador Prueba', 'roly');

-- 7. Historial / comentarios de prueba ---------------------------------------
-- Mezcla de cambio_estado, asignacion y comentario (con @mención) — útil
-- desde ya para la Fase 2 (hilo de comentarios y autocompletado).
insert into logs (solicitud_id, usuario_id, usuario_nombre, accion, detalle)
values
  ((select id from solicitudes where cod_sap = 'TEST-002'), current_setting('seed.comercial_nacional')::uuid, 'Comercial Prueba Nacional', 'cambio_estado', '{"de":"borrador","a":"enviada"}'::jsonb),
  ((select id from solicitudes where cod_sap = 'TEST-004'), current_setting('seed.disenador')::uuid, 'Diseñador Prueba', 'asignacion', '{"asignado_a":"Diseñador Prueba"}'::jsonb),
  ((select id from solicitudes where cod_sap = 'TEST-006'), current_setting('seed.comercial_nacional')::uuid, 'Comercial Prueba Nacional', 'comentario', '{"texto":"@Diseñador Prueba ¿podéis mover el logo un poco más arriba?"}'::jsonb),
  ((select id from solicitudes where cod_sap = 'TEST-007'), current_setting('seed.disenador')::uuid, 'Diseñador Prueba', 'cambio_estado', '{"de":"en_diseno","a":"diseno_en_revision_comercial"}'::jsonb),
  ((select id from solicitudes where cod_sap = 'TEST-008'), current_setting('seed.comercial_nacional')::uuid, 'Comercial Prueba Nacional', 'comentario', '{"texto":"Confirmado, queda perfecto. Gracias @Diseñador Prueba"}'::jsonb);

-- 8. Notificaciones de prueba -------------------------------------------------
-- `enviado`/`enviado_at` se dejan en false/null a propósito: es el
-- comportamiento real de hoy (H-03 / NOT-12 de la matriz de paridad — la
-- preferencia de notificación nunca llega a marcar nada como enviado).
insert into notificaciones (solicitud_id, destinatario, asunto, cuerpo, enviado, enviado_at)
values
  ((select id from solicitudes where cod_sap = 'TEST-002'), 'marketing@dev.test', 'Nueva solicitud enviada', 'Empresa Prueba 2 ha enviado una solicitud para revisión.', false, null),
  ((select id from solicitudes where cod_sap = 'TEST-007'), 'comercial.exportacion.test@gorfactory.es', 'Diseño listo para revisión', 'El diseño de Empresa Prueba 7 está listo para tu revisión.', false, null),
  ((select id from solicitudes where cod_sap = 'TEST-006'), 'disenador.test@gorfactory.es', 'Nuevo comentario', 'Comercial Prueba Nacional te ha mencionado en un comentario.', false, null);

commit;

-- ============================================================================
-- Verificación rápida tras ejecutar (opcional, solo lectura):
--
-- select estado, count(*) from solicitudes where cod_sap like 'TEST-%' group by estado order by 1;
-- -- Debe mostrar las 8 filas de estado con al menos 1 cada una (2 en
-- -- archivada se reparten entre las 3 campañas).
-- ============================================================================
