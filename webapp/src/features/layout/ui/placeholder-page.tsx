// Contenido de las páginas de módulo todavía no migradas, con el mismo
// tratamiento visual (.section-title/.section-sub/.card) que el resto del
// layout — para no desentonar mientras llega su bloque real.
export function PlaceholderPage({ titulo, mensaje }: { titulo: string; mensaje: string }) {
  return (
    <div>
      <div className="section-title">{titulo}</div>
      <div className="card" style={{ color: "var(--c-mid)", fontSize: 13 }}>
        {mensaje}
      </div>
    </div>
  );
}
