import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Trash2 } from "lucide-react";
import { categories, iconMap, type CategoryId } from "@/lib/taskData";
import { useAllTasks, useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";

export function TaskListPage() {
  const { tasks, loading, addTask, updateTask, toggleComplete, deleteTask } = useAllTasks();
  const { categories: customCats } = useCustomCategories();
  const [editTask, setEditTask] = useState<DbTask | null>(null);

  const completed = tasks.filter(t => t.completed);
  const pending = tasks.filter(t => !t.completed);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  const getCatInfo = (task: DbTask) => {
    if (task.custom_category_id) {
      const cc = customCats.find(c => c.id === task.custom_category_id);
      if (cc) return { label: cc.name, hsl: "", hex: cc.color };
    }
    const cat = categories[task.category as CategoryId] || categories.work;
    return { ...cat, hex: "" };
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Overview</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Tarefas</h2>
        <p className="text-sm text-muted-foreground mt-1">{completed.length} concluídas · {pending.length} pendentes</p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhuma tarefa ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique no + para criar.</p>
        </div>
      ) : (
        <>
          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Pendentes</h3>
          <div className="flex flex-col gap-3 mb-8">
            {pending.map((task, i) => {
              const catInfo = getCatInfo(task);
              const Icon = iconMap[task.icon];
              const catColor = catInfo.hex || `hsl(${catInfo.hsl})`;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 bg-card rounded-xl px-4 py-3 border border-border/30 cursor-pointer hover:border-border/60 transition-colors"
                  onClick={() => setEditTask(task)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, true); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 hover:scale-110 transition-transform"
                    style={{ backgroundColor: catInfo.hex ? `${catInfo.hex}26` : `hsl(${catInfo.hsl} / 0.15)` }}
                  >
                    {Icon && <Icon className="w-5 h-5" style={{ color: catColor }} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(task.start_time)} - {formatTime(task.end_time)}</p>
                  </div>
                  <span
                    className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: catInfo.hex ? `${catInfo.hex}26` : `hsl(${catInfo.hsl} / 0.15)`, color: catColor }}
                  >
                    {catInfo.label}
                  </span>
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              );
            })}
          </div>

          <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Concluídas</h3>
          <div className="flex flex-col gap-3">
            {completed.map((task, i) => {
              const catInfo = getCatInfo(task);
              const catColor = catInfo.hex || `hsl(${catInfo.hsl})`;
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-4 bg-card/50 rounded-xl px-4 py-3 border border-border/20 cursor-pointer"
                  onClick={() => setEditTask(task)}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleComplete(task.id, false); }}
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: catInfo.hex ? `${catInfo.hex}1a` : `hsl(${catInfo.hsl} / 0.1)` }}
                  >
                    <Check className="w-5 h-5" style={{ color: catColor }} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display font-semibold text-muted-foreground line-through truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground/60">{formatTime(task.start_time)} - {formatTime(task.end_time)}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </>
      )}

      <TaskDrawer onSubmit={addTask} onUpdate={updateTask} editTask={editTask} onClose={() => setEditTask(null)} />
    </div>
  );
}
