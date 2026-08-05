-- ============================================================================
-- Corrige "new row violates row-level security policy for table solicitudes"
-- al pulsar "Diseño listo → Revisión cliente" como disenador/responsable_diseno.
-- ============================================================================
-- `solicitudes_update` (20260731000100_enable_rls_and_policies.sql) no define
-- `with check` propio, así que Postgres reutiliza el mismo `using` también
-- como `with check` — evaluado contra la FILA NUEVA, no la antigua. La rama
-- de disenador/responsable_diseno exige `estado in ('en_diseno',
-- 'modificar_diseno')`: correcto para decidir QUÉ FILAS puede tocar (según su
-- estado ANTES del update, que es lo que de verdad comprueba `using`), pero
-- ese mismo `estado` vuelve a exigirse sobre la fila DESPUÉS del update — y
-- la única transición que un disenador hace de verdad (`marcarDisenoListo()`
-- → `cambiarEstado(..., 'diseno_en_revision_comercial')`, réplica de
-- "Diseño listo" en index.html ~5532-5556) cambia el estado precisamente a
-- 'diseno_en_revision_comercial', que no está en esa lista. El `update` se
-- ejecuta sin error de PostgREST, pero la fila resultante viola el `with
-- check` implícito y Postgres rechaza la transacción entera.
--
-- Corrección: `with check` explícito, igual que `using` salvo que la rama de
-- disenador/responsable_diseno admite además el estado de destino real de su
-- única transición. No se relaja nada más: siguen sin poder escribir
-- 'confirmada'/'archivada'/etc., que ningún botón visible para su rol dispara
-- (`accionesDetalle()`, `features/solicitudes/domain/estado-flujo.ts`).
-- ============================================================================

drop policy if exists solicitudes_update on solicitudes;

create policy solicitudes_update on solicitudes for update
using (
    rol_actual() in ('admin', 'marketing')
    or comercial_id = auth.uid()
    or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
    or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
    or (rol_actual() in ('disenador', 'responsable_diseno') and estado in ('en_diseno', 'modificar_diseno'))
)
with check (
    rol_actual() in ('admin', 'marketing')
    or comercial_id = auth.uid()
    or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
    or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
    or (rol_actual() in ('disenador', 'responsable_diseno') and estado in ('en_diseno', 'modificar_diseno', 'diseno_en_revision_comercial'))
);
