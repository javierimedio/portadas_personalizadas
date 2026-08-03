import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { getDefaultCampanaId } from "@/shared/domain/campanas";
import { scopeSolicitudesByRole, type SolicitudListItem } from "../domain/table";
import type { FormCampana, FormPerfil } from "../domain/types";

export type SolicitudesListData = {
  rows: SolicitudListItem[];
  // Todas (no solo activas): la insignia de "campaña distinta de la
  // seleccionada" (~2106) necesita poder nombrar campañas ya cerradas, y el
  // formulario modal de edición necesita poder mostrar la propia campaña de
  // la solicitud aunque ya esté cerrada (~2754).
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
};

// Réplica de la carga de datos de #page-mis-solicitudes (loadData() +
// renderComercialTable(), index.html ~2012-2121) y de openFormModal()
// (~2675-2808): ambas viven en la misma página desde que el formulario
// pasó a ser un modal, no una ruta propia, así que se cargan juntas. Las
// filas visibles ya las decide RLS (docs/03-modelo-datos.md § 3.5) según el
// usuario autenticado real; scopeSolicitudesByRole() solo entra en juego
// cuando un admin está impersonando otro rol (rolEfectivo !== rolReal, ver
// getEffectiveRole()) — para un usuario real es un no-op.
export async function getSolicitudesList(rolEfectivo: string | null | undefined): Promise<SolicitudesListData> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const [{ data: solicitudesRaw }, { data: campanasRaw }, { data: perfilesRaw }] = await Promise.all([
    supabase
      .from("solicitudes")
      .select(
        `id, cod_sap, nombre_empresa, provincia, idioma, comentarios, canal, comercial_id, campana_id, estado, updated_at,
         solicitud_catalogos(catalogo, catalogo_digital, catalogo_impreso, unidades, portada_personalizada, portada_diseno_propio, portada_opcion_1, portada_opcion_2, portada_opcion_3, posicion_logo, con_precios),
         adjuntos(nombre, url, tipo)`
      ),
    supabase.from("campanas").select("id, nombre, activa, fecha_cierre, catalogos, covers, covers_instrucciones"),
    supabase.from("perfiles").select("id, nombre, rol, activo"),
  ]);

  const campanas = campanasRaw ?? [];
  const perfiles = perfilesRaw ?? [];
  const rows: SolicitudListItem[] = (solicitudesRaw ?? []).map((s) => ({
    ...s,
    solicitud_catalogos: s.solicitud_catalogos ?? [],
    adjuntos: s.adjuntos ?? [],
  }));

  const scoped = userData.user ? scopeSolicitudesByRole(rows, perfiles, rolEfectivo, userData.user.id) : rows;

  return {
    rows: scoped,
    campanas: campanas.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      activa: c.activa,
      catalogos: c.catalogos,
      covers: c.covers ?? null,
      coversInstrucciones: c.covers_instrucciones ?? null,
    })),
    perfiles: perfiles.map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol, activo: p.activo })),
    defaultCampanaId: getDefaultCampanaId(campanas),
  };
}
