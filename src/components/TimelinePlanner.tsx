import { motion } from "framer-motion";
import { Check } from "lucide-react";
import {
  Task, TaskStatus, categories, iconMap, getTaskStatus, getTimeMinutes,
  getCurrentTimeMinutes, formatTime, formatDuration, sampleTasks
} from "@/lib/taskData";
import { useState, useEffect } from "react";

function TimelineNode({ task, status, index }: { task: Task; status: TaskStatus; index: number }) {
  const cat = categories[task.category];
  const IconComp = iconMap[task.icon];
  const isCompleted = status === "completed";
  const isActive = status === "active";
  const isFuture = status === "future";

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="flex items-start gap-4 lg:gap-6 relative"
    >
      {/* Node circle */}
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

      {/* Task details */}
      <div className={`pt-1 flex-1 min-w-0 ${isCompleted ? "opacity-60" : ""}`}>
        <p className="text-xs text-muted-foreground font-body">
          {formatTime(task.startTime)} - {formatTime(task.endTime)} ({formatDuration(task.startTime, task.endTime)})
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

      {/* Completion checkbox */}
      <div className="shrink-0 pt-3">
        <div
          className={`
            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
            ${isCompleted ? "" : "border-muted-foreground/30"}
          `}
          style={isCompleted ? { borderColor: `hsl(${cat.hsl})`, backgroundColor: `hsl(${cat.hsl} / 0.2)` } : undefined}
        >
          {isCompleted && <Check className="w-3.5 h-3.5" style={{ color: `hsl(${cat.hsl})` }} />}
        </div>
      </div>
    </motion.div>
  );
}

export function TimelinePlanner() {
  const [currentTime, setCurrentTime] = useState(getCurrentTimeMinutes);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(getCurrentTimeMinutes()), 30000);
    return () => clearInterval(interval);
  }, []);

  const tasks = sampleTasks;

  // Calculate progress line position
  const firstStart = getTimeMinutes(tasks[0].startTime);
  const lastEnd = getTimeMinutes(tasks[tasks.length - 1].endTime);
  const totalRange = lastEnd - firstStart;
  const progressPercent = Math.min(100, Math.max(0, ((currentTime - firstStart) / totalRange) * 100));

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Today</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">
          Daily Planner
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical line */}
        <div className="absolute left-7 lg:left-8 top-0 bottom-0 w-0.5 bg-inactive z-0" />
        
        {/* Progress fill */}
        <motion.div
          className="absolute left-7 lg:left-8 top-0 w-0.5 z-0"
          style={{
            background: "linear-gradient(to bottom, hsl(330 100% 50%), hsl(22 100% 50%), hsl(186 100% 50%))",
          }}
          initial={{ height: "0%" }}
          animate={{ height: `${progressPercent}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />

        {/* Task nodes */}
        <div className="relative z-10 flex flex-col gap-8 lg:gap-10">
          {tasks.map((task, i) => (
            <TimelineNode
              key={task.id}
              task={task}
              status={getTaskStatus(task, currentTime)}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
