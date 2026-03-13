import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { categories, iconMap, type CategoryId } from "@/lib/taskData";
import { useState, useEffect } from "react";
import { useTodayTasks, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";

type NodeStatus = "completed" | "active" | "future";

function getNodeStatus(task: DbTask, nowMinutes: number): NodeStatus {
  if (task.completed) return "completed";
  const st = new Date(task.start_time);
  const et = new Date(task.end_time);
  const startMin = st.getHours() * 60 + st.getMinutes();
  const endMin = et.getHours() * 60 + et.getMinutes();
  if (nowMinutes >= startMin && nowMinutes < endMin) return "active";
  if (nowMinutes >= endMin) return "completed";
  return "future";
}

function formatTimeFromDate(d: Date): string {
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDurationMinutes(startTime: string, endTime: string): string {
  const diff = (new Date(endTime).getTime() - new Date(startTime).getTime()) / 60000;
  if (diff >= 60) {
    const hours = Math.floor(diff / 60);
    const mins = Math.round(diff % 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  return `${Math.round(diff)} min`;
}

function TimelineNode({ task, status, index, onToggle }: { task: DbTask; status: NodeStatus; index: number; onToggle: () => void }) {
  const cat = categories[task.category as CategoryId] || categories.work;
  const IconComp = iconMap[task.icon];
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isFuture = status === "future";
  const st = new Date(task.start_time);
  const et = new Date(task.end_time);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex items-start gap-4 lg:gap-6 relative"
    >
      <div className="relative z-10 shrink-0">
        <div
          className={`
            w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-500
            ${isCompleted ? `${cat.color} ${cat.glowClass}` : ""}
            ${isActive ? `${cat.color} ${cat.glowClass} animate-pulse-glow` : ""}
            ${isFuture ? "bg-inactive" : ""}
          `}
        >
          {isCompleted ? (
            <Check className="w-6 h-6 lg:w-7 lg:h-7 text-background" strokeWidth={3} />
          ) : (
            IconComp && <IconComp className={`w-6 h-6 lg:w-7 lg:h-7 ${isFuture ? "text-muted-foreground" : "text-background"}`} />
          )}
        </div>
      </div>

      <div className={`pt-1 flex-1 min-w-0 ${isCompleted ? "opacity-60" : ""}`}>
        <p className="text-xs text-muted-foreground font-body">
          {formatTimeFromDate(st)} - {formatTimeFromDate(et)} ({formatDurationMinutes(task.start_time, task.end_time)})
        </p>
        <h3
          className={`
            text-base lg:text-lg font-display font-semibold mt-0.5
            ${isCompleted ? "line-through text-muted-foreground" : ""}
            ${isActive ? "text-foreground" : ""}
            ${isFuture ? "text-foreground" : ""}
          `}
          style={isActive ? { color: `hsl(${cat.hsl})` } : undefined}
        >
          {task.title}
        </h3>
        {task.location && (
          <p className={`text-xs mt-1 ${isFuture ? "text-muted-foreground/60" : "text-muted-foreground"}`}>
            📍 {task.location}
          </p>
        )}
        <div className="mt-1.5">
          <span
            className="text-[10px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: isFuture ? "hsl(0 0% 16%)" : `hsl(${cat.hsl} / 0.15)`,
              color: isFuture ? "hsl(0 0% 45%)" : `hsl(${cat.hsl})`,
            }}
          >
            {cat.label}
          </span>
        </div>
      </div>

      <div className="shrink-0 pt-3">
        <button
          onClick={onToggle}
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer
            ${isCompleted ? "" : "border-muted-foreground/30 hover:border-muted-foreground"}
          `}
          style={isCompleted ? { borderColor: `hsl(${cat.hsl})`, backgroundColor: `hsl(${cat.hsl} / 0.2)` } : undefined}
        >
          {isCompleted && <Check className="w-3.5 h-3.5" style={{ color: `hsl(${cat.hsl})` }} />}
        </button>
      </div>
    </motion.div>
  );
}

export function TimelinePlanner() {
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const { tasks, loading, addTask, toggleComplete } = useTodayTasks();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Progress line
  let progressPercent = 0;
  if (tasks.length > 0) {
    const firstStart = new Date(tasks[0].start_time);
    const lastEnd = new Date(tasks[tasks.length - 1].end_time);
    const firstMin = firstStart.getHours() * 60 + firstStart.getMinutes();
    const lastMin = lastEnd.getHours() * 60 + lastEnd.getMinutes();
    const range = lastMin - firstMin;
    if (range > 0) {
      progressPercent = Math.min(100, Math.max(0, ((currentTime - firstMin) / range) * 100));
    }
  }

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Today</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Daily Planner</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Carregando tarefas...</p>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground text-sm">Nenhuma tarefa para hoje.</p>
          <p className="text-xs text-muted-foreground mt-1">Clique no + para criar uma nova tarefa.</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-7 lg:left-8 top-0 bottom-0 w-0.5 bg-inactive z-0" />
          <motion.div
            className="absolute left-7 lg:left-8 top-0 w-0.5 z-0"
            style={{
              background: "linear-gradient(to bottom, hsl(330 100% 50%), hsl(22 100% 50%), hsl(186 100% 50%))",
            }}
            initial={{ height: "0%" }}
            animate={{ height: `${progressPercent}%` }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          <div className="relative z-10 flex flex-col gap-8 lg:gap-10">
            {tasks.map((task, i) => (
              <TimelineNode
                key={task.id}
                task={task}
                status={getNodeStatus(task, currentTime)}
                index={i}
                onToggle={() => toggleComplete(task.id, !task.completed)}
              />
            ))}
          </div>
        </div>
      )}

      <TaskDrawer onSubmit={addTask} />
    </div>
  );
}
