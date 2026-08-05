// Lo único que un Server Action recibe de un archivo ya subido: nunca el
// binario (docs/09-matriz-paridad-funcional.md § arquitectura de subida de
// archivos, 2026-08-04).
export type UploadedFile = {
  path: string;
  url: string;
  nombre: string;
  tipo: string;
  size: number;
};
