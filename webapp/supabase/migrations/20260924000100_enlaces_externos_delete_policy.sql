DROP POLICY IF EXISTS adjuntos_delete ON adjuntos;
CREATE POLICY adjuntos_delete ON adjuntos FOR DELETE USING (
  rol_actual() IN ('admin', 'marketing')
  OR (
    rol_actual() IN ('disenador', 'responsable_diseno')
    AND adjuntos.tipo = 'diseno_portada'
  )
  OR (
    adjuntos.tipo = 'enlace_externo'
    AND adjuntos.subido_por = auth.uid()
  )
);
