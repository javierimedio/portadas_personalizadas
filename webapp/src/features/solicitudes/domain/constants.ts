// IDIOMAS ahora vive en shared/domain/idiomas.ts: desde el cambio de
// "instrucciones por idioma", Campañas también lo necesita, no solo
// Solicitudes. Se re-exporta aquí para no romper los imports existentes.
export { IDIOMAS } from "@/shared/domain/idiomas";

// Lista fija copiada literalmente del <select> de index.html (~1070-1124):
// 52 provincias/países en orden alfabético, Ceuta/Melilla al final.
export const PROVINCIAS = [
  "Álava",
  "Albacete",
  "Alicante",
  "Almería",
  "Asturias",
  "Ávila",
  "Badajoz",
  "Barcelona",
  "Burgos",
  "Cáceres",
  "Cádiz",
  "Cantabria",
  "Castellón",
  "Ciudad Real",
  "Córdoba",
  "Cuenca",
  "Gerona",
  "Granada",
  "Guadalajara",
  "Guipúzcoa",
  "Huelva",
  "Huesca",
  "Islas Baleares",
  "Jaén",
  "La Coruña",
  "La Rioja",
  "Las Palmas",
  "León",
  "Lérida",
  "Lugo",
  "Madrid",
  "Málaga",
  "Murcia",
  "Navarra",
  "Orense",
  "Palencia",
  "Pontevedra",
  "Salamanca",
  "Santa Cruz de Tenerife",
  "Segovia",
  "Sevilla",
  "Soria",
  "Tarragona",
  "Teruel",
  "Toledo",
  "Valencia",
  "Valladolid",
  "Vizcaya",
  "Zamora",
  "Zaragoza",
  "Ceuta",
  "Melilla",
] as const;

// Réplica de onCanalChange() (~2643-2658): qué roles son asignables a cada
// canal.
export const ROLES_POR_CANAL: Record<"nacional" | "exportacion", string[]> = {
  nacional: ["comercial_nacional", "responsable_nacional"],
  exportacion: ["comercial_exportacion", "responsable_exportacion"],
};

// Réplica del <select> de posición de logo (~2524-2531).
export const POSICIONES_LOGO = ["A", "B", "C"] as const;
