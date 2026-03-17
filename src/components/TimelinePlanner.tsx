import { motion } from "framer-motion";
import { Check, AlertTriangle } from "lucide-react";
import { iconMap } from "@/lib/taskData";
import { useState, useEffect } from "react";
import { useTodayTasks, useOverdueTasks, useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";

type NodeStatus = "completed" | "active" | "future" | "past";

function getNodeStatus(task: DbTask, nowMinutes: number): NodeStatus {
  if (task.completed) return "completed";
  const st = new Date(task.start_time);
  const et = new Date(task.end_time);
  const startMin = st.getHours() * 60 + st.getMinutes();
  const endMin = et.getHours() * 60 + et.getMinutes();
  if (nowMinutes >= startMin && nowMinutes < endMin) return "active";
  if (nowMinutes >= endMin) return "past";
  return "future";
}

function getActivePercent(task: DbTask, nowMinutes: number): number {
  const st = new Date(task.start_time);
  const et = new Date(task.end_time);
  const startMin = st.getHours() * 60 + st.getMinutes();
  const endMin = et.getHours() * 60 + et.getMinutes();
  const range = endMin - startMin;
  if (range <= 0) return 0;
  return Math.min(100, Math.max(0, ((nowMinutes - startMin) / range) * 100));
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

function getCatInfo(task: DbTask, customCats: any[]) {
  if (task.custom_category_id) {
    const cc = customCats.find(c => c.id === task.custom_category_id);
    if (cc) return { label: cc.name, color: cc.color };
  }
  return { label: task.category || "Geral", color: "#666" };
}

function TimelineNode({ task, status, index, onToggle, onClick, customCats, fillPercent }: {
  task: DbTask; status: NodeStatus; index: number; onToggle: () => void; onClick: () => void; customCats: any[]; fillPercent: number;
}) {
  const catInfo = getCatInfo(task, customCats);
  const IconComp = iconMap[task.icon];
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isPast = status === "past";
  const isFuture = status === "future";
  const st = new Date(task.start_time);
  const et = new Date(task.end_time);
  const catColor = catInfo.color;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex items-start gap-4 lg:gap-6 relative"
    >
      <div className="relative z-10 shrink-0">
        <div
          className={`w-14 h-14 lg:w-16 lg:h-16 rounded-full flex items-center justify-center transition-all duration-500 cursor-pointer
            ${isPast ? "opacity-50" : ""}
            ${isFuture ? "bg-inactive" : ""}
          `}
          style={(isCompleted || isActive || isPast) ? { backgroundColor: isPast && !isCompleted ? `${catColor}66` : catColor } : undefined}
          onClick={onClick}
        >
          {isCompleted ? (
            <Check className="w-6 h-6 lg:w-7 lg:h-7 text-background" strokeWidth={3} />
          ) : (
            IconComp && <IconComp className={`w-6 h-6 lg:w-7 lg:h-7 ${isFuture ? "text-muted-foreground" : "text-background"}`} />
          )}
        </div>
      </div>

      <div
        className={`pt-1 flex-1 min-w-0 cursor-pointer relative overflow-hidden rounded-xl ${isActive ? "px-4 py-3 border border-border/30" : ""} ${isPast && !isCompleted ? "opacity-60" : ""}`}
        onClick={onClick}
      >
        {/* Water-fill effect for active task */}
        {isActive && (
          <motion.div
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{
              background: `linear-gradient(to top, ${catColor}30, ${catColor}10)`,
            }}
            initial={{ height: "0%" }}
            animate={{ height: `${fillPercent}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            // Position from bottom
            layout
          >
            <div
              className="absolute bottom-0 left-0 right-0 rounded-xl"
              style={{
                height: `${fillPercent}%`,
                background: `linear-gradient(to top, ${catColor}35, ${catColor}10)`,
              }}
            />
          </motion.div>
        )}
        {isActive && (
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-xl transition-all duration-1000 ease-out"
            style={{
              height: `${fillPercent}%`,
              background: `linear-gradient(to top, ${catColor}30, ${catColor}08)`,
            }}
          />
        )}

        <div className="relative z-10">
          <p className="text-xs text-muted-foreground font-body">
            {formatTimeFromDate(st)} - {formatTimeFromDate(et)} ({formatDurationMinutes(task.start_time, task.end_time)})
          </p>
          <h3
            className={`text-base lg:text-lg font-display font-semibold mt-0.5
              ${isCompleted ? "line-through text-muted-foreground" : ""}
              ${isActive ? "text-foreground" : ""}
              ${isPast ? "text-muted-foreground" : ""}
              ${isFuture ? "text-foreground" : ""}
            `}
            style={isActive ? { color: catColor } : undefined}
          >
            {task.title}
          </h3>
          {isActive && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${fillPercent}%`, backgroundColor: catColor }}
                />
              </div>
              <span className="text-[10px] font-medium" style={{ color: catColor }}>
                {Math.round(fillPercent)}%
              </span>
            </div>
          )}
          {task.location && (
            <p className={`text-xs mt-1 ${isFuture ? "text-muted-foreground/60" : "text-muted-foreground"}`}>📍 {task.location}</p>
          )}
          <div className="mt-1.5">
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: isFuture ? "hsl(0 0% 16%)" : `${catColor}26`,
                color: isFuture ? "hsl(0 0% 45%)" : catColor,
              }}
            >
              {catInfo.label}
            </span>
          </div>
        </div>
      </div>

      <div className="shrink-0 pt-3">
        <button
          onClick={onToggle}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all cursor-pointer
            ${task.completed ? "" : "border-muted-foreground/30 hover:border-muted-foreground"}
          `}
          style={task.completed ? { borderColor: catColor, backgroundColor: `${catColor}33` } : undefined}
        >
          {task.completed && <Check className="w-3.5 h-3.5" style={{ color: catColor }} />}
        </button>
      </div>
    </motion.div>
  );
}

function OverdueCard({ task, customCats, onToggle, onClick }: { task: DbTask; customCats: any[]; onToggle: () => void; onClick: () => void }) {
  const catInfo = getCatInfo(task, customCats);
  const daysAgo = Math.floor((Date.now() - new Date(task.start_time).getTime()) / 86400000);

  return (
    <div
      className="bg-card/60 rounded-xl p-3 border border-border/20 cursor-pointer hover:border-border/50 transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catInfo.color }} />
        <span className="text-xs text-muted-foreground truncate">{catInfo.label}</span>
      </div>
      <p className="text-sm font-display font-semibold text-foreground truncate">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-destructive">{daysAgo}d atrás</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-5 h-5 rounded-full border border-muted-foreground/30 hover:border-foreground flex items-center justify-center transition-colors"
        >
          <Check className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

export function TimelinePlanner() {
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });
  const { tasks, loading, addTask, updateTask, toggleComplete } = useTodayTasks();
  const { tasks: overdueTasks, toggleComplete: toggleOverdue } = useOverdueTasks();
  const { categories: customCats } = useCustomCategories();
  const [editTask, setEditTask] = useState<DbTask | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    }, 60000); // update every minute for water-fill
    return () => clearInterval(interval);
  }, []);

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

      <div className="flex gap-6">
        {/* Left column - 70% - Today's timeline */}
        <div className="flex-[7] min-w-0">
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
                {tasks.map((task, i) => {
                  const status = getNodeStatus(task, currentTime);
                  return (
                    <TimelineNode
                      key={task.id}
                      task={task}
                      status={status}
                      index={i}
                      onToggle={() => toggleComplete(task.id, !task.completed)}
                      onClick={() => setEditTask(task)}
                      customCats={customCats}
                      fillPercent={status === "active" ? getActivePercent(task, currentTime) : 0}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column - 30% - Overdue */}
        <div className="hidden lg:block flex-[3] min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <h3 className="text-sm font-display font-semibold text-foreground">Pendências</h3>
            {overdueTasks.length > 0 && (
              <span className="text-[10px] bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
                {overdueTasks.length}
              </span>
            )}
          </div>
          {overdueTasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">Nenhuma pendência! 🎉</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2 max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
              {overdueTasks.map(task => (
                <OverdueCard
                  key={task.id}
                  task={task}
                  customCats={customCats}
                  onToggle={() => toggleOverdue(task.id)}
                  onClick={() => setEditTask(task)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskDrawer
        onSubmit={addTask}
        onUpdate={updateTask}
        editTask={editTask}
        onClose={() => setEditTask(null)}
      />
    </div>
  );
}
