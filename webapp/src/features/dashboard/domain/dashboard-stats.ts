// Réplica exacta de renderDashboard() y sus helpers en index.html
// (~4184-4529, ~1615-1655). Sin dependencias de React/Next/Supabase a
// propósito — toda esta lógica es cálculo puro sobre datos ya cargados
// (regla de dependencias de docs/04-estructura-carpetas.md).

export type SolicitudCatalogo = {
  catalogo: string;
  unidades: number | null;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  portada_personalizada: boolean | null;
  con_precios: boolean | null;
};

export type Solicitud = {
  id: string;
  estado: string;
  campana_id: string | null;
  comercial_id: string | null;
  idioma: string | null;
  canal: string | null;
  comercial_nombre: string | null;
  comercial_codigo: string | null;
  solicitud_catalogos: SolicitudCatalogo[];
};

export type Perfil = { id: string; rol: string | null };

export type Campana = {
  id: string;
  nombre: string;
  activa: boolean;
  fecha_cierre: string | null;
  catalogos: string[] | null;
};

export type CatDef = { key: string; label: string };

export const ALL_CATS: CatDef[] = [
  { key: "roly", label: "ROLY" },
  { key: "roly_wrk", label: "ROLY WRK" },
  { key: "stamina", label: "STAMINA" },
  { key: "xmas", label: "XMAS" },
];

// El fallback de la campaña "Todas" es TODOS los catálogos (~4226); el de
// una campaña sin lista propia es solo los 3 históricos (~1855) — son dos
// defaults distintos en el original, no el mismo, y hay que preservarlo.
export function catsForDashboard(catalogos: string[] | null | undefined): CatDef[] {
  const keys = catalogos || ALL_CATS.map((c) => c.key);
  return ALL_CATS.filter((c) => keys.includes(c.key));
}

export const ESTADO_ORDER = [
  "borrador",
  "enviada",
  "en_revision_marketing",
  "en_diseno",
  "diseno_en_revision_comercial",
  "modificar_diseno",
  "confirmada",
  "archivada",
] as const;

export const ESTADO_LABEL: Record<string, string> = {
  borrador: "Borrador",
  enviada: "Enviada",
  en_revision_marketing: "En revisión",
  en_diseno: "En diseño",
  diseno_en_revision_comercial: "Revisión cliente",
  modificar_diseno: "Modificar diseño",
  confirmada: "Confirmada",
  archivada: "Archivada",
};

export const ESTADO_COLORS = [
  "#E0DED6",
  "#F59E0B",
  "#003087",
  "#534AB7",
  "#FAB518",
  "#E30613",
  "#3B6D11",
  "#9CA3AF",
];

const CAT_KEYS = ["roly", "roly_wrk", "stamina", "xmas"];

export function getDefaultCampanaId(campanas: Campana[]): string {
  if (!campanas.length) return "";
  const activas = campanas.filter((c) => c.activa);
  if (!activas.length) return campanas[0]?.id ?? "";
  const sorted = [...activas].sort((a, b) => {
    const da = a.fecha_cierre ? new Date(a.fecha_cierre).getTime() : 0;
    const db = b.fecha_cierre ? new Date(b.fecha_cierre).getTime() : 0;
    return db - da;
  });
  return sorted[0]?.id ?? "";
}

// Réplica del filtro de renderDashboard() para responsable_nacional /
// responsable_exportacion (~4199-4207) — RLS ya limita qué filas llegan
// aquí para estos roles, esto reproduce la agrupación exacta usada para
// las estadísticas, no es la única barrera de seguridad.
export function filterByResponsableCanal(
  sols: Solicitud[],
  perfiles: Perfil[],
  rol: string | null | undefined
): Solicitud[] {
  if (rol === "responsable_nacional") {
    const ids = new Set(
      perfiles.filter((p) => p.rol === "comercial_nacional" || p.rol === "responsable_nacional").map((p) => p.id)
    );
    return sols.filter((s) => (s.comercial_id !== null && ids.has(s.comercial_id)) || s.canal === "nacional");
  }
  if (rol === "responsable_exportacion") {
    const ids = new Set(
      perfiles
        .filter((p) => p.rol === "comercial_exportacion" || p.rol === "responsable_exportacion")
        .map((p) => p.id)
    );
    return sols.filter((s) => (s.comercial_id !== null && ids.has(s.comercial_id)) || s.canal === "exportacion");
  }
  return sols;
}

