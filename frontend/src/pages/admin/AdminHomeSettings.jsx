import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { Save, Home as HomeIcon, Trophy, Info, Phone } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "../../components/ImageUpload";

const EMPTY = {
  hero_title: "Future Soccer Cup",
  hero_subtitle: "Somos más que un torneo",
  hero_cta_label: "Inscribe tu equipo",
  hero_cta_url: "/registro-equipo",
  hero_image_url: "",
  upcoming_name: "",
  upcoming_city: "",
  upcoming_venue: "",
  upcoming_start_date: "",
  upcoming_end_date: "",
  upcoming_categories: "",
  upcoming_cover_url: "",
  about_title: "Somos más que un torneo",
  about_body: "",
  about_image_url: "",
  contact_email: "",
  contact_phone: "",
  instagram: "",
  facebook: "",
  youtube: "",
};

export default function AdminHomeSettings() {
  const [s, setS] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.get("/home-settings");
      setS({ ...EMPTY, ...(r.data || {}) });
    } catch {
      toast.error("Error al cargar configuración");
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/home-settings", s);
      toast.success("Configuración guardada");
    } catch {
      toast.error("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const upd = (k, v) => setS({ ...s, [k]: v });

  return (
    <div data-testid="admin-home-settings">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-4xl tracking-wider text-fsc-negro">CONFIGURACIÓN DEL HOME</h1>
          <p className="text-sm text-slate-500 mt-1">Edita los textos e imágenes que aparecen en la página principal pública.</p>
        </div>
        <button onClick={save} disabled={saving} className="fsc-btn-primary px-6 py-3 rounded-md text-sm flex items-center gap-2 disabled:opacity-50" data-testid="home-settings-save">
          <Save size={16}/> {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      <Section title="Hero" icon={<HomeIcon size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título del Hero" v={s.hero_title} onChange={(v) => upd("hero_title", v)} />
          <Field label="Subtítulo (cursive dorado)" v={s.hero_subtitle} onChange={(v) => upd("hero_subtitle", v)} />
          <Field label="CTA — texto del botón" v={s.hero_cta_label} onChange={(v) => upd("hero_cta_label", v)} />
          <Field label="CTA — URL destino" v={s.hero_cta_url} onChange={(v) => upd("hero_cta_url", v)} />
          <div className="md:col-span-2">
            <ImageUpload value={s.hero_image_url} onChange={(v) => upd("hero_image_url", v)} label="Imagen de fondo (Hero)" testId="hero-image" />
          </div>
        </div>
      </Section>

      <Section title="Próximo evento (Premier)" icon={<Trophy size={18}/>}>
        <p className="text-xs text-slate-500 mb-3">Si dejas estos campos vacíos, el Home mostrará automáticamente el torneo marcado como "destacado" en <a href="/admin/torneos" className="underline text-fsc-dorado-oscuro">Torneos</a>.</p>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Nombre" v={s.upcoming_name} onChange={(v) => upd("upcoming_name", v)} />
          <Field label="Categorías (lista)" v={s.upcoming_categories} onChange={(v) => upd("upcoming_categories", v)} placeholder="Sub-8, Sub-10, Sub-12" />
          <Field label="Ciudad" v={s.upcoming_city} onChange={(v) => upd("upcoming_city", v)} />
          <Field label="Sede" v={s.upcoming_venue} onChange={(v) => upd("upcoming_venue", v)} />
          <Field label="Fecha inicio" type="date" v={s.upcoming_start_date} onChange={(v) => upd("upcoming_start_date", v)} />
          <Field label="Fecha fin" type="date" v={s.upcoming_end_date} onChange={(v) => upd("upcoming_end_date", v)} />
          <div className="md:col-span-2">
            <ImageUpload value={s.upcoming_cover_url} onChange={(v) => upd("upcoming_cover_url", v)} label="Imagen de portada" testId="upcoming-cover" />
          </div>
        </div>
      </Section>

      <Section title="Nosotros" icon={<Info size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Título" v={s.about_title} onChange={(v) => upd("about_title", v)} />
          <div />
          <label className="md:col-span-2 block">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cuerpo (texto)</span>
            <textarea rows={5} value={s.about_body} onChange={(e) => upd("about_body", e.target.value)} className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md" />
          </label>
          <div className="md:col-span-2">
            <ImageUpload value={s.about_image_url} onChange={(v) => upd("about_image_url", v)} label="Imagen" testId="about-image" />
          </div>
        </div>
      </Section>

      <Section title="Contacto y redes" icon={<Phone size={18}/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email" v={s.contact_email} onChange={(v) => upd("contact_email", v)} />
          <Field label="Teléfono" v={s.contact_phone} onChange={(v) => upd("contact_phone", v)} />
          <Field label="Instagram (@usuario)" v={s.instagram} onChange={(v) => upd("instagram", v)} />
          <Field label="Facebook (URL o slug)" v={s.facebook} onChange={(v) => upd("facebook", v)} />
          <Field label="YouTube (URL o slug)" v={s.youtube} onChange={(v) => upd("youtube", v)} />
        </div>
      </Section>
    </div>
  );
}

function Section({ title, icon, children }) {
  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
        <div className="text-fsc-dorado-oscuro">{icon}</div>
        <div className="font-display text-2xl tracking-wider text-fsc-negro">{title.toUpperCase()}</div>
      </div>
      {children}
    </div>
  );
}

function Field({ label, v, onChange, type = "text", placeholder }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={v || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-md"
      />
    </label>
  );
}
