-- ============================================================================
-- RLS de Storage (storage.objects) para el bucket portadas-adjuntos
-- ============================================================================
-- Investigación (2026-08-04): la carga masiva de portadas fallaba con 400 en
-- POST /storage/v1/object/portadas-adjuntos/.../diseno/...pdf. El mensaje de
-- error real (oculto hasta corregir el manejo de errores en
-- procesarCargaMasiva — ver commit "debug(fase2): diagnóstico temporal del
-- 400 de Storage en carga masiva") es:
--
--   new row violates row-level security policy for table "objects"
--   status: 42501
--
-- Causa: RLS está habilitada en storage.objects (comportamiento por defecto
-- de cualquier proyecto Supabase, no se puede desactivar) pero nunca se creó
-- ninguna policy para el bucket portadas-adjuntos. A diferencia de las
-- tablas de Postgres (20260731000100_enable_rls_and_policies.sql), donde
-- había que hacer DROP de una policy `allow_all` heredada de producción,
-- aquí no existía ni siquiera esa: sin ninguna policy, RLS deniega todo por
-- defecto — de ahí el 400 en cualquier INSERT (subida) al bucket.
--
-- Comprobado ANTES de escribir esto (no se copian políticas a ciegas, según
-- se pidió expresamente): la aplicación —tanto index.html como esta
-- migración a Next.js— usa exclusivamente el bucket `portadas-adjuntos`.
-- El bucket `adjuntos` visible en el Dashboard de Supabase no está
-- referenciado por ningún código de subida, ni en index.html ni en
-- webapp/src (búsqueda por el literal del nombre del bucket, no de la tabla
-- Postgres homónima `adjuntos`, que es una entidad completamente distinta).
-- No hay ningún archivo SQL en este repositorio que defina políticas para
-- `adjuntos` como bucket, así que no hay nada que replicar desde ahí — estas
-- políticas se diseñan desde cero, siguiendo el mismo patrón (DROP defensivo
-- + políticas mínimas) que ya usa 20260731000100_enable_rls_and_policies.sql
-- para las tablas de Postgres.
--
-- Para descartar con datos, no solo por búsqueda de código, que `adjuntos`
-- no tenga políticas relevantes que debieran haberse copiado, ejecutar antes
-- de aplicar esto:
--
--   select policyname, cmd, qual, with_check
--   from pg_policies
--   where schemaname = 'storage' and tablename = 'objects';
--
-- Alcance de la corrección (docs/03-modelo-datos.md § 3.4.4 y línea 389): la
-- migración original no debía añadir restricciones nuevas de Storage, solo
-- mantener el comportamiento actual de producción (acceso abierto, URLs
-- públicas vía getPublicUrl()). Sin ninguna policy el resultado no es
-- "abierto" sino "todo denegado", así que el mínimo necesario para igualar
-- el comportamiento real de la aplicación es:
--
--   - SELECT: público, sin restricción — igual que las URLs públicas de
--     producción (ningún flujo depende de que el visor esté autenticado).
--   - INSERT/UPDATE: solo usuarios autenticados — ningún flujo de la
--     aplicación (ni original ni migrado) sube archivos sin sesión, así que
--     abrirlo también a `anon` sería un permiso más amplio del necesario.
--   - Sin política de DELETE: ni index.html ni esta migración borran nunca
--     un objeto de Storage directamente (eliminarSolicitud/eliminarCampana
--     solo borran filas de la tabla `adjuntos`, dejando el archivo huérfano
--     en el bucket) — no se concede un permiso que la aplicación no usa.
--
-- Todas las políticas se acotan con `bucket_id = 'portadas-adjuntos'` para
-- no afectar a ningún otro bucket del proyecto, incluido `adjuntos`.
-- ============================================================================

drop policy if exists portadas_adjuntos_select on storage.objects;
drop policy if exists portadas_adjuntos_insert on storage.objects;
drop policy if exists portadas_adjuntos_update on storage.objects;

create policy portadas_adjuntos_select on storage.objects for select
using (bucket_id = 'portadas-adjuntos');

create policy portadas_adjuntos_insert on storage.objects for insert
with check (bucket_id = 'portadas-adjuntos' and auth.role() = 'authenticated');

create policy portadas_adjuntos_update on storage.objects for update
using (bucket_id = 'portadas-adjuntos' and auth.role() = 'authenticated')
with check (bucket_id = 'portadas-adjuntos' and auth.role() = 'authenticated');
