// Fase 0 (docs/06-roadmap.md): sin funcionalidad visible todavía.
// Esta página solo confirma que el esqueleto y la conexión a Supabase
// de DESARROLLO están correctamente configurados. Se sustituye en la Fase 1
// por el login real.
export default function Home() {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>Portadas Personalizadas — entorno de desarrollo</h1>
      <p>Fase 0: esqueleto sin funcionalidad visible (ver docs/06-roadmap.md).</p>
      <p>
        Variables de entorno de Supabase configuradas:{" "}
        {configured ? "sí" : "no — completa webapp/.env.local a partir de .env.example"}
      </p>
    </main>
  );
}
