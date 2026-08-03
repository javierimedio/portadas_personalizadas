import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { getDefaultCampanaId } from "@/shared/domain/campanas";
import { scopeSolicitudesByRole, type SolicitudListItem } from "../domain/table";

export type SolicitudesListData = {
  rows: SolicitudListItem[];
  // Todas (no solo activas): la insignia de "campaña distinta de la
  // seleccionada" (~2106) necesita poder nombrar campañas ya cerradas.
  campanas: { id: string; nombre: string; activa: boolean }[];
  defaultCampanaId: string;
};

// Réplica de la carga de datos de #page-mis-solicitudes (loadData() +
// renderComercialTable(), index.html ~2012-2121): las filas visibles ya
// las decide RLS (docs/03-modelo-datos.md § 3.5) según el usuario
// autenticado real; scopeSolicitudesByRole() solo entra en juego cuando un
// admin está impersonando otro rol (rolEfectivo !== rolReal, ver
// getEffectiveRole()) — para un usuario real es un no-op.
export async function getSolicitudesList(rolEfectivo: string | null | undefined): Promise<SolicitudesListData> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: solicitudesRaw }, { data: campanasRaw }, { data: perfilesRaw }] = await Promise.all([
    supabase
      .from("solicitudes")
      .select(
        "id, cod_sap, nombre_empresa, provincia, idioma, canal, comercial_id, campana_id, estado, updated_at, solicitud_catalogos(catalogo, catalogo_digital, catalogo_impreso, unidades, portada_personalizada, portada_diseno_propio, portada_opcion_1)"
      ),
    supabase.from("campanas").select("id, nombre, activa, fecha_cierre"),
    supabase.from("perfiles").select("id, rol"),
  ]);

  const campanas = campanasRaw ?? [];
  const perfiles = perfilesRaw ?? [];
  const rows: SolicitudListItem[] = (solicitudesRaw ?? []).map((s) => ({
    ...s,
    solicitud_catalogos: s.solicitud_catalogos ?? [],
  }));

  const scoped = userData.user ? scopeSolicitudesByRole(rows, perfiles, rolEfectivo, userData.user.id) : rows;

  return {
    rows: scoped,
    campanas: campanas.map((c) => ({ id: c.id, nombre: c.nombre, activa: c.activa })),
    defaultCampanaId: getDefaultCampanaId(campanas),
  };
}
