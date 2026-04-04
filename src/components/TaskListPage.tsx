import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Check, Trash2, Filter } from "lucide-react";
import { iconMap } from "@/lib/taskData";
import { useAllTasks, useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";
import { TaskContextMenu } from "./TaskContextMenu";
import { NotesPanel } from "./NotesPanel";
import { BatchDeleteModal } from "./BatchDeleteModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (isSameDay(date, today)) return "Hoje";
  if (isSameDay(date, tomorrow)) return "Amanhã";
  return date.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

function groupTasksByDay(tasks: DbTask[]): Record<string, DbTask[]> {
  const groups: Record<string, DbTask[]> = {};
  for (const task of tasks) {
    const key = new Date(task.start_time).toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(task);
  }
  return groups;
}

export function TaskListPage() {
  const { tasks, loading, addTask, updateTask, toggleComplete, deleteTask, refetch } = useAllTasks();
  const { categories: customCats } = useCustomCategories();
  const [notesTask, setNotesTask] = useState<DbTask | null>(null);
  const [editTask, setEditTask] = useState<DbTask | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("__all");
  const [contextMenu, setContextMenu] = useState<{ task: DbTask; pos: { x: number; y: number } } | null>(null);
  const [batchDeleteTask, setBatchDeleteTask] = useState<DbTask | null>(null);

  const filteredTasks = useMemo(() => {
    if (categoryFilter === "__all") return tasks;
    return tasks.filter(t => t.custom_category_id === categoryFilter);
  }, [tasks, categoryFilter]);

  const completed = filteredTasks.filter(t => t.completed);
  const pending = filteredTasks.filter(t => !t.completed);
  const pendingGroups = groupTasksByDay(pending);
  const sortedDays = Object.keys(pendingGroups).sort();

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const getCatInfo = (task: DbTask) => {
    if (task.custom_category_id) {
      const cc = customCats.find(c => c.id === task.custom_category_id);
      if (cc) return { label: cc.name, color: cc.color };
    }
    return { label: task.category || "Geral", color: "#666" };
  };

  const handleTaskClick = (task: DbTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({ task, pos: { x: e.clientX, y: e.clientY } });
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto relative pt-20">
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Overview</p>
          <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Tarefas</h2>
          <p className="text-sm text-muted-foreground mt-1">{completed.length} concluídas · {pending.length} pendentes</p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-card neu-flat h-9 text-xs rounded-xl border-0">
              <SelectValue placeholder="Filtrar categoria" />
            </SelectTrigger>
            <SelectContent className="bg-card neu-raised border-0 rounded-2xl">
              <SelectItem value="__all">Todas as Categorias</SelectItem>
              {customCats.map(cc => (
                <SelectItem key={cc.id} value={cc.id}>
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cc.color }} />
                    {cc.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-16 neu-flat rounded-2xl">
          <p className="text-muted-foreground text-sm">Nenhuma tarefa encontrada.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique no + para criar.</p>
        </div>
      ) : (
        <>
          {sortedDays.map(day => (
            <div key={day} className="mb-6">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3 capitalize">
                {getDayLabel(`${day}T12:00:00`)}
              </h3>
              <div className="flex flex-col gap-3">
                {pendingGroups[day].map((task, i) => {
                  const catInfo = getCatInfo(task);
                  const Icon = iconMap[task.icon];
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 bg-card neu-flat rounded-2xl px-4 py-3 cursor-pointer hover:scale-[1.01] transition-transform"
                      onClick={(e) => handleTaskClick(task, e)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, true); }}
                        className="w-10 h-10 rounded-xl neu-btn flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                        style={{ backgroundColor: `${catInfo.color}26` }}
                      >
                        {Icon && <Icon className="w-5 h-5" style={{ color: catInfo.color }} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-semibold text-foreground truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{formatTime(task.start_time)} - {formatTime(task.end_time)}</p>
                      </div>
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: `${catInfo.color}26`, color: catInfo.color }}
                      >
                        {catInfo.label}
                      </span>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        if (task.batch_id) { setBatchDeleteTask(task); }
                        else { deleteTask(task.id); }
                      }} className="text-muted-foreground hover:text-destructive transition-colors">
                         <Trash2 className="w-4 h-4" />
                       </button>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}

          {completed.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Concluídas</h3>
              <div className="flex flex-col gap-3">
                {completed.map((task, i) => {
                  const catInfo = getCatInfo(task);
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.6 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-4 bg-card/50 neu-flat rounded-2xl px-4 py-3 cursor-pointer"
                      onClick={(e) => handleTaskClick(task, e)}
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, false); }}
                        className="w-10 h-10 rounded-xl neu-pressed flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${catInfo.color}1a` }}
                      >
                        <Check className="w-5 h-5" style={{ color: catInfo.color }} />
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display font-semibold text-muted-foreground line-through truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground/60">{formatTime(task.start_time)} - {formatTime(task.end_time)}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <TaskContextMenu
        task={contextMenu?.task || null}
        position={contextMenu?.pos || null}
        onClose={() => setContextMenu(null)}
        onOpenNotes={(t) => setNotesTask(t)}
        onEdit={(t) => setEditTask(t)}
      />
      <NotesPanel
        task={notesTask}
        onClose={() => setNotesTask(null)}
        onEdit={(t) => { setNotesTask(null); setEditTask(t); }}
        onToggleComplete={(id, completed) => toggleComplete(id, completed)}
      />
      <TaskDrawer onSubmit={addTask} onUpdate={updateTask} editTask={editTask} onClose={() => setEditTask(null)} />
      <BatchDeleteModal
        open={!!batchDeleteTask}
        taskTitle={batchDeleteTask?.title || ""}
        onClose={() => setBatchDeleteTask(null)}
        onDeleteSingle={() => { if (batchDeleteTask) { deleteTask(batchDeleteTask.id); setBatchDeleteTask(null); } }}
        onDeleteFuture={async () => {
          if (!batchDeleteTask?.batch_id) return;
          // Delete this task + future tasks with same batch_id
          await supabase.from("tasks").delete().eq("batch_id", batchDeleteTask.batch_id).gte("start_time", batchDeleteTask.start_time).eq("completed", false);
          setBatchDeleteTask(null);
          await refetch();
        }}
      />
    </div>
  );
}
