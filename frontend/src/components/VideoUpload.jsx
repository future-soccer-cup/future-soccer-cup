import { useRef, useState } from "react";
import api, { API_BASE } from "../lib/api";
import { Upload, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB por fragmento: evita límites de tamaño de body del proxy en producción

/**
 * Video upload component. Sube el archivo en fragmentos de 5MB (init → chunk* → complete)
 * para evitar que el proxy/ingress de producción rechace un solo POST de hasta 150MB.
 * Espejo de ImageUpload.jsx pero para video de fondo (hero en loop).
 */
export default function VideoUpload({ value, onChange, label = "Video", hint = "", testId = "video-upload" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const previewSrc = !value
    ? null
    : value.startsWith("/api/")
    ? `${API_BASE.replace(/\/api$/, "")}${value}`
    : value;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 150 * 1024 * 1024) {
      toast.error("El video no puede superar 150MB");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const initRes = await api.post("/upload/init", { filename: file.name });
      const { upload_id } = initRes.data;
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const slice = file.slice(start, start + CHUNK_SIZE);
        const fd = new FormData();
        fd.append("upload_id", upload_id);
        fd.append("chunk_index", i);
        fd.append("chunk", slice);
        await api.post("/upload/chunk", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      const completeRes = await api.post("/upload/complete", { upload_id, filename: file.name });
      onChange(completeRes.data.url);
      toast.success("Video cargado");
    } catch (err) {
      const detail = err?.response?.data?.detail;
      toast.error(detail || "Error al cargar video. Inicia sesión e inténtalo de nuevo.");
    } finally {
      setUploading(false);
      setProgress(0);
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
            <video src={previewSrc} muted className="h-20 w-32 rounded-md object-cover border border-slate-200 bg-black" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-2 -right-2 bg-white border border-slate-200 rounded-full p-1 hover:bg-red-50 hover:text-red-600"
              aria-label="Quitar video"
              data-testid={`${testId}-remove`}
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="h-20 w-32 rounded-md border-2 border-dashed border-slate-200 flex items-center justify-center text-slate-400 text-xs text-center px-2">
            Sin video
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
          {uploading ? `Cargando... ${progress}%` : value ? "Cambiar" : "Subir video"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="video/*,.mp4,.webm,.mov,.ogv"
          hidden
          onChange={handleFile}
          data-testid={`${testId}-input`}
        />
      </div>
    </div>
  );
}
