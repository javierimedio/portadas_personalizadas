export type AdjuntoDisenado = {
  id: string;
  solicitud_id: string;
  catalogo: string | null;
  nombre: string;
  tipo: string;
  storage_path: string | null;
  url: string;
};

// Busca entre los adjuntos existentes si ya hay un diseno_portada con la
// misma identidad (solicitud + catálogo + nombre de archivo). Si existe,
// el nuevo upload debe reemplazarlo en lugar de crear un duplicado.
//
// La identidad NO incluye extensión normalizada: "20037_wrk.pdf" y
// "20037_wrk.ai" son nombres diferentes y no se reemplazan mutuamente.
// catalogo puede ser null (archivos sin sufijo de catálogo); null y ""
// son identidades distintas y nunca se consideran equivalentes.
export function encontrarDisenoAReemplazar(
  existentes: AdjuntoDisenado[],
  nuevo: { solicitud_id: string; catalogo: string | null; nombre: string }
): AdjuntoDisenado | null {
  return (
    existentes.find(
      (a) =>
        a.tipo === "diseno_portada" &&
        a.solicitud_id === nuevo.solicitud_id &&
        a.catalogo === nuevo.catalogo &&
        a.nombre === nuevo.nombre
    ) ?? null
  );
}

// Ejecuta el reemplazo de un adjunto de diseño con la garantía de que
// el Storage antiguo solo se borra si el UPDATE en BD tuvo éxito.
// Las operaciones de BD y Storage se inyectan como callbacks para
// permitir tests unitarios puros sin depender de Supabase.
//
// Invariante crítica: update → log → borrar (en ese orden, abortar si
// update falla antes de ejecutar log o borrar).
export async function reemplazarDisenoSeguro(
  nuevoPath: string,
  ops: {
    update: () => PromiseLike<{ error: { message: string } | null }>;
    log: () => PromiseLike<unknown>;
    borrar: (path: string) => PromiseLike<unknown>;
    oldPath: string | null;
  }
): Promise<{ error?: string }> {
  const { error } = await ops.update();
  if (error) return { error: error.message };
  await ops.log();
  if (ops.oldPath && ops.oldPath !== nuevoPath) await ops.borrar(ops.oldPath);
  return {};
}
