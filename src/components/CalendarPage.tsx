import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, Plus, Check } from "lucide-react";
import { categories, type CategoryId } from "@/lib/taskData";
import { useAllTasks, useCustomCategories, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function getCatColor(task: DbTask, customCats: any[]) {
  if (task.custom_category_id) {
    const cc = customCats.find((c: any) => c.id === task.custom_category_id);
    if (cc) return cc.color;
  }
  const cat = categories[task.category as CategoryId];
  return cat ? `hsl(${cat.hsl})` : "hsl(0 0% 50%)";
}

function formatShortTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return m > 0 ? `${h12}:${String(m).padStart(2, "0")}${ampm}` : `${h12}${ampm}`;
}

const MAX_VISIBLE_TASKS = 3;

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editTask, setEditTask] = useState<DbTask | null>(null);
  const { tasks, addTask, updateTask } = useAllTasks();
  const { categories: customCats } = useCustomCategories();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const tasksByDay = useMemo(() => {
    const map: Record<string, DbTask[]> = {};
    tasks.forEach(t => {
      const day = new Date(t.start_time).toISOString().slice(0, 10);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return map;
  }, [tasks]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date().toISOString().slice(0, 10);

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const weekDays = ["DOM.", "SEG.", "TER.", "QUA.", "QUI.", "SEX.", "SÁB."];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Calendário</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Visão Mensal</h2>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h3 className="text-lg font-display font-semibold text-foreground">
          {monthNames[month]} {year}
        </h3>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border/30">
        {weekDays.map(d => (
          <div key={d} className="text-center text-[10px] text-muted-foreground font-body py-2 font-medium">{d}</div>
        ))}
      </div>

      {/* Day cells - Google Calendar style */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-7"
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} className="min-h-[90px] lg:min-h-[110px] border-b border-r border-border/20" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDay[dateStr] || [];
          const isToday = dateStr === today;
          const visible = dayTasks.slice(0, MAX_VISIBLE_TASKS);
          const remaining = dayTasks.length - MAX_VISIBLE_TASKS;

          return (
            <div
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className="min-h-[90px] lg:min-h-[110px] border-b border-r border-border/20 p-1 cursor-pointer hover:bg-secondary/30 transition-colors"
            >
              <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-primary text-primary-foreground" : "text-foreground"}`}>
                {day}
              </div>
              <div className="flex flex-col gap-0.5">
                {visible.map(t => {
                  const color = getCatColor(t, customCats);
                  return (
                    <div
                      key={t.id}
                      onClick={(e) => { e.stopPropagation(); setEditTask(t); }}
                      className="flex items-center gap-1 text-[10px] lg:text-[11px] leading-tight truncate rounded px-1 py-0.5 hover:bg-secondary/60 transition-colors cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-muted-foreground shrink-0">{formatShortTime(t.start_time)}</span>
                      <span className={`truncate ${t.completed ? "line-through text-muted-foreground/50" : "text-foreground/80"}`}>{t.title}</span>
                    </div>
                  );
                })}
                {remaining > 0 && (
                  <span className="text-[10px] text-primary font-medium px-1">+{remaining} mais</span>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* Day detail modal */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
            onClick={() => setSelectedDate(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card rounded-2xl p-5 border border-border/30 w-full max-w-md max-h-[70vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" }).toUpperCase()}
                  </p>
                  <h4 className="text-2xl font-display font-bold text-foreground">
                    {new Date(selectedDate + "T12:00:00").getDate()}
                  </h4>
                </div>
                <button onClick={() => setSelectedDate(null)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(tasksByDay[selectedDate] || []).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma tarefa neste dia.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {(tasksByDay[selectedDate] || []).map(t => {
                    const color = getCatColor(t, customCats);
                    return (
                      <div
                        key={t.id}
                        onClick={() => { setEditTask(t); setSelectedDate(null); }}
                        className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                      >
                        <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <span className={`block truncate ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatShortTime(t.start_time)} - {formatShortTime(t.end_time)}
                          </span>
                        </div>
                        {t.completed && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <TaskDrawer
        onSubmit={addTask}
        onUpdate={updateTask}
        defaultDate={selectedDate || undefined}
        editTask={editTask}
        onClose={() => setEditTask(null)}
      />
    </div>
  );
}
