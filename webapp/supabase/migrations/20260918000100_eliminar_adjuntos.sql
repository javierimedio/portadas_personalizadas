-- ============================================================================
-- Eliminar portadas: storage_path en adjuntos + RLS + Storage DELETE policy
-- ============================================================================
-- Motivo (ver docs/09-matriz-paridad-funcional.md):
--
-- 1. `adjuntos.storage_path`: los inserts de marcarDisenoListo y
--    solicitarModificacion solo persistían `url` (URL pública completa). Para
--    borrar el objeto de Storage se necesita el path relativo al bucket
--    (e.g. "solicitudes/<id>/diseno/1234_abc_archivo.pdf"). Se añade la
--    columna nullable — las filas anteriores tendrán NULL y el código de
--    borrado derivará el path desde la URL como fallback.
--
-- 2. `adjuntos_delete`: la política actual solo permite borrar si la
--    solicitud está en 'borrador' o el rol es admin/marketing. La nueva
--    política extiende el permiso a disenador/responsable_diseno para los
--    adjuntos de tipo 'diseno_portada', sin restricción de estado.
--
-- 3. `portadas_adjuntos_delete` (storage.objects): no existía ninguna política
--    DELETE para el bucket (ver 20260804000100). Se crea alineada con los
--    mismos roles que la RLS de BD.
-- ============================================================================

ALTER TABLE adjuntos ADD COLUMN IF NOT EXISTS storage_path text;

DROP POLICY IF EXISTS adjuntos_delete ON adjuntos;
CREATE POLICY adjuntos_delete ON adjuntos FOR DELETE USING (
  rol_actual() IN ('admin', 'marketing')
  OR (
    rol_actual() IN ('disenador', 'responsable_diseno')
    AND adjuntos.tipo = 'diseno_portada'
  )
);

DROP POLICY IF EXISTS portadas_adjuntos_delete ON storage.objects;
CREATE POLICY portadas_adjuntos_delete ON storage.objects FOR DELETE USING (
  bucket_id = 'portadas-adjuntos'
  AND auth.role() = 'authenticated'
  AND rol_actual() IN ('admin', 'marketing', 'disenador', 'responsable_diseno')
);
