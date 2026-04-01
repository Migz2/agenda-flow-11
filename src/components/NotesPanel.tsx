import { AnimatePresence, motion } from "framer-motion";
import { X, Check, Pencil, MapPin, Clock, CalendarDays, Repeat, Loader2 } from "lucide-react";
import { RichTextEditor } from "./RichTextEditor";
import { iconMap } from "@/lib/taskData";
import { useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";

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
  const [description, setDescription] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const taskIdRef = useRef<string | null>(null);

  // Sync description when task changes
  useEffect(() => {
    if (task) {
      setDescription(task.description || "");
      taskIdRef.current = task.id;
      setSaveStatus("idle");
    }
  }, [task?.id]);

  const saveDescription = useCallback(async (taskId: string, html: string) => {
    setSaveStatus("saving");
    await supabase
      .from("tasks")
      .update({ description: html, updated_at: new Date().toISOString() } as any)
      .eq("id", taskId);
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus(prev => prev === "saved" ? "idle" : prev), 2000);
  }, []);

  const handleDescriptionChange = useCallback((html: string) => {
    setDescription(html);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (taskIdRef.current) {
        saveDescription(taskIdRef.current, html);
      }
    }, 800);
  }, [saveDescription]);

  // Cleanup debounce on unmount
  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm"
            onClick={onClose}
          />
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
                          className="w-12 h-12 rounded-2xl neu-raised flex items-center justify-center shrink-0"
                          style={{ backgroundColor: catInfo.color }}
                        >
                          {IconComp ? (
                            <IconComp className="w-6 h-6 text-primary-foreground" />
                          ) : (
                            <CalendarDays className="w-6 h-6 text-primary-foreground" />
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
                        className="p-1.5 rounded-xl neu-btn hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
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

                    {/* Editable Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Anotações</p>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          {saveStatus === "saving" && <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</>}
                          {saveStatus === "saved" && <><Check className="w-3 h-3 text-primary" /> Salvo</>}
                        </span>
                      </div>
                      <div className="neu-pressed rounded-xl p-1">
                        <RichTextEditor
                          value={description}
                          onChange={handleDescriptionChange}
                          placeholder="Escreva suas anotações aqui..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Footer actions */}
                  <div className="px-6 py-4 border-t border-border/20 flex gap-3 shrink-0">
                    <Button
                      variant="outline"
                      className="flex-1 border-border/50 neu-btn"
                      onClick={() => {
                        onToggleComplete(task.id, !task.completed);
                        onClose();
                      }}
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      {task.completed ? "Desmarcar" : "Concluir"}
                    </Button>
                    <Button
                      className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground glow-pink neu-btn"
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
