import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { activeCampanaId, campanaBanner, type CampanaBanner } from "@/shared/domain/campanas";
import {
  catsForDashboard,
  comercialesChartData,
  computeKpis,
  estadoChartData,
  filterByResponsableCanal,
  idiomasChartData,
  portadasChartData,
  progresoData,
  tipoChartData,
  unidadesCatalogoChartData,
  unidadesPorIdiomaChartData,
  type Campana,
  type Perfil,
  type Solicitud,
} from "../domain/dashboard-stats";

export type DashboardData = {
  campanas: { id: string; nombre: string; esDefault: boolean }[];
  campanaSeleccionada: string; // "" = todas las campañas
  campanaActivaBanner: CampanaBanner | null;
  kpis: ReturnType<typeof computeKpis>;
  estadoChart: ReturnType<typeof estadoChartData>;
  comercialesChart: ReturnType<typeof comercialesChartData>;
  unidadesChart: ReturnType<typeof unidadesCatalogoChartData>;
  portadasChart: ReturnType<typeof portadasChartData>;
  tipoChart: ReturnType<typeof tipoChartData>;
  idiomasChart: ReturnType<typeof idiomasChartData>;
  unidadesIdiomaChart: ReturnType<typeof unidadesPorIdiomaChartData>;
  progreso: ReturnType<typeof progresoData>;
};

// Réplica de renderDashboard() (index.html ~4189-4529): misma fuente de
// datos (solicitudes visibles por RLS para este rol, con sus catálogos y el
// perfil del comercial), mismo filtrado y mismos cálculos — movidos a un
// Server Component en vez de al cliente.
export async function getDashboardData(
  rol: string | null | undefined,
  campanaParam: string | undefined,
  activeOverrideId?: string | null
): Promise<DashboardData> {
  const supabase = await createClient();

  const [{ data: campanasRaw }, { data: perfilesRaw }, { data: solicitudesRaw }] = await Promise.all([
    supabase.from("campanas").select("id, nombre, activa, fecha_cierre, catalogos"),
    supabase.from("perfiles").select("id, rol"),
    supabase
      .from("solicitudes")
      .select(
        "id, estado, campana_id, comercial_id, idioma, canal, solicitud_catalogos(catalogo, unidades, catalogo_digital, catalogo_impreso, portada_personalizada, con_precios), perfiles!solicitudes_comercial_id_fkey(nombre, codigo)"
      ),
  ]);

  const campanas: Campana[] = campanasRaw ?? [];
  const perfiles: Perfil[] = perfilesRaw ?? [];
  // activeCampanaId() usa por debajo el mismo algoritmo puro
  // (getDefaultCampanaId) que este módulo ya tenía, añadiendo por encima la
  // "campaña activa" de sesión (CAMP-01/CAMP-05/CAMP-15) — el original tiene
  // aquí un bug real: setActiveCampana() asigna `activeCampana = c` y en la
  // siguiente línea llama a loadAndRenderCampanas(), que internamente
  // recalcula y sobreescribe esa misma variable con el default algorítmico
  // — la elección del usuario nunca sobrevive más allá de esa asignación
  // síncrona. Se corrige aquí con una selección de sesión que sí persiste
  // (cookie, igual que en Campañas/Solicitudes/Diseño).
  const resolvedDefaultId = activeCampanaId(campanas, activeOverrideId);

  // Réplica de dashSel (~4192-4194): sin parámetro en la URL se usa la
  // campaña por defecto; con el parámetro presente (incluido vacío, "Todas
  // las campañas"), se respeta tal cual.
  const campanaId = campanaParam !== undefined ? campanaParam : resolvedDefaultId;

  // Sin tipos generados de Supabase todavía (docs/06-roadmap.md — Fase 0),
  // el embed de perfiles se infiere como array aunque en tiempo de
  // ejecución es un único objeto (comercial_id → perfiles.id es many-to-one).
  // Se maneja cualquiera de las dos formas para no romper si esto cambia.
  const todasSolicitudes: Solicitud[] = (solicitudesRaw ?? []).map((s) => {
    const comercial = Array.isArray(s.perfiles) ? s.perfiles[0] : s.perfiles;
    return {
      id: s.id,
      estado: s.estado,
      campana_id: s.campana_id,
      comercial_id: s.comercial_id,
      idioma: s.idioma,
      canal: s.canal,
      comercial_nombre: comercial?.nombre ?? null,
      comercial_codigo: comercial?.codigo ?? null,
      solicitud_catalogos: s.solicitud_catalogos ?? [],
    };
  });

  let sols = campanaId ? todasSolicitudes.filter((s) => s.campana_id === campanaId) : todasSolicitudes;
  sols = filterByResponsableCanal(sols, perfiles, rol);

  const campanaSeleccionada = campanaId ? campanas.find((c) => c.id === campanaId) ?? null : null;
  const campanaNombre = campanaId ? campanaSeleccionada?.nombre ?? "—" : "Todas las campañas";
  const cats = catsForDashboard(campanaSeleccionada?.catalogos ?? null);

  const kpis = computeKpis(sols, campanaNombre);
  const idiomas = idiomasChartData(sols);

  return {
    campanas: campanas
      .filter((c) => c.activa)
      .map((c) => ({ id: c.id, nombre: c.nombre, esDefault: c.id === resolvedDefaultId })),
    campanaSeleccionada: campanaId,
    // Réplica de renderCampanaBanner() (~2366-2393, CAMP-03): sobre la
    // campaña activa de sesión, no sobre la seleccionada en el filtro.
    campanaActivaBanner: campanaBanner(campanas.find((c) => c.id === resolvedDefaultId) ?? null),
    kpis,
    estadoChart: estadoChartData(sols),
    comercialesChart: comercialesChartData(sols),
    unidadesChart: unidadesCatalogoChartData(sols, cats),
    portadasChart: portadasChartData(sols, cats),
    tipoChart: tipoChartData(sols, cats),
    idiomasChart: idiomas,
    unidadesIdiomaChart: unidadesPorIdiomaChartData(sols, cats, idiomas.labels),
    progreso: progresoData(sols, kpis.total),
  };
}
