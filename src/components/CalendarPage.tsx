import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { categories, type CategoryId } from "@/lib/taskData";
import { useAllTasks, type DbTask } from "@/hooks/useTasks";
import { TaskDrawer } from "./TaskDrawer";

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { tasks, addTask } = useAllTasks();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const tasksByDay = useMemo(() => {
    const map: Record<string, DbTask[]> = {};
    tasks.forEach(t => {
      const day = t.start_time.slice(0, 10);
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

  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto relative">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Calendário</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Visão Mensal</h2>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-6">
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
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs text-muted-foreground font-body py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-7 gap-1"
      >
        {cells.map((day, i) => {
          if (day === null) return <div key={`empty-${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDay[dateStr] || [];
          const isToday = dateStr === today;
          const catColors = [...new Set(dayTasks.map(t => t.category))].slice(0, 4);

          return (
            <button
              key={dateStr}
              onClick={() => setSelectedDate(dateStr)}
              className={`
                aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all text-sm
                ${isToday ? "bg-primary/20 text-primary font-bold ring-1 ring-primary/50" : "hover:bg-secondary text-foreground"}
              `}
            >
              <span>{day}</span>
              {catColors.length > 0 && (
                <div className="flex gap-0.5">
                  {catColors.map(cat => (
                    <div
                      key={cat}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: `hsl(${categories[cat as CategoryId]?.hsl || "0 0% 50%"})` }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </motion.div>

      {/* Selected day tasks */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-card rounded-2xl p-4 border border-border/30"
        >
          <h4 className="text-sm font-display font-semibold text-foreground mb-3">
            Tarefas em {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "numeric", month: "long" })}
          </h4>
          {(tasksByDay[selectedDate] || []).length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhuma tarefa neste dia.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(tasksByDay[selectedDate] || []).map(t => {
                const cat = categories[t.category as CategoryId];
                return (
                  <div key={t.id} className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: `hsl(${cat?.hsl || "0 0% 50%"})` }} />
                    <span className={`${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(t.start_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      )}

      <TaskDrawer onSubmit={addTask} defaultDate={selectedDate || undefined} />
    </div>
  );
}
