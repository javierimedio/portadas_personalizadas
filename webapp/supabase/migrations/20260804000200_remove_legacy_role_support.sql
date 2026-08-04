-- ============================================================================
-- H-07 — elimina el soporte del rol legacy `responsable` (sin sufijo de
-- canal) de las políticas de `solicitudes`. Corrige el TODO(verificar) que
-- dejó pendiente 20260731000100_enable_rls_and_policies.sql.
-- ============================================================================
-- Confirmado directamente por el propietario del proyecto (2026-08-04, sobre
-- capturas reales de logs de Supabase): los únicos roles que existen y que
-- debe soportar la aplicación son comercial_nacional, comercial_exportacion,
-- responsable_nacional, responsable_exportacion, responsable_diseno,
-- marketing, disenador y admin. No existe ningún usuario real con el rol
-- legacy `responsable` (ni `comercial` genérico) — ambos son residuos del
-- código original sin ningún caso de uso vigente (H-07/NAV-02/NAV-03: ni
-- siquiera tienen ningún botón de navegación visible en index.html).
--
-- Esta migración solo AFINA las 3 policies de `solicitudes` que todavía
-- mencionaban 'responsable' — no cambia ninguna otra tabla ni política.
-- ============================================================================

drop policy if exists solicitudes_select on solicitudes;

create policy solicitudes_select on solicitudes for select
using (
    rol_actual() in ('admin', 'marketing')
    or comercial_id = auth.uid()
    or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
    or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
    or (
        rol_actual() in ('disenador', 'responsable_diseno')
        and estado in ('en_diseno', 'modificar_diseno', 'diseno_en_revision_comercial', 'confirmada')
    )
);

drop policy if exists solicitudes_insert on solicitudes;

create policy solicitudes_insert on solicitudes for insert
with check (
    rol_actual() in ('admin', 'marketing', 'comercial_nacional', 'comercial_exportacion',
                      'responsable_nacional', 'responsable_exportacion')
);

drop policy if exists solicitudes_delete on solicitudes;

create policy solicitudes_delete on solicitudes for delete
using (
    rol_actual() in ('admin', 'marketing')
    or (
        estado = 'borrador'
        and (
            comercial_id = auth.uid()
            or (rol_actual() = 'responsable_nacional' and canal = 'nacional')
            or (rol_actual() = 'responsable_exportacion' and canal = 'exportacion')
        )
    )
);
