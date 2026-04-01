import { motion } from "framer-motion";
import { Check, AlertTriangle, EyeOff, Plus, Eye } from "lucide-react";
import { iconMap } from "@/lib/taskData";
import { useState, useEffect } from "react";
import { useTodayTasks, useOverdueTasks, useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";
import { TaskContextMenu } from "./TaskContextMenu";
import { NotesPanel } from "./NotesPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
  task: DbTask; status: NodeStatus; index: number; onToggle: () => void; onClick: (e: React.MouseEvent) => void; customCats: any[]; fillPercent: number;
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
          className={`w-14 h-14 lg:w-16 lg:h-16 rounded-2xl neu-raised flex items-center justify-center transition-all duration-500 cursor-pointer
            ${isPast ? "opacity-50" : ""}
            ${isFuture ? "bg-inactive" : ""}
          `}
          style={(isCompleted || isActive || isPast) ? { backgroundColor: isPast && !isCompleted ? `${catColor}66` : catColor } : undefined}
          onClick={onClick}
        >
          {isCompleted ? (
            <Check className="w-6 h-6 lg:w-7 lg:h-7 text-primary-foreground" strokeWidth={3} />
          ) : (
            IconComp && <IconComp className={`w-6 h-6 lg:w-7 lg:h-7 ${isFuture ? "text-muted-foreground" : "text-primary-foreground"}`} />
          )}
        </div>
      </div>

      <div
        className={`pt-1 flex-1 min-w-0 cursor-pointer relative overflow-hidden rounded-2xl ${isActive ? "px-4 py-3 neu-flat" : ""} ${isPast && !isCompleted ? "opacity-60" : ""}`}
        onClick={onClick}
      >
        {isActive && (
          <div
            className="absolute bottom-0 left-0 right-0 rounded-b-2xl transition-all duration-1000 ease-out"
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
              <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden neu-pressed">
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
                backgroundColor: isFuture ? "hsl(var(--inactive))" : `${catColor}26`,
                color: isFuture ? "hsl(var(--muted-foreground))" : catColor,
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
          className={`w-7 h-7 rounded-xl neu-btn flex items-center justify-center transition-all cursor-pointer
            ${task.completed ? "" : "text-muted-foreground hover:text-foreground"}
          `}
          style={task.completed ? { backgroundColor: `${catColor}33`, color: catColor } : undefined}
        >
          {task.completed && <Check className="w-4 h-4" style={{ color: catColor }} />}
        </button>
      </div>
    </motion.div>
  );
}

function OverdueCard({ task, customCats, onToggle, onClick, onHide }: { task: DbTask; customCats: any[]; onToggle: () => void; onClick: (e: React.MouseEvent) => void; onHide: () => void }) {
  const catInfo = getCatInfo(task, customCats);
  const daysAgo = Math.floor((Date.now() - new Date(task.start_time).getTime()) / 86400000);

  return (
    <div
      className="bg-card neu-flat rounded-2xl p-3 cursor-pointer hover:scale-[1.02] transition-transform group"
      onClick={onClick}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: catInfo.color }} />
        <span className="text-xs text-muted-foreground truncate flex-1">{catInfo.label}</span>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => { e.stopPropagation(); onHide(); }}
                className="opacity-0 group-hover:opacity-100 p-0.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">Ocultar do Planner</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-sm font-display font-semibold text-foreground truncate">{task.title}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-destructive">{daysAgo}d atrás</span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className="w-5 h-5 rounded-lg neu-btn flex items-center justify-center transition-colors"
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
  const { tasks: overdueTasks, hiddenTasks, toggleComplete: toggleOverdue, hideFromPlanner, restoreToPlanner } = useOverdueTasks();
  const { categories: customCats } = useCustomCategories();
  const [notesTask, setNotesTask] = useState<DbTask | null>(null);
  const [editTask, setEditTask] = useState<DbTask | null>(null);
  const [contextMenu, setContextMenu] = useState<{ task: DbTask; pos: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleTaskClick = (task: DbTask, e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu({ task, pos: { x: e.clientX, y: e.clientY } });
  };

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
        <div className="flex-[7] min-w-0">
          {loading ? (
            <p className="text-muted-foreground text-sm">Carregando tarefas...</p>
          ) : tasks.length === 0 ? (
            <div className="text-center py-16 neu-flat rounded-2xl">
              <p className="text-muted-foreground text-sm">Nenhuma tarefa para hoje.</p>
              <p className="text-xs text-muted-foreground mt-1">Clique no + para criar uma nova tarefa.</p>
            </div>
          ) : (
            <div className="relative">
              <div className="absolute left-7 lg:left-8 top-0 bottom-0 w-0.5 bg-inactive z-0" />
              <motion.div
                className="absolute left-7 lg:left-8 top-0 w-0.5 z-0"
                style={{
                  background: "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--accent)))",
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
                      onClick={(e) => handleTaskClick(task, e)}
                      customCats={customCats}
                      fillPercent={status === "active" ? getActivePercent(task, currentTime) : 0}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>

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
            <div className="text-center py-8 neu-flat rounded-2xl">
              <p className="text-xs text-muted-foreground">Nenhuma pendência! 🎉</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {overdueTasks.map(task => (
                <OverdueCard
                  key={task.id}
                  task={task}
                  customCats={customCats}
                  onToggle={() => toggleOverdue(task.id)}
                  onClick={(e) => handleTaskClick(task, e)}
                  onHide={() => hideFromPlanner(task.id)}
                />
              ))}
            </div>
          )}

          {hiddenTasks.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-1.5 mt-3 text-xs text-primary hover:text-primary/80 transition-colors neu-btn px-3 py-1.5 rounded-xl">
                  <Plus className="w-3.5 h-3.5" />
                  Restaurar pendência ({hiddenTasks.length})
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 bg-card neu-raised border-0 p-2 rounded-2xl">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-1 mb-1">Tarefas ocultas</p>
                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {hiddenTasks.map(task => {
                    const catInfo = getCatInfo(task, customCats);
                    return (
                      <button
                        key={task.id}
                        onClick={() => restoreToPlanner(task.id)}
                        className="flex items-center gap-2 px-2 py-2 rounded-xl text-left hover:bg-secondary/80 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">{task.title}</p>
                          <span className="text-[10px] text-muted-foreground">{catInfo.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>

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
      <TaskDrawer
        onSubmit={addTask}
        onUpdate={updateTask}
        editTask={editTask}
        onClose={() => setEditTask(null)}
      />
    </div>
  );
}
