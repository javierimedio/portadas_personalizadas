// Réplica funcional de las reglas de transición de estado repartidas por
// `openDetalle()` (index.html ~3315-3363): qué botones de acción están
// disponibles según el rol y el estado actual de la solicitud. Cada regla
// es una función pura y testable, sin acceso a datos — la Server Action
// vuelve a comprobar rol+estado contra la BD antes de escribir nada (esta
// lógica decide qué se OFRECE en la UI, no sustituye la comprobación real).
export const GESTOR_ROLES = ["admin", "marketing"] as const;
export const DISENO_ROLES = ["disenador", "responsable_diseno"] as const;
export const REVISION_CLIENTE_ROLES = [
  "comercial_nacional",
  "comercial_exportacion",
  "responsable_nacional",
  "responsable_exportacion",
  "admin",
  "marketing",
] as const;

function esGestor(rol: string | null | undefined): boolean {
  return rol === "admin" || rol === "marketing";
}

function esRolDeDiseno(rol: string | null | undefined): boolean {
  return rol === "disenador" || rol === "responsable_diseno" || esGestor(rol);
}

export type AccionesDetalle = {
  puedeEditar: boolean;
  puedeEnviarAMarketing: boolean;
  puedeDevolverABorrador: boolean;
  puedeIniciarRevision: boolean;
  puedeEnviarADiseno: boolean;
  puedeAsignarDisenador: boolean;
  puedeAsignarCanal: boolean;
  puedeMarcarDisenoListo: boolean;
  puedeConfirmar: boolean;
  puedeSolicitarModificacion: boolean;
  puedeArchivar: boolean;
  puedeEliminar: boolean;
};

export function accionesDetalle(rol: string | null | undefined, estado: string): AccionesDetalle {
  const gestor = esGestor(rol);
  return {
    puedeEditar: estado === "borrador" || gestor,
    puedeEnviarAMarketing: estado === "borrador",
    puedeDevolverABorrador: gestor && (estado === "enviada" || estado === "en_revision_marketing"),
    puedeIniciarRevision: gestor && estado === "enviada",
    puedeEnviarADiseno: gestor && estado === "en_revision_marketing",
    puedeAsignarDisenador: esRolDeDiseno(rol) && (estado === "en_diseno" || estado === "modificar_diseno"),
    puedeAsignarCanal: gestor,
    puedeMarcarDisenoListo: esRolDeDiseno(rol) && (estado === "en_diseno" || estado === "modificar_diseno"),
    puedeConfirmar:
      estado === "diseno_en_revision_comercial" && (REVISION_CLIENTE_ROLES as readonly string[]).includes(rol ?? ""),
    puedeSolicitarModificacion:
      estado === "diseno_en_revision_comercial" && (REVISION_CLIENTE_ROLES as readonly string[]).includes(rol ?? ""),
    puedeArchivar:
      estado === "diseno_en_revision_comercial" && (REVISION_CLIENTE_ROLES as readonly string[]).includes(rol ?? ""),
    puedeEliminar: estado === "borrador" || rol === "admin",
  };
}

// Réplica de la selección de portada final (~3138-3151): solo marketing/admin,
// solo mientras la solicitud está en revisión de marketing o en diseño, y
// solo si el catálogo tiene portada personalizada sin diseño propio.
export function puedeElegirPortadaFinal(rol: string | null | undefined, estado: string): boolean {
  return esGestor(rol) && (estado === "en_revision_marketing" || estado === "en_diseno");
}