export function fmtNum(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function unidadesDeCatalogo(sol: Solicitud, key: string): number {
  return sol.solicitud_catalogos.find((c) => c.catalogo === key)?.unidades ?? 0;
}

function sumUnidades(sols: Solicitud[], keys: string[]): number {
  return sols.reduce((acc, s) => acc + keys.reduce((b, k) => b + unidadesDeCatalogo(s, k), 0), 0);
}

export type KpiCard = { num: string | number; label: string; tone: "" | "amber" | "blue" | "green" };

export type DashboardKpis = {
  total: number;
  campanaLabel: string;
  estado: KpiCard[];
  unidades: KpiCard[];
  precios: KpiCard[];
};

// ~4212-4273. `total` excluye archivadas a propósito (denominador también
// usado luego en los tooltips de porcentaje del gráfico de estados y en la
// barra de progreso — igual que en el original).
export function computeKpis(sols: Solicitud[], campanaNombre: string): DashboardKpis {
  const archivadas = sols.filter((s) => s.estado === "archivada").length;
  const activas = sols.filter((s) => s.estado !== "archivada");
  const total = activas.length;
  const confirmadas = activas.filter((s) => s.estado === "confirmada").length;
  const enDiseno = activas.filter((s) => s.estado === "en_diseno" || s.estado === "modificar_diseno").length;
  const enRevision = activas.filter((s) => s.estado === "en_revision_marketing").length;
  const revisionCliente = activas.filter((s) => s.estado === "diseno_en_revision_comercial").length;

  const unTotal = sumUnidades(sols, CAT_KEYS);
  const unNacional = sumUnidades(
    sols.filter((s) => (s.idioma ?? "").toUpperCase() === "ESPAÑOL"),
    CAT_KEYS
  );
  const unExport = sumUnidades(
    sols.filter((s) => (s.idioma ?? "").toUpperCase() !== "ESPAÑOL" && s.idioma),
    CAT_KEYS
  );

  const solEspanol = sols.filter((s) => (s.idioma ?? "").toUpperCase() === "ESPAÑOL");
  let unConPrecios = 0;
  let unSinPrecios = 0;
  solEspanol.forEach((s) => {
    ["stamina", "xmas"].forEach((catKey) => {
      const cat = s.solicitud_catalogos.find((c) => c.catalogo === catKey);
      if (!cat || cat.catalogo_impreso === null) return;
      const unds = cat.unidades ?? 0;
      if (cat.con_precios === true) unConPrecios += unds;
      else if (cat.con_precios === false) unSinPrecios += unds;
    });
  });

  return {
    total,
    campanaLabel: `${campanaNombre} · ${total} solicitudes${archivadas ? ` (+ ${archivadas} archivadas)` : ""}`,
    estado: [
      { num: total, label: "Total solicitudes", tone: "" },
      { num: activas.filter((s) => s.estado === "borrador").length, label: "Borrador", tone: "" },
      { num: activas.filter((s) => s.estado === "enviada").length, label: "Enviadas", tone: "amber" },
      { num: enRevision, label: "En revisión de marketing", tone: "" },
      { num: enDiseno, label: "En diseño", tone: "blue" },
      { num: revisionCliente, label: "En revisión del cliente", tone: "" },
      { num: confirmadas, label: "Completadas ✓", tone: "green" },
      { num: archivadas, label: "Archivadas", tone: "" },
    ],
    unidades: [
      { num: fmtNum(unTotal), label: "Total unidades", tone: "" },
      { num: fmtNum(unNacional), label: "Total Nacional (ES)", tone: "" },
      { num: fmtNum(unExport), label: "Total Export", tone: "" },
    ],
    precios: [
      { num: fmtNum(unConPrecios), label: "Con precios (ES)", tone: "" },
      { num: fmtNum(unSinPrecios), label: "Sin precios (ES)", tone: "" },
    ],
  };
}

// ── Datos de los 7 gráficos (~4303-4500) ──────────────────────────────────

export function estadoChartData(sols: Solicitud[]) {
  const counts = ESTADO_ORDER.map((e) => sols.filter((s) => s.estado === e).length);
  const labels = ESTADO_ORDER.map((e) => ESTADO_LABEL[e] ?? e);
  return { labels, counts, colors: ESTADO_COLORS };
}

export function comercialesChartData(sols: Solicitud[]) {
  const map = new Map<string, number>();
  sols.forEach((s) => {
    const nombre = s.comercial_nombre || s.comercial_codigo || "Sin asignar";
    map.set(nombre, (map.get(nombre) ?? 0) + 1);
  });
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { labels: entries.map((e) => e[0]), counts: entries.map((e) => e[1]) };
}

export const CAT_COLORS_GENERAL: Record<string, string> = {
  roly: "#003087",
  roly_wrk: "#FAB518",
  stamina: "#6B7280",
  xmas: "#E30613",
};

export function unidadesCatalogoChartData(sols: Solicitud[], cats: CatDef[]) {
  return {
    labels: cats.map((c) => c.label),
    counts: cats.map((c) => sumUnidades(sols, [c.key])),
    colors: cats.map((c) => CAT_COLORS_GENERAL[c.key] ?? "#888"),
  };
}

export function portadasChartData(sols: Solicitud[], cats: CatDef[]) {
  const conPortada = cats.map(
    (c) =>
      sols.filter((s) => s.solicitud_catalogos.find((x) => x.catalogo === c.key)?.portada_personalizada === true)
        .length
  );
  const sinPortada = cats.map((c, i) => {
    const withCat = sols.filter((s) => {
      const cat = s.solicitud_catalogos.find((x) => x.catalogo === c.key);
      return cat !== undefined && (cat.catalogo_digital !== null || cat.catalogo_impreso !== null);
    }).length;
    return Math.max(0, withCat - (conPortada[i] ?? 0));
  });
  return {
    labels: cats.map((c) => c.label),
    conPortada,
    sinPortada,
    colors: cats.map((c) => CAT_COLORS_GENERAL[c.key] ?? "#888"),
  };
}

export function tipoChartData(sols: Solicitud[], cats: CatDef[]) {
  return {
    labels: cats.map((c) => c.label),
    digital: cats.map(
      (c) => sols.filter((s) => s.solicitud_catalogos.find((x) => x.catalogo === c.key)?.catalogo_digital).length
    ),
    impreso: cats.map(
      (c) => sols.filter((s) => s.solicitud_catalogos.find((x) => x.catalogo === c.key)?.catalogo_impreso).length
    ),
  };
}

export function idiomasChartData(sols: Solicitud[]) {
  const map = new Map<string, number>();
  sols.forEach((s) => {
    const idioma = s.idioma || "Sin especificar";
    map.set(idioma, (map.get(idioma) ?? 0) + 1);
  });
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  return { labels: entries.map((e) => e[0]), counts: entries.map((e) => e[1]) };
}

export const CAT_COLORS_IDIOMA: Record<string, string> = {
  roly: "#003087",
  roly_wrk: "#FAB518",
  stamina: "#E30613",
  xmas: "#C0392B",
};

// idiomaLabels debe ser el mismo top-10 ya calculado por idiomasChartData —
// el original reutiliza literalmente `idiomaEntries`, no calcula un top-10
// propio por unidades (~4472-4485).
export function unidadesPorIdiomaChartData(sols: Solicitud[], cats: CatDef[], idiomaLabels: string[]) {
  return {
    idiomaLabels,
    datasets: cats.map((cat) => ({
      label: cat.label,
      color: CAT_COLORS_IDIOMA[cat.key] ?? "#888",
      data: idiomaLabels.map((idioma) =>
        sols
          .filter((s) => (s.idioma || "Sin especificar") === idioma)
          .reduce((acc, s) => acc + unidadesDeCatalogo(s, cat.key), 0)
      ),
    })),
  };
}

export type ProgresoStep = { label: string; color: string; count: number; pct: number };

const PROGRESO_STEPS: { estados: string[]; label: string; color: string }[] = [
  { estados: ["borrador"], label: "Borrador", color: "#E0DED6" },
  { estados: ["enviada"], label: "Enviadas", color: "#F59E0B" },
  { estados: ["en_revision_marketing"], label: "En revisión", color: "#003087" },
  { estados: ["en_diseno", "modificar_diseno"], label: "En diseño", color: "#534AB7" },
  { estados: ["diseno_en_revision_comercial"], label: "Revisión cliente", color: "#FAB518" },
  { estados: ["confirmada"], label: "Completadas", color: "#3B6D11" },
  { estados: ["archivada"], label: "Archivadas", color: "#9CA3AF" },
];

// Oculto si total (activas) es 0 — igual que el original (~4513).
export function progresoData(sols: Solicitud[], total: number): ProgresoStep[] {
  if (total <= 0) return [];
  return PROGRESO_STEPS.map((step) => {
    const count = sols.filter((s) => step.estados.includes(s.estado)).length;
    return { label: step.label, color: step.color, count, pct: Math.round((count / total) * 100) };
  });
}
