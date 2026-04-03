import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BatchDeleteModalProps {
  open: boolean;
  taskTitle: string;
  onDeleteSingle: () => void;
  onDeleteFuture: () => void;
  onClose: () => void;
}

export function BatchDeleteModal({ open, taskTitle, onDeleteSingle, onDeleteFuture, onClose }: BatchDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative bg-card neu-raised rounded-2xl p-6 max-w-sm w-full"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">Excluir evento</h3>
            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{taskTitle}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-5">
          Este bloco faz parte de uma série. Como deseja proceder?
        </p>

        <div className="flex flex-col gap-2">
          <Button
            onClick={onDeleteSingle}
            variant="outline"
            className="w-full neu-btn justify-start text-xs"
          >
            Apagar apenas este evento
          </Button>
          <Button
            onClick={onDeleteFuture}
            className="w-full bg-destructive text-destructive-foreground text-xs"
          >
            Apagar este e os próximos futuros
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
