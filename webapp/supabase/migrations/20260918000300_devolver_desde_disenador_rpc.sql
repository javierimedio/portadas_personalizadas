-- Función que ejecuta la transición en_diseno → pendiente_comercial de forma
-- atómica: estado, comentario e historial en una sola transacción.
--
-- Por qué RPC en lugar de REST directo: ALTER TYPE ... ADD VALUE añade el
-- valor al catálogo de Postgres de inmediato, pero PostgREST valida los
-- valores de columnas enum en la capa HTTP usando su propio cache de esquema.
-- Ese cache no recoge ADD VALUE aunque se envíe NOTIFY pgrst 'reload schema'
-- (bug conocido en PostgREST ≤ 12 — el cache de enum labels se construye
-- desde pg_type/pg_enum al arrancar y no se refresca en caliente). Dentro de
-- una función PL/pgSQL el UPDATE resuelve el enum contra el catálogo vivo de
-- Postgres, sin pasar por el cache de PostgREST, por lo que el valor es
-- aceptado correctamente.
--
-- SECURITY INVOKER: la función corre con el rol y JWT del usuario que la
-- invoca, por lo que RLS (solicitudes_update, logs_insert) sigue aplicando
-- igual que si el cliente hiciera las llamadas REST por separado.

CREATE OR REPLACE FUNCTION devolver_desde_disenador(
    p_solicitud_id uuid,
    p_explicacion  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_estado_actual  text;
    v_usuario_id     uuid;
    v_usuario_nombre text;
BEGIN
    v_usuario_id := auth.uid();
    IF v_usuario_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión no válida.');
    END IF;

    IF trim(p_explicacion) = '' THEN
        RETURN jsonb_build_object('error', 'La explicación es obligatoria.');
    END IF;

    SELECT estado::text INTO v_estado_actual
      FROM solicitudes
     WHERE id = p_solicitud_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Solicitud no encontrada.');
    END IF;

    IF v_estado_actual <> 'en_diseno' THEN
        RETURN jsonb_build_object('error', 'Solo se puede devolver desde en_diseno.');
    END IF;

    SELECT nombre INTO v_usuario_nombre FROM perfiles WHERE id = v_usuario_id;

    -- 1. Actualizar estado (PostgreSQL resuelve el enum contra el catálogo
    --    vivo, sin pasar por el cache de PostgREST).
    UPDATE solicitudes
       SET estado = 'pendiente_comercial'
     WHERE id = p_solicitud_id;

    -- 2. Comentario — visible en la sección Comentarios del detalle.
    INSERT INTO logs (solicitud_id, usuario_id, usuario_nombre, accion, detalle)
    VALUES (
        p_solicitud_id,
        v_usuario_id,
        v_usuario_nombre,
        'comentario',
        jsonb_build_object('texto', trim(p_explicacion), 'fecha', now()::text)
    );

    -- 3. Cambio de estado — visible en el Historial.
    INSERT INTO logs (solicitud_id, usuario_id, usuario_nombre, accion, detalle)
    VALUES (
        p_solicitud_id,
        v_usuario_id,
        v_usuario_nombre,
        'cambio_estado',
        jsonb_build_object(
            'estado_anterior', v_estado_actual,
            'estado_nuevo',    'pendiente_comercial',
            'motivo',          trim(p_explicacion)
        )
    );

    RETURN jsonb_build_object('ok', true);
END;
$$;
