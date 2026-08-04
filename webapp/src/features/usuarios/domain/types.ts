export type PerfilUsuario = {
  id: string;
  nombre: string;
  email: string;
  rol: string | null;
  codigo: string | null;
  activo: boolean;
  created_at: string | null;
};
