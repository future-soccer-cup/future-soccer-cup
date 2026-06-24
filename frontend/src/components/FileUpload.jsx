import { useRef, useState } from "react";
import api, { API_BASE } from "../lib/api";
import { Upload, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";

/**
 * Generic file upload (image or PDF). POSTs to /api/upload and returns the URL.
 * Use for payment receipts (comprobantes) where the user may upload a scanned PDF.
 */
export default function FileUpload({ value, onChange, label = "Comprobante", testId = "file-upload", accept = "image/*,.jpg,.jpeg,.jfif,.jif,.jpe,.pjpeg,.pjp,.png,.apng,.gif,.bmp,.dib,.tif,.tiff,.webp,.heic,.heif,.avif,.svg,.ico,.raw,.cr2,.cr3,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.srw,application/pdf,.pdf" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const isPdf = value && /\.pdf$/i.test(value);
  const previewSrc = !value
    ? null
    : value.startsWith("/api/")
    ? `${API_BASE.replace(/\/api$/, "")}${value}`
    : value;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo no puede superar 5MB");
      return;
    }
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(res.data.url);
      toast.success("Comprobante cargado");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Error al cargar archivo");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div className="flex items-center gap-3">
        {previewSrc ? (
          <div className="relative">
            {isPdf ? (
              <a href={previewSrc} target="_blank" rel="noreferrer" className="h-20 w-20 rounded-md border border-slate-200 flex flex-col items-center justify-center text-slate-700 bg-slate-50 hover:bg-slate-100">
                <FileText size={28} />
                <span className="text-[10px] mt-1 font-bold uppercase">PDF</span>
              </a>
            ) : (
              <img src={previewSrc} alt="" className="h-20 w-20 rounded-md object-cover border border-slate-200" />
            )}
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 hover:bg-red-50 hover:text-red-600"
              aria-label="Quitar archivo"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="h-20 w-20 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center px-2">
            Sin archivo
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
          {uploading ? "Cargando..." : value ? "Cambiar" : "Subir archivo"}
        </button>
        <input ref={inputRef} type="file" accept={accept} hidden onChange={handleFile} data-testid={`${testId}-input`} />
      </div>
      <p className="text-[11px] text-slate-400">Imágenes (JPG/PNG) o PDF, máx. 5MB.</p>
    </div>
  );
}
