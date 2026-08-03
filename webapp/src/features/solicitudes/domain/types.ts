// Tipos compartidos entre la carga de datos de "Mis solicitudes" y el
// formulario modal de Nueva/Editar solicitud (ambos viven en la misma
// página desde que el formulario pasó a ser un modal, no una ruta propia).
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
