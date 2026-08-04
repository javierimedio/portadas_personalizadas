// Tipos compartidos entre la carga de datos de "Mis solicitudes" y el
// formulario modal de Nueva/Editar solicitud (ambos viven en la misma
// página desde que el formulario pasó a ser un modal, no una ruta propia).
//
// covers: PDFs de portadas disponibles, uno por catálogo — sin cambios.
// coversInstrucciones: PDFs de instrucciones, ahora uno POR CATÁLOGO Y POR
// IDIOMA (cambio funcional solicitado explícitamente, no existe en
// index.html) — { [catalogo]: { [idioma]: url } }.
export type FormCampana = {
  id: string;
  nombre: string;
  activa: boolean;
  fecha_cierre: string | null;
  catalogos: string[] | null;
  covers: Record<string, string> | null;
  coversInstrucciones: Record<string, Record<string, string>> | null;
};
export type FormPerfil = { id: string; nombre: string; rol: string | null; activo: boolean };

export type ExistingSolicitudCatalogo = {
  catalogo: string;
  catalogo_digital: boolean | null;
  catalogo_impreso: boolean | null;
  unidades: number | null;
  portada_personalizada: boolean | null;
  portada_diseno_propio: boolean | null;
  portada_opcion_1: string | null;
  portada_opcion_2: string | null;
  portada_opcion_3: string | null;
  posicion_logo: string | null;
  con_precios: boolean | null;
};

export type ExistingAdjunto = { nombre: string; url: string; tipo: string };

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
  solicitud_catalogos: ExistingSolicitudCatalogo[];
  adjuntos: ExistingAdjunto[];
};
