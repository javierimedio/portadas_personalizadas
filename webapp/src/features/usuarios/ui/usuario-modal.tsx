"use client";

import { useState } from "react";
import { useToast } from "@/shared/ui/toast";
import { useEscapeToClose } from "@/shared/ui/use-escape-to-close";
import { crearUsuario } from "../application/crear-usuario.action";
import { actualizarUsuario } from "../application/actualizar-usuario.action";
import type { PerfilUsuario } from "../domain/types";

// Réplica de #modal-usuario / openUserModal() / saveUser() (index.html
// ~1213-1271, ~3707-3778): USR-06, USR-07, USR-09, USR-10.
export function UsuarioModal({ usuario, onClose, onSaved }: { usuario: PerfilUsuario | null; onClose: () => void; onSaved: () => void }) {
  const esEdicion = usuario !== null;
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [rol, setRol] = useState(usuario?.rol ?? "comercial_nacional");
  const [codigo, setCodigo] = useState(usuario?.codigo ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEscapeToClose(onClose);

  async function guardar() {
    setError(null);
    setInfo(null);
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y email son obligatorios.");
      return;
    }

    setBusy(true);
    if (esEdicion) {
      const res = await actualizarUsuario(usuario.id, { nombre: nombre.trim(), rol, codigo: codigo.trim() });
      setBusy(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast("Usuario actualizado.");
      onSaved();
    } else {
      if (!password || password.length < 8) {
        setBusy(false);
        setError("La contraseña debe tener mínimo 8 caracteres.");
        return;
      }
      if (!codigo.trim()) {
        setBusy(false);
        setError("El código de usuario es obligatorio.");
        return;
      }
      setInfo("Creando usuario...");
      const res = await crearUsuario({ nombre: nombre.trim(), email: email.trim(), password, rol, codigo: codigo.trim() });
      setBusy(false);
      setInfo(null);
      if (res.error) {
        setError(res.error);
        return;
      }
      toast(`✅ Usuario ${nombre.trim()} creado correctamente.`);
      onSaved();
    }
  }

  return (
    <div className="modal-bg open">
      <div className="modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div className="modal-title">{esEdicion ? "Editar usuario" : "Nuevo usuario"}</div>
          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: ".75rem" }}>
              {error}
            </div>
          )}
          {info && (
            <div className="alert alert-info" style={{ marginBottom: ".75rem" }}>
              {info}
            </div>
          )}
          <div className="form-grid" style={{ marginBottom: ".75rem" }}>
            <div className="form-group">
              <label>
                Nombre completo <span className="req">*</span>
              </label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre y apellidos" />
            </div>
            <div className="form-group">
              <label>
                Email corporativo <span className="req">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@gorfactory.es"
                disabled={esEdicion}
                title={esEdicion ? "El email no se puede cambiar desde aquí" : undefined}
              />
            </div>
          </div>
          <div className="form-grid" style={{ marginBottom: ".75rem" }}>
            <div className="form-group">
              <label>
                Rol <span className="req">*</span>
              </label>
              <select value={rol} onChange={(e) => setRol(e.target.value)}>
                <optgroup label="Comercial">
                  <option value="comercial_nacional">Comercial Nacional</option>
                  <option value="comercial_exportacion">Comercial Exportación</option>
                </optgroup>
                <optgroup label="Responsable Comercial">
                  <option value="responsable_nacional">Resp. Comercial Nacional</option>
                  <option value="responsable_exportacion">Resp. Comercial Exportación</option>
                </optgroup>
                <optgroup label="Responsable Diseño">
                  <option value="responsable_diseno">Resp. Diseño</option>
                </optgroup>
                <optgroup label="Interno">
                  <option value="marketing">Marketing</option>
                  <option value="disenador">Diseñador</option>
                  <option value="admin">Administrador</option>
                </optgroup>
              </select>
            </div>
            <div className="form-group">
              <label>Código</label>
              <input type="text" value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="ej: EXPORT13" />
            </div>
          </div>
          {!esEdicion && (
            <div className="form-group">
              <label>
                Contraseña temporal <span className="req">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mín. 8 caracteres"
                autoComplete="new-password"
              />
              <span style={{ fontSize: 11, color: "var(--c-mid)", marginTop: 3, display: "block" }}>
                El usuario podrá cambiarla después desde su perfil.
              </span>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-outline" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-amber" disabled={busy} onClick={guardar}>
            {esEdicion ? "Guardar cambios" : "Crear usuario"}
          </button>
        </div>
      </div>
    </div>
  );
}
