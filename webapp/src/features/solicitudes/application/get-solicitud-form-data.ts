import { notFound } from "next/navigation";
import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { getDefaultCampanaId } from "@/shared/domain/campanas";

export type FormCampana = { id: string; nombre: string; activa: boolean; catalogos: string[] | null };
export type FormPerfil = { id: string; nombre: string; rol: string | null; activo: boolean };

export type ExistingSolicitud = {
  id: string;
  cod_sap: string;
  nombre_empresa: string | null;
  provincia: string | null;
  idioma: string | null;
  comentarios: string | null;
  campana_id: string | null;
  canal: string | null;
  comercial_id: string | null;
  estado: string;
  solicitud_catalogos: {
    catalogo: string;
    catalogo_digital: boolean | null;
    catalogo_impreso: boolean | null;
    unidades: number | null;
  }[];
};

export type SolicitudFormData = {
  campanas: FormCampana[];
  perfiles: FormPerfil[];
  defaultCampanaId: string;
  solicitud: ExistingSolicitud | null;
};

// Réplica de la carga de datos de openFormModal() (index.html ~2675-2808)
// para el formulario de "Nueva/Editar solicitud". No incluye adjuntos ni
// las secciones ricas de catálogos (portada personalizada, diseño propio,
// posición de logo) — alcance acordado para Fase 2 · Bloque 1.
export async function getSolicitudFormData(solicitudId: string | null): Promise<SolicitudFormData> {
  const supabase = await createClient();

  const [{ data: campanasRaw }, { data: perfilesRaw }] = await Promise.all([
    supabase.from("campanas").select("id, nombre, activa, catalogos, fecha_cierre"),
    supabase.from("perfiles").select("id, nombre, rol, activo"),
  ]);

  const campanas = campanasRaw ?? [];
  let solicitud: ExistingSolicitud | null = null;

  if (solicitudId) {
    const { data } = await supabase
      .from("solicitudes")
      .select(
        "id, cod_sap, nombre_empresa, provincia, idioma, comentarios, campana_id, canal, comercial_id, estado, solicitud_catalogos(catalogo, catalogo_digital, catalogo_impreso, unidades)"
      )
      .eq("id", solicitudId)
      .maybeSingle();
    if (!data) notFound();
    solicitud = { ...data, solicitud_catalogos: data.solicitud_catalogos ?? [] };
  }

  return {
    campanas: campanas.map((c) => ({ id: c.id, nombre: c.nombre, activa: c.activa, catalogos: c.catalogos })),
    perfiles: (perfilesRaw ?? []).map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol, activo: p.activo })),
    defaultCampanaId: getDefaultCampanaId(campanas),
    solicitud,
  };
}
