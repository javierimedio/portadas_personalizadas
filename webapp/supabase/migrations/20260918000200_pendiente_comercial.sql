ALTER TYPE estado_solicitud ADD VALUE IF NOT EXISTS 'pendiente_comercial';

-- solicitudes_select: diseñadores pueden ver 'pendiente_comercial' para
-- consultar el historial de lo que devolvieron y para que los inserts de
-- logs y notificaciones (que delegan a esta policy via EXISTS) funcionen
-- correctamente tras la transición en_diseno → pendiente_comercial.
DROP POLICY IF EXISTS solicitudes_select ON solicitudes;

CREATE POLICY solicitudes_select ON solicitudes FOR SELECT
USING (
    rol_actual() IN ('admin', 'marketing')
    OR comercial_id = auth.uid()
    OR (rol_actual() = 'responsable_nacional' AND canal = 'nacional')
    OR (rol_actual() = 'responsable_exportacion' AND canal = 'exportacion')
    OR rol_actual() = 'responsable'
    OR (
        rol_actual() IN ('disenador', 'responsable_diseno')
        AND estado IN ('en_diseno', 'modificar_diseno', 'diseno_en_revision_comercial', 'confirmada', 'pendiente_comercial')
    )
);

-- solicitudes_update WITH CHECK: permite a diseñadores escribir
-- 'pendiente_comercial' como estado de destino (en_diseno → pendiente_comercial).
-- El USING no cambia (el estado de partida sigue siendo en_diseno/modificar_diseno).
DROP POLICY IF EXISTS solicitudes_update ON solicitudes;

CREATE POLICY solicitudes_update ON solicitudes FOR UPDATE
USING (
    rol_actual() IN ('admin', 'marketing')
    OR comercial_id = auth.uid()
    OR (rol_actual() = 'responsable_nacional' AND canal = 'nacional')
    OR (rol_actual() = 'responsable_exportacion' AND canal = 'exportacion')
    OR (rol_actual() IN ('disenador', 'responsable_diseno') AND estado IN ('en_diseno', 'modificar_diseno'))
)
WITH CHECK (
    rol_actual() IN ('admin', 'marketing')
    OR comercial_id = auth.uid()
    OR (rol_actual() = 'responsable_nacional' AND canal = 'nacional')
    OR (rol_actual() = 'responsable_exportacion' AND canal = 'exportacion')
    OR (rol_actual() IN ('disenador', 'responsable_diseno') AND estado IN ('en_diseno', 'modificar_diseno', 'diseno_en_revision_comercial', 'pendiente_comercial'))
);
