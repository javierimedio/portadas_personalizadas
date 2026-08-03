-- ============================================================================
-- Datos de prueba para validar el Dashboard (Fase 1, bloque Dashboard) contra
-- index.html — docs/09-matriz-paridad-funcional.md § DASH-01 a DASH-15.
--
-- SOLO para el proyecto de desarrollo (portadas-personalizadas-dev). Nunca
-- ejecutar esto contra producción.
--
-- Idempotente: borra primero cualquier dato de prueba de una ejecución
-- anterior (identificado por `cod_sap like 'TEST-%'` y campañas cuyo nombre
-- empieza por "TEST - "), y lo vuelve a insertar desde cero. Se puede
-- ejecutar tantas veces como haga falta sin duplicar nada.
--
-- REQUISITO PREVIO (obligatorio, no se puede evitar por SQL):
-- `perfiles.id` es una foreign key contra `auth.users(id)` — no se puede
-- insertar un perfil de prueba sin que exista antes el usuario real en
-- Authentication (la misma razón por la que no manipulamos auth.users
-- directamente en ningún otro punto de este proyecto). Antes de ejecutar
-- este script:
--
--   1. Dashboard del proyecto de desarrollo → Authentication → Users →
--      Add user → Create new user, para cada uno de estos 3 usuarios
--      (marca "Auto Confirm User" si aparece la opción):
--        - comercial.nacional.test@gorfactory.es
--        - comercial.exportacion.test@gorfactory.es
--        - disenador.test@gorfactory.es
--      (la contraseña no importa para este bloque, no vas a iniciar sesión
--      con ellos — solo se usan como comercial/diseñador asignados en los
--      datos de prueba)
--   2. Copia el UID de cada uno (columna "UID" en la lista de usuarios).
--   3. Sustituye los tres marcadores <uuid_comercial_nacional>,
--      <uuid_comercial_exportacion> y <uuid_disenador> más abajo por esos
--      UID reales antes de ejecutar el script completo en el SQL Editor.
-- ============================================================================

begin;

-- 0. Limpieza de datos de prueba de una ejecución anterior ------------------
delete from solicitud_catalogos where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from adjuntos          where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from logs              where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from notificaciones    where solicitud_id in (select id from solicitudes where cod_sap like 'TEST-%');
delete from solicitudes where cod_sap like 'TEST-%';
delete from campanas    where nombre like 'TEST - %';

-- 1. Perfiles de prueba (upsert — no se borran, ya existen sus usuarios) ----
insert into perfiles (id, nombre, email, rol, activo)
values
  ('<uuid_comercial_nacional>',    'Comercial Prueba Nacional',     'comercial.nacional.test@gorfactory.es',    'comercial_nacional',    true),
  ('<uuid_comercial_exportacion>', 'Comercial Prueba Exportación',  'comercial.exportacion.test@gorfactory.es', 'comercial_exportacion', true),
  ('<uuid_disenador>',             'Diseñador Prueba',              'disenador.test@gorfactory.es',             'disenador',             true)
on conflict (id) do update set
  nombre = excluded.nombre,
  email  = excluded.email,
  rol    = excluded.rol,
  activo = excluded.activo;

-- 2. Campañas de prueba ------------------------------------------------------
-- Dos campañas activas con distinta fecha_cierre (para ejercitar cuál es la
-- "por defecto") y distinta lista de catálogos (la principal con los 4, la
-- secundaria sin xmas — para ejercitar catsForDashboard con ambos casos).
insert into campanas (nombre, descripcion, fecha_cierre, activa, catalogos)
values
  ('TEST - Campaña Principal 2026',   'Campaña de prueba — Dashboard (todos los catálogos)', '2026-12-31', true, '["roly","roly_wrk","stamina","xmas"]'::jsonb),
  ('TEST - Campaña Secundaria 2026',  'Campaña de prueba — Dashboard (sin xmas)',             '2026-06-30', true, '["roly","roly_wrk","stamina"]'::jsonb);

-- 3. Solicitudes de prueba ---------------------------------------------------
-- 14 solicitudes cubriendo: los 8 estados, las 2 campañas, los 4 catálogos,
-- 4 idiomas (Español + 3 de exportación), 3 comerciales distintos + "sin
-- asignar", con/sin diseñador asignado, con/sin diseño finalizado
-- (diseno_url), y volúmenes de unidades de 10 a 5000.

insert into solicitudes (campana_id, comercial_id, asignado_id, cod_sap, nombre_empresa, idioma, canal, estado)
values
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_nacional>', null, 'TEST-001', 'Empresa Prueba 1', 'Español', 'nacional', 'borrador'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_nacional>', null, 'TEST-002', 'Empresa Prueba 2', 'Español', 'nacional', 'enviada'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_exportacion>', null, 'TEST-003', 'Empresa Prueba 3', 'Inglés', 'exportacion', 'en_revision_marketing'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, '<uuid_disenador>', 'TEST-004', 'Empresa Prueba 4', 'Español', 'nacional', 'en_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, null, 'TEST-005', 'Empresa Prueba 5', 'Francés', 'exportacion', 'en_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_nacional>', '<uuid_disenador>', 'TEST-006', 'Empresa Prueba 6', 'Español', 'nacional', 'modificar_diseno'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_exportacion>', '<uuid_disenador>', 'TEST-007', 'Empresa Prueba 7', 'Alemán', 'exportacion', 'diseno_en_revision_comercial'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   '<uuid_comercial_nacional>', '<uuid_disenador>', 'TEST-008', 'Empresa Prueba 8', 'Español', 'nacional', 'confirmada'),
  ((select id from campanas where nombre = 'TEST - Campaña Principal 2026'),
   null, null, 'TEST-009', 'Empresa Prueba 9', 'Español', 'nacional', 'archivada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   '<uuid_comercial_exportacion>', null, 'TEST-010', 'Empresa Prueba 10', 'Inglés', 'exportacion', 'enviada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   '<uuid_comercial_nacional>', null, 'TEST-011', 'Empresa Prueba 11', 'Español', 'nacional', 'borrador'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   null, null, 'TEST-012', 'Empresa Prueba 12', 'Español', 'nacional', 'en_revision_marketing'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   null, '<uuid_disenador>', 'TEST-013', 'Empresa Prueba 13', 'Francés', 'exportacion', 'confirmada'),
  ((select id from campanas where nombre = 'TEST - Campaña Secundaria 2026'),
   '<uuid_comercial_exportacion>', null, 'TEST-014', 'Empresa Prueba 14', 'Inglés', 'exportacion', 'archivada');

-- 4. Catálogos por solicitud --------------------------------------------------
-- catalogo_digital/catalogo_impreso: boolean|null — null = "no tocado".
-- portada_personalizada, con_precios: boolean|null.
-- diseno_url: solo en solicitudes cuyo diseño ya estaría terminado hoy
-- (diseno_en_revision_comercial/confirmada) — el resto lo deja null.

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
  ((select id from solicitudes where cod_sap = 'TEST-014'), 'stamina',  false, true,  false, null,  60,   null);

commit;

-- ============================================================================
-- Verificación rápida tras ejecutar (opcional, solo lectura):
--
-- select estado, count(*) from solicitudes where cod_sap like 'TEST-%' group by estado order by 1;
-- -- Debe mostrar las 8 filas de estado con al menos 1 cada una.
-- ============================================================================
