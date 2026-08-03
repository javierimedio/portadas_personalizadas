import { createClient } from "@/shared/infrastructure/supabase/server-client";
import { ROL_LABELS } from "@/features/layout/domain/nav-items";
import { NotifPrefForm } from "@/features/perfil/ui/notif-pref-form";
import { DatosForm } from "@/features/perfil/ui/datos-form";
import { PasswordForm } from "@/features/perfil/ui/password-form";

// Réplica de #page-perfil (index.html ~877-965). Accesible para cualquier
// rol (incluidos los roles legacy genéricos de H-07, que no tienen ningún
// otro item de nav) — "todos, vía header", igual que hoy
// (docs/05-flujo-navegacion.md).
export default async function PerfilPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const { data: perfil } = data.user
    ? await supabase.from("perfiles").select("nombre, rol, codigo, notif_preferencia").eq("id", data.user.id).maybeSingle()
    : { data: null };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div className="section-title" style={{ marginBottom: ".25rem" }}>
        Mi cuenta
      </div>
      <div className="section-sub">Consulta y actualiza tu información personal</div>

      <NotifPrefForm value={perfil?.notif_preferencia ?? "ambas"} />
      <DatosForm nombre={perfil?.nombre ?? ""} email={data.user?.email ?? ""} />
      <PasswordForm />

      <div className="card">
        <div className="card-title">Información de cuenta</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
          <div>
            <div className="field-label-sm">Rol</div>
            <div className="readonly-box">{perfil?.rol ? ROL_LABELS[perfil.rol] ?? perfil.rol : "—"}</div>
          </div>
          <div>
            <div className="field-label-sm">Código</div>
            <div className="readonly-box" style={{ fontFamily: "monospace" }}>
              {perfil?.codigo ?? "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
