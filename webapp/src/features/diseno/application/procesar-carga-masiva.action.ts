"use server";

import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { cambiarEstado } from "@/features/solicitudes/application/detalle-actions";
import { matchCargaFile, type CargaMasivaSolicitud, type FileResultado } from "../domain/carga-masiva";
import { borrarArchivosStorage, storagePathDesdeUrl } from "@/shared/storage/server";
import { portadasObligatoriasPendientes, mensajePortadasPendientes } from "@/features/solicitudes/domain/portadas-validation";
import type { UploadedFile } from "@/shared/storage/types";

// Réplica de procesarCargaMasiva() (index.html ~5291-5360): el emparejamiento
// se recalcula aquí contra el estado real en BD (no contra lo que el
// cliente tenía en memoria al abrir el modal), y solo se procesan los
// archivos que resuelven a 'ok'. La notificación por solicitud (CM-08) la
// dispara cambiarEstado() al cambiar el estado — una sola vez por
// solicitud, aunque tenga varios archivos, igual que el original.
//
// Arquitectura de subida (docs/09-matriz-paridad-funcional.md §
// "Arquitectura de subida de archivos", 2026-08-04): cada archivo se sube a
// Storage desde el navegador ANTES de llamar aquí, a una ruta de staging
// que no depende de a qué solicitud termine perteneciendo (eso solo se
// sabe tras recalcular el emparejamiento contra la BD real, que es
// justamente lo que hace esta función). Los archivos que no encuentran
// solicitud o catálogo destino se borran de Storage para no acumular
// basura de subidas mal nombradas.
export async function procesarCargaMasiva(
  archivos: UploadedFile[]
): Promise<{ resultados: FileResultado[]; ok: number; errors: number; detalles?: string[] } | { error: string }> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: "Sesión no válida." };
  const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", userData.user.id).maybeSingle();

  if (!archivos.length) return { resultados: [], ok: 0, errors: 0 };

  const { data: solicitudesRaw } = await supabase
    .from("solicitudes")
    .select("id, cod_sap, nombre_empresa, estado, solicitud_catalogos(catalogo, portada_personalizada)")
    .in("estado", ["en_diseno", "modificar_diseno"]);
  const solicitudes: CargaMasivaSolicitud[] = (solicitudesRaw ?? []).map((s) => ({
    ...s,
    solicitud_catalogos: s.solicitud_catalogos ?? [],
  }));

  let ok = 0;
  let errors = 0;
  const resultados: FileResultado[] = [];
  // Maps solId → cod_sap for error messages about blocked transitions
  const processedSols = new Map<string, string>();
  const detalles: string[] = [];
  const sinUso: string[] = [];

  for (const archivo of archivos) {
    const match = matchCargaFile(archivo.nombre, solicitudes);
    if (match.status !== "ok") {
      errors++;
      sinUso.push(archivo.path);
      const razon =
        match.status === "notfound" ? `SAP ${match.sap} no encontrado en diseño` : `catálogo ${match.catKey} sin portada personalizada`;
      detalles.push(`${archivo.nombre}: ${razon}`);
      resultados.push({ nombre: archivo.nombre, ok: false, mensaje: razon });
      continue;
    }

    try {
      const { data: existente } = await supabase
        .from("adjuntos")
        .select("id, storage_path, url")
        .eq("solicitud_id", match.solId)
        .eq("tipo", "diseno_portada")
        .eq("catalogo", match.catKey ?? "")
        .eq("nombre", archivo.nombre)
        .maybeSingle();

      if (existente) {
        const { error } = await supabase
          .from("adjuntos")
          .update({ url: archivo.url, storage_path: archivo.path, subido_por: userData.user.id, subido_por_nombre: perfil?.nombre ?? null })
          .eq("id", existente.id);
        if (error) throw error;
        const oldPath = existente.storage_path ?? storagePathDesdeUrl(existente.url);
        if (oldPath && oldPath !== archivo.path) await borrarArchivosStorage(supabase, [oldPath]);
      } else {
        const { error } = await supabase.from("adjuntos").insert({
          solicitud_id: match.solId,
          nombre: archivo.nombre,
          url: archivo.url,
          tipo: "diseno_portada",
          catalogo: match.catKey,
          subido_por: userData.user.id,
          subido_por_nombre: perfil?.nombre,
        });
        if (error) throw error;
      }

      resultados.push({ nombre: archivo.nombre, ok: true });
      if (!processedSols.has(match.solId)) {
        const sol = solicitudes.find((s) => s.id === match.solId);
        processedSols.set(match.solId, sol?.cod_sap ?? match.solId);
      }
      ok++;
    } catch (e) {
      console.error("CARGA MASIVA — error procesando archivo", { fileName: archivo.nombre, path: archivo.path, error: e });
      errors++;
      sinUso.push(archivo.path);
      const mensaje = e instanceof Error ? e.message : JSON.stringify(e);
      detalles.push(`${archivo.nombre}: ${mensaje}`);
      resultados.push({ nombre: archivo.nombre, ok: false, mensaje });
    }
  }

  await borrarArchivosStorage(supabase, sinUso);

  // Validar portadas completas antes de transicionar cada solicitud
  for (const [solId, codSap] of processedSols) {
    const { data: cats } = await supabase
      .from("solicitud_catalogos")
      .select("catalogo, portada_personalizada, portada_diseno_propio")
      .eq("solicitud_id", solId);

    const { data: adjs } = await supabase
      .from("adjuntos")
      .select("tipo, catalogo")
      .eq("solicitud_id", solId)
      .eq("tipo", "diseno_portada");

    const faltantes = portadasObligatoriasPendientes(cats ?? [], adjs ?? []);
    if (faltantes.length > 0) {
      detalles.push(`SAP ${codSap}: ${mensajePortadasPendientes(faltantes)}`);
    } else {
      await cambiarEstado(solId, "diseno_en_revision_comercial");
    }
  }

  return { resultados, ok, errors, detalles: detalles.length ? detalles : undefined };
}
