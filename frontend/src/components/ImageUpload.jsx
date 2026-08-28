import { useRef, useState } from "react";
import api, { API_BASE } from "../lib/api";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

/**
 * Image upload component. Posts to /api/upload, stores returned `url` in the form.
 * Pass the current value (URL string or relative /api/files/... path) and an onChange callback.
 */
export default function ImageUpload({ value, onChange, label = "Imagen", hint = "", testId = "image-upload" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const previewSrc = !value
    ? null
    : value.startsWith("/api/")
    ? `${API_BASE.replace(/\/api$/, "")}${value}`
    : value;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      toast.error("La imagen no puede superar 15MB");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.url);
      toast.success("Imagen cargada");
    } catch (err) {
      toast.error("Error al cargar imagen. Inicia sesión e inténtalo de nuevo.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {hint && (
        <p className="text-[11px] leading-snug text-slate-500 -mt-1" data-testid={`${testId}-hint`}>
          {hint}
        </p>
      )}
      <div className="flex items-center gap-3">
        {previewSrc ? (
          <div className="relative">
            <img src={previewSrc} alt="" className="h-20 w-20 rounded-md object-cover border border-slate-200" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 hover:bg-red-50 hover:text-red-600"
              aria-label="Quitar imagen"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="h-20 w-20 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center px-2">
            Sin imagen
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="px-3 py-2 border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-xs font-bold uppercase tracking-wide rounded-md flex items-center gap-2 disabled:opacity-50"
          data-testid={`${testId}-btn`}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? "Cargando..." : value ? "Cambiar" : "Subir imagen"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.jpg,.jpeg,.jfif,.jif,.jpe,.pjpeg,.pjp,.png,.apng,.gif,.bmp,.dib,.tif,.tiff,.webp,.heic,.heif,.avif,.svg,.ico,.raw,.cr2,.cr3,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.srw"
          hidden
          onChange={handleFile}
          data-testid={`${testId}-input`}
        />
      </div>
    </div>
  );
}
