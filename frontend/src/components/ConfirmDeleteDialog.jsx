import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";

/**
 * Modal de confirmación reutilizable para acciones destructivas.
 *
 * Props:
 *  - trigger: ReactNode — botón que abre el modal (envuelto en AlertDialogTrigger)
 *  - title: string — título del modal
 *  - description: ReactNode — descripción explicando qué se va a eliminar
 *  - confirmLabel: string — texto del botón confirmar (default "Eliminar")
 *  - onConfirm: async () => void — se ejecuta al confirmar
 *  - testIdPrefix: para identificar el modal en pruebas
 */
export default function ConfirmDeleteDialog({
  trigger,
  title = "¿Confirmar eliminación?",
  description = "Esta acción es permanente y no se puede deshacer.",
  confirmLabel = "Eliminar",
  onConfirm,
  testIdPrefix = "confirm-delete",
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent data-testid={`${testIdPrefix}-content`}>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 size={20} /> {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-700 leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading} data-testid={`${testIdPrefix}-cancel`}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => { e.preventDefault(); handleConfirm(); }}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white"
            data-testid={`${testIdPrefix}-confirm`}
          >
            {loading ? <><Loader2 size={14} className="animate-spin mr-2" /> Eliminando...</> : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
