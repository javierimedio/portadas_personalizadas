// Réplica de las validaciones de saveSolicitud() en index.html (~2816-2894).
// Función pura, sin acceso a datos (comprobación de SAP duplicado y de
// cierre de campaña se hacen en la Server Action, que sí tiene acceso a la
// base de datos) — SOL-01/03/04, y la parte de "al menos un catálogo" de
// EST-01 cuando el destino es 'enviada'.
export type DatosGeneralesInput = {
  codSap: string;
  idioma: string;
  provincia: string;
};

export function validateDatosGenerales(input: DatosGeneralesInput): string[] {
  const errors: string[] = [];
  if (!input.codSap.trim()) errors.push("Código SAP");
  if (!input.idioma) errors.push("Idioma");
  if (!input.provincia.trim() && input.idioma === "Español") errors.push("Provincia / Región");
  return errors;
}

// Un catálogo "tocado" es aquel donde digital o impreso ya se ha marcado
// (sea true o false) — si ambos están sin definir, el catálogo se ignora
// por completo (~2866, igual que missingFields()).
export type CatalogoFormInput = {
  key: string;
  label: string;
  digital: boolean | null;
  impreso: boolean | null;
  unidades: number | null;
  hasDisenoProp: boolean;
  // Campos de la sección completa de catálogos (bloque 2 de la Fase 2) —
  // opcionales aquí porque el formulario de este bloque todavía no los
  // pide; la función ya queda correcta para cuando lo hagan.
  portadaPersonalizada?: boolean | null;
  disenoPropio?: boolean | null;
  opcion1?: string | null;
  posicionLogo?: string | null;
};

export function validateCatalogosParaEnvio(catalogos: CatalogoFormInput[]): string[] {
  const errors: string[] = [];
  let atLeastOneCat = false;

  for (const cat of catalogos) {
    const tocado = cat.digital !== null || cat.impreso !== null;
    if (!tocado) continue;
    atLeastOneCat = true;

    if (cat.impreso === true && !cat.unidades) {
      errors.push(`${cat.label} — Unidades`);
    }
    if (cat.portadaPersonalizada === true) {
      const disenoPropio = cat.hasDisenoProp && cat.disenoPropio === true;
      if (!disenoPropio) {
        if (!cat.opcion1) errors.push(`${cat.label} — Selección 1`);
        if (!cat.posicionLogo) errors.push(`${cat.label} — Posición logo`);
      }
    }
  }

  if (!atLeastOneCat) errors.push("Al menos un catálogo debe estar configurado");
  return errors;
}

// Réplica del truncado de errores (~2892): máximo 3 nombres + "y N más".
export function formatearErrores(errors: string[]): string {
  const visibles = errors.slice(0, 3).join(", ");
  const resto = errors.length > 3 ? ` y ${errors.length - 3} más` : "";
  return `Completa los campos obligatorios: ${visibles}${resto}`;
}
