export type CampanaListItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  fecha_cierre: string | null;
  activa: boolean;
  catalogos: string[] | null;
  covers: Record<string, string> | null;
  // { [catalogo]: { [idioma]: url } } — un PDF de instrucciones por
  // catálogo Y por idioma (cambio funcional solicitado explícitamente, no
  // existe en index.html, que solo tenía un único PDF por catálogo).
  covers_instrucciones: Record<string, Record<string, string>> | null;
  solicitudesCount: number;
};
