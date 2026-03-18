import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Check, Pencil, MapPin, Clock, CalendarDays, Repeat } from "lucide-react";
import { RichTextContent } from "./RichTextEditor";
import { iconMap } from "@/lib/taskData";
import type { DbTask } from "@/hooks/useTasks";
import { useCustomCategories } from "@/hooks/useTasks";

interface TaskDetailModalProps {
  task: DbTask | null;
  onClose: () => void;
  onEdit: (task: DbTask) => void;
  onToggleComplete: (taskId: string, completed: boolean) => void;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const recurrenceLabels: Record<string, string> = {
  none: "",
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

export function TaskDetailModal({ task, onClose, onEdit, onToggleComplete }: TaskDetailModalProps) {
  const { categories: customCats } = useCustomCategories();

  if (!task) return null;

  const getCatInfo = () => {
    if (task.custom_category_id) {
      const cc = customCats.find(c => c.id === task.custom_category_id);
      if (cc) return { label: cc.name, color: cc.color };
    }
    return { label: task.category || "Geral", color: "#666" };
  };

  const catInfo = getCatInfo();
  const IconComp = iconMap[task.icon];

  return (
    <Dialog open={!!task} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-card border-border/30 max-w-md p-0 overflow-hidden">
        {/* Header with color accent */}
        <div
          className="px-6 pt-6 pb-4"
          style={{ background: `linear-gradient(135deg, ${catInfo.color}15, transparent)` }}
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: catInfo.color }}
              >
                {IconComp ? (
                  <IconComp className="w-6 h-6 text-background" />
                ) : (
                  <CalendarDays className="w-6 h-6 text-background" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="font-display text-lg text-foreground leading-snug">
                  {task.title}
                </DialogTitle>
                <DialogDescription className="sr-only">Detalhes da tarefa</DialogDescription>
                <span
                  className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full mt-1.5"
                  style={{ backgroundColor: `${catInfo.color}26`, color: catInfo.color }}
                >
                  {catInfo.label}
                </span>
              </div>
              {task.completed && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary shrink-0">
                  Concluída
                </span>
              )}
            </div>
          </DialogHeader>
        </div>

        {/* Info rows */}
        <div className="px-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4 shrink-0" />
            <span className="capitalize">{formatDate(task.start_time)}</span>
          </div>
          {!task.is_all_day && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{formatTime(task.start_time)} — {formatTime(task.end_time)}</span>
            </div>
          )}
          {task.is_all_day && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4 shrink-0" />
              <span>Dia todo</span>
            </div>
          )}
          {task.location && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{task.location}</span>
            </div>
          )}
          {task.recurrence && task.recurrence !== "none" && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Repeat className="w-4 h-4 shrink-0" />
              <span>{recurrenceLabels[task.recurrence]}</span>
            </div>
          )}
        </div>

        {/* Description / Notes */}
        {task.description && task.description !== "" && task.description !== "<p></p>" && (
          <div className="px-6 mt-2">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Anotações</p>
            <div className="bg-secondary/50 rounded-lg p-3 border border-border/20">
              <RichTextContent html={task.description} />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 pt-4 flex gap-3">
          <Button
            variant="outline"
            className="flex-1 border-border/50"
            onClick={() => {
              onToggleComplete(task.id, !task.completed);
              onClose();
            }}
          >
            <Check className="w-4 h-4 mr-1.5" />
            {task.completed ? "Desmarcar" : "Concluir"}
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground glow-pink"
            onClick={() => {
              onEdit(task);
              onClose();
            }}
          >
            <Pencil className="w-4 h-4 mr-1.5" />
            Editar Tarefa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
