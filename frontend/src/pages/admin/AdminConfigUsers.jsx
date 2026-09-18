import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import api, { formatApiError } from "../../lib/api";

export default function AdminConfigUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get("/admin/config-users").then((r) => setUsers(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      toast.error("Completa nombre, correo y una contraseña de al menos 6 caracteres");
      return;
    }
    setSaving(true);
    try {
      await api.post("/admin/config-users", form);
      toast.success("Usuario de Configuración creado");
      setForm({ name: "", email: "", password: "" });
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo crear el usuario");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (uid, email) => {
    if (!window.confirm(`¿Eliminar el acceso de ${email}?`)) return;
    try {
      await api.delete(`/admin/config-users/${uid}`);
      toast.success("Usuario eliminado");
      load();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || "No se pudo eliminar");
    }
  };

  return (
    <div data-testid="admin-config-users">
      <h1 className="font-display text-4xl font-black uppercase tracking-tighter">Usuarios de Configuración</h1>
      <p className="text-sm text-slate-500 mt-1 max-w-2xl">
        Este rol solo puede ver y editar los módulos <strong>Home</strong> y <strong>Galería</strong> del panel.
        No tiene acceso a clubes, equipos, jugadores, pagos, cotizaciones ni ningún otro módulo.
      </p>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 h-fit">
          <h3 className="font-display text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <UserPlus className="text-blue-700" size={20} /> Crear nuevo usuario
          </h3>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Nombre</span>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              data-testid="config-user-name"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correo</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              data-testid="config-user-email"
            />
          </label>
          <label className="block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Contraseña (mín. 6)</span>
            <input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
              data-testid="config-user-password"
            />
          </label>
          <button type="submit" disabled={saving} className="fsc-btn-primary w-full py-2 rounded-md text-sm disabled:opacity-50" data-testid="config-user-submit">
            {saving ? "Creando..." : "Crear usuario"}
          </button>
        </form>

        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="font-display text-xl font-black uppercase tracking-tight mb-4">Usuarios existentes</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-slate-400">Aún no hay usuarios de Configuración.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between border border-slate-100 rounded-md px-3 py-2" data-testid={`config-user-row-${u.id}`}>
                  <div>
                    <div className="font-bold text-sm text-slate-800">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </div>
                  <button onClick={() => remove(u.id, u.email)} className="text-red-500 hover:text-red-700" data-testid={`config-user-delete-${u.id}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
