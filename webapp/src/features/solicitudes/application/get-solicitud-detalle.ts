"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { catalogosDeCampana } from "@/shared/domain/catalogos";

export type DetalleCatalogo = {
  catalogo: string;
  label: string;
  color: string;
  hasDisenoProp: boolean;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  portada_opcion_2: string | null;
  portada_opcion_3: string | null;
  portada_elegida: string | null;
  posicion_logo: string | null;
  con_precios: boolean | null;
  unidades: number | null;
};

export type DetalleAdjunto = { id: string; nombre: string; tipo: string; url: string; subido_por_nombre: string | null; created_at: string };
export type DetalleLog = { id: string; usuario_nombre: string | null; accion: string; detalle: Record<string, unknown> | null; created_at: string };

export type SolicitudDetalle = {
  id: string;
  cod_sap: string;
  nombre_empresa: string | null;
  provincia: string | null;
  idioma: string | null;
  canal: string | null;
  comercial_id: string | null;
  campana_id: string | null;
  campanaNombre: string | null;
  comercialNombre: string | null;
  asignado_id: string | null;
  disenadorNombre: string | null;
  estado: string;
  comentarios: string | null;
  updated_at: string;
  catalogos: DetalleCatalogo[];
  adjuntos: DetalleAdjunto[];
  logs: DetalleLog[];
};

// Réplica funcional de openDetalle() (index.html ~3061-3113): carga la
// solicitud, auto-asigna el diseñador si aplica (~3074-3084), y trae
// catálogos/adjuntos/logs/nombres relacionados en paralelo.
//
// `rolEfectivo` es el rol real O el impersonado (ver `getEffectiveRole()`,
// el mismo que ya decide qué botones se muestran en este mismo modal) — el
// original usa `currentPerfil.rol` en `openDetalle()`, una variable global
// que SÍ cambia al impersonar (`impersonateRol()` la reemplaza por
// completo). Consultar el rol real desde `perfiles` en vez de recibir este
// parámetro haría que la autoasignación nunca se disparase mientras un
// admin impersona un rol de diseño para probar el flujo, aunque el resto
// del modal (botones, acciones) sí reflejase correctamente ese rol.
export async function getSolicitudDetalle(solicitudId: string, rolEfectivo?: string | null): Promise<SolicitudDetalle | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { data: sol } = await supabase
    .from("solicitudes")
    .select("id, cod_sap, nombre_empresa, provincia, idioma, canal, comercial_id, campana_id, estado, comentarios, asignado_id, updated_at")
    .eq("id", solicitudId)
    .maybeSingle();
  if (!sol) return null;

  const { data: perfilActual } = userData.user
    ? await supabase.from("perfiles").select("rol, nombre").eq("id", userData.user.id).maybeSingle()
    : { data: null };
  const rolParaAutoasignar = rolEfectivo ?? perfilActual?.rol;

  // Auto-asignación: diseñador/responsable_diseño que abre una solicitud en
  // en_diseno sin diseñador asignado se autoasigna (~3074-3084).
  if (
    sol.estado === "en_diseno" &&
    !sol.asignado_id &&
    userData.user &&
    (rolParaAutoasignar === "disenador" || rolParaAutoasignar === "responsable_diseno")
  ) {
    await supabase.from("solicitudes").update({ asignado_id: userData.user.id }).eq("id", sol.id);
    await supabase.from("logs").insert({
      solicitud_id: sol.id,
      usuario_id: userData.user.id,
      usuario_nombre: perfilActual?.nombre,
      accion: "asignacion",
      detalle: { disenador: perfilActual?.nombre, auto: true },
    });
    sol.asignado_id = userData.user.id;
  }

  const [{ data: campana }, { data: catalogosRaw }, { data: adjuntos }, { data: logs }, { data: comercial }, { data: disenador }] =
    await Promise.all([
      sol.campana_id ? supabase.from("campanas").select("nombre, catalogos").eq("id", sol.campana_id).maybeSingle() : Promise.resolve({ data: null }),
      supabase
        .from("solicitud_catalogos")
        .select(
          "catalogo, catalogo_digital, catalogo_impreso, portada_personalizada, portada_diseno_propio, portada_opcion_1, portada_opcion_2, portada_opcion_3, portada_elegida, posicion_logo, con_precios, unidades"
        )
        .eq("solicitud_id", solicitudId),
      supabase.from("adjuntos").select("id, nombre, tipo, url, subido_por_nombre, created_at").eq("solicitud_id", solicitudId).order("created_at"),
      supabase.from("logs").select("id, usuario_nombre, accion, detalle, created_at").eq("solicitud_id", solicitudId).order("created_at", { ascending: false }),
      sol.comercial_id ? supabase.from("perfiles").select("nombre, codigo").eq("id", sol.comercial_id).maybeSingle() : Promise.resolve({ data: null }),
      sol.asignado_id ? supabase.from("perfiles").select("nombre").eq("id", sol.asignado_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);

  const catDefs = catalogosDeCampana(campana?.catalogos ?? null);
  const catalogos: DetalleCatalogo[] = catDefs
    .map((def) => {
      const row = catalogosRaw?.find((c) => c.catalogo === def.key);
      if (!row) return null;
      return { label: def.label, color: def.color, hasDisenoProp: def.hasDisenoProp, ...row };
    })
    .filter((c): c is DetalleCatalogo => c !== null);

  return {
    id: sol.id,
    cod_sap: sol.cod_sap,
    nombre_empresa: sol.nombre_empresa,
    provincia: sol.provincia,
    idioma: sol.idioma,
    canal: sol.canal,
    comercial_id: sol.comercial_id,
    campana_id: sol.campana_id,
    campanaNombre: campana?.nombre ?? null,
    comercialNombre: comercial?.nombre ?? comercial?.codigo ?? null,
    asignado_id: sol.asignado_id,
    disenadorNombre: disenador?.nombre ?? null,
    estado: sol.estado,
    comentarios: sol.comentarios,
    updated_at: sol.updated_at,
    catalogos,
    adjuntos: adjuntos ?? [],
    logs: logs ?? [],
  };
}
