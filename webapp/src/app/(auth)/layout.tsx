// Contenedor común de /login y /recuperar: tarjeta centrada, sin nav — el
// layout con navegación por rol llega en el siguiente bloque (docs/06-roadmap.md).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-lg">{children}</div>
    </div>
  );
}
