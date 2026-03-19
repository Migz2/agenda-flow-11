import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Pencil, MapPin, Clock, CalendarDays, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RichTextContent } from "./RichTextEditor";
import { iconMap } from "@/lib/taskData";
import { useCustomCategories, type DbTask } from "@/hooks/useTasks";

interface NotesPanelProps {
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

export function NotesPanel({ task, onClose, onEdit, onToggleComplete }: NotesPanelProps) {
  const { categories: customCats } = useCustomCategories();

  const getCatInfo = (t: DbTask) => {
    if (t.custom_category_id) {
      const cc = customCats.find(c => c.id === t.custom_category_id);
      if (cc) return { label: cc.name, color: cc.color };
    }
    return { label: t.category || "Geral", color: "#666" };
  };

  return (
    <AnimatePresence>
      {task && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-md bg-card border-l border-border/30 shadow-2xl flex flex-col overflow-hidden"
          >
            {(() => {
              const catInfo = getCatInfo(task);
              const IconComp = iconMap[task.icon];
              return (
                <>
                  {/* Header */}
                  <div
                    className="px-6 pt-6 pb-4 shrink-0"
                    style={{ background: `linear-gradient(135deg, ${catInfo.color}15, transparent)` }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
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
                          <h2 className="font-display text-lg font-bold text-foreground leading-snug">
                            {task.title}
                          </h2>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: `${catInfo.color}26`, color: catInfo.color }}
                            >
                              {catInfo.label}
                            </span>
                            {task.completed && (
                              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                Concluída
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Info rows */}
                    <div className="flex flex-col gap-3 mb-5">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarDays className="w-4 h-4 shrink-0" />
                        <span className="capitalize">{formatDate(task.start_time)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 shrink-0" />
                        <span>
                          {task.is_all_day
                            ? "Dia todo"
                            : `${formatTime(task.start_time)} — ${formatTime(task.end_time)}`}
                        </span>
                      </div>
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

                    {/* Notes */}
                    {task.description && task.description !== "" && task.description !== "<p></p>" ? (
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Anotações</p>
                        <div className="bg-secondary/50 rounded-lg p-4 border border-border/20">
                          <RichTextContent html={task.description} />
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-sm text-muted-foreground">Sem anotações.</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Editar" para adicionar.</p>
                      </div>
                    )}
                  </div>

                  {/* Footer actions */}
                  <div className="px-6 py-4 border-t border-border/20 flex gap-3 shrink-0">
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
                      Editar
                    </Button>
                  </div>
                </>
              );
            })()}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
