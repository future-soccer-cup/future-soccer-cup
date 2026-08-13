import { useRef, useState } from "react";
import api, { API_BASE } from "../lib/api";
import { Upload, Loader2, X, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";

/**
 * Multi-image upload component. Permite mantener una LISTA ordenada de imágenes.
 * Cada imagen se sube vía /api/upload y la URL retornada se agrega al array.
 *
 * Props:
 *  - values: string[] (URLs)
 *  - onChange: (newArr: string[]) => void
 *  - label, hint, testId
 */
export default function ImageListUpload({ values = [], onChange, label = "Imágenes", hint = "", testId = "image-list-upload", max = null }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const previewSrc = (v) => !v
    ? null
    : v.startsWith("/api/")
      ? `${API_BASE.replace(/\/api$/, "")}${v}`
      : v;

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: supera 5MB, omitida`);
        continue;
      }
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        uploaded.push(res.data.url);
      } catch (_err) {
        toast.error(`${file.name}: error al cargar`);
      }
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (uploaded.length > 0) {
      const merged = [...values, ...uploaded];
      onChange(max ? merged.slice(-max) : merged);
      toast.success(`${uploaded.length} imagen(es) cargada(s)`);
    }
  };

  const removeAt = (i) => onChange(values.filter((_, idx) => idx !== i));
  const moveLeft = (i) => {
    if (i === 0) return;
    const next = [...values];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  const moveRight = (i) => {
    if (i === values.length - 1) return;
    const next = [...values];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2" data-testid={testId}>
      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {hint && (
        <p className="text-[11px] leading-snug text-slate-500 -mt-1" data-testid={`${testId}-hint`}>
          {hint}
        </p>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2" data-testid={`${testId}-list`}>
          {values.map((v, i) => (
            <div key={`${v}-${i}`} className="relative">
              <img src={previewSrc(v)} alt="" className="h-20 w-20 rounded-md object-cover border border-slate-200" />
              <div className="absolute -top-2 -right-2 flex gap-1">
                <button
                  type="button"
                  onClick={() => removeAt(i)}
                  className="bg-white border border-slate-200 rounded-full p-1 hover:bg-red-50 hover:text-red-600"
                  aria-label="Quitar imagen"
                  data-testid={`${testId}-remove-${i}`}
                >
                  <X size={12} />
                </button>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-white rounded-full px-1 py-0.5 border border-slate-200 shadow-sm">
                <button type="button" disabled={i === 0} onClick={() => moveLeft(i)} className="disabled:opacity-30" aria-label="Mover a la izquierda" data-testid={`${testId}-left-${i}`}>
                  <ArrowLeft size={11} />
                </button>
                <span className="text-[9px] font-bold text-slate-500">{i + 1}</span>
                <button type="button" disabled={i === values.length - 1} onClick={() => moveRight(i)} className="disabled:opacity-30" aria-label="Mover a la derecha" data-testid={`${testId}-right-${i}`}>
                  <ArrowRight size={11} />
                </button>
              </div>
            </div>
          ))}
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
        {uploading ? "Cargando..." : values.length === 0 ? "Subir imágenes" : max && values.length >= max ? "Reemplazar foto" : "Agregar más"}
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple={!max || max > 1}
        accept="image/*,.jpg,.jpeg,.jfif,.jif,.jpe,.pjpeg,.pjp,.png,.apng,.gif,.bmp,.dib,.tif,.tiff,.webp,.heic,.heif,.avif,.svg,.ico,.raw,.cr2,.cr3,.nef,.arw,.dng,.orf,.rw2,.raf,.pef,.srw"
        hidden
        onChange={handleFiles}
        data-testid={`${testId}-input`}
      />
    </div>
  );
}
