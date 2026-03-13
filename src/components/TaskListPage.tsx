import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { sampleTasks, categories, iconMap, formatTime, formatDuration } from "@/lib/taskData";

export function TaskListPage() {
  const completed = sampleTasks.filter(t => t.completed);
  const pending = sampleTasks.filter(t => !t.completed);

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Overview</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Tarefas</h2>
        <p className="text-sm text-muted-foreground mt-1">{completed.length} concluídas · {pending.length} pendentes</p>
      </div>

      {/* Pending */}
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Pendentes</h3>
      <div className="flex flex-col gap-3 mb-8">
        {pending.map((task, i) => {
          const cat = categories[task.category];
          const Icon = iconMap[task.icon];
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 bg-card rounded-xl px-4 py-3 border border-border/30"
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: `hsl(${cat.hsl} / 0.15)` }}
              >
                {Icon && <Icon className="w-5 h-5" style={{ color: `hsl(${cat.hsl})` }} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-foreground truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground">{formatTime(task.startTime)} - {formatTime(task.endTime)}</p>
              </div>
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
                style={{ backgroundColor: `hsl(${cat.hsl} / 0.15)`, color: `hsl(${cat.hsl})` }}
              >
                {cat.label}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Completed */}
      <h3 className="text-xs uppercase tracking-widest text-muted-foreground mb-3">Concluídas</h3>
      <div className="flex flex-col gap-3">
        {completed.map((task, i) => {
          const cat = categories[task.category];
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-4 bg-card/50 rounded-xl px-4 py-3 border border-border/20"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `hsl(${cat.hsl} / 0.1)` }}>
                <Check className="w-5 h-5" style={{ color: `hsl(${cat.hsl})` }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-muted-foreground line-through truncate">{task.title}</p>
                <p className="text-xs text-muted-foreground/60">{formatTime(task.startTime)} - {formatTime(task.endTime)}</p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
