import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, Timer, CheckCircle2, Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTodayTasks, type DbTask } from "@/hooks/useTasks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const PRESETS = [
  { label: "25/5 (Clássico)", work: 25, rest: 5 },
  { label: "50/10 (Deep Work)", work: 50, rest: 10 },
];

export function FocusMode() {
  const { tasks, refetch } = useTodayTasks();
  const pendingTasks = tasks.filter(t => !t.completed);

  const [preset, setPreset] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [secondsLeft, setSecondsLeft] = useState(PRESETS[0].work * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [completed, setCompleted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalSeconds = isBreak ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60;
  const progress = 1 - secondsLeft / totalSeconds;

  const resetTimer = useCallback(() => {
    setIsRunning(false);
    setIsBreak(false);
    setCompleted(false);
    setSecondsLeft(PRESETS[preset].work * 60);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [preset]);

  useEffect(() => { resetTimer(); }, [preset, resetTimer]);

  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setIsRunning(false);
          if (!isBreak) {
            // Work session ended - auto complete task
            handleWorkComplete();
          } else {
            toast({ title: "Pausa encerrada!", description: "Hora de voltar ao foco." });
            setIsBreak(false);
            setSecondsLeft(PRESETS[preset].work * 60);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isRunning, isBreak]);

  const handleWorkComplete = async () => {
    setCompleted(true);
    if (selectedTaskId) {
      // Optimistic: mark completed in DB
      await supabase.from("tasks").update({ completed: true, updated_at: new Date().toISOString() } as any).eq("id", selectedTaskId);
      await refetch();
      toast({ title: "🎉 Sessão concluída!", description: "Tarefa marcada como concluída automaticamente." });
    } else {
      toast({ title: "🎉 Sessão concluída!", description: "Bom trabalho! Descanse um pouco." });
    }
  };

  const startBreak = () => {
    setIsBreak(true);
    setCompleted(false);
    setSecondsLeft(PRESETS[preset].rest * 60);
    setIsRunning(true);
  };

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  const circumference = 2 * Math.PI * 120;
  const strokeDashoffset = circumference * (1 - progress);

  const selectedTask = pendingTasks.find(t => t.id === selectedTaskId);

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Produtividade</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
          <Timer className="w-8 h-8 text-primary" />
          Modo Foco
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Timer Pomodoro inteligente vinculado às suas tarefas</p>
      </div>

      <div className="max-w-md mx-auto flex flex-col items-center gap-8">
        {/* Preset selector */}
        <div className="flex gap-2 w-full">
          {PRESETS.map((p, i) => (
            <button
              key={i}
              onClick={() => { setPreset(i); }}
              disabled={isRunning}
              className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                preset === i ? "neu-pressed text-foreground" : "neu-btn text-muted-foreground"
              } disabled:opacity-50`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Task selector */}
        <div className="w-full">
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId} disabled={isRunning}>
            <SelectTrigger className="bg-secondary border-border/50 neu-flat">
              <SelectValue placeholder="Vincular a uma tarefa (opcional)" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border/30">
              <SelectItem value="none">Sem vínculo</SelectItem>
              {pendingTasks.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="truncate">{t.title}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Timer circle */}
        <div className="relative w-64 h-64">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 260 260">
            <circle cx="130" cy="130" r="120" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
            <circle
              cx="130" cy="130" r="120" fill="none"
              stroke={isBreak ? "hsl(var(--neon-blue))" : "hsl(var(--primary))"}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-muted-foreground mb-1">
              {isBreak ? "☕ Pausa" : completed ? "✅ Concluído" : "🔥 Foco"}
            </span>
            <span className="text-5xl font-display font-bold text-foreground tabular-nums">
              {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
            </span>
            {selectedTask && (
              <span className="text-xs text-muted-foreground mt-2 max-w-[180px] truncate text-center">
                {selectedTask.title}
              </span>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4">
          {completed ? (
            <Button onClick={startBreak} className="neu-raised bg-accent text-accent-foreground glow-blue px-6">
              <Coffee className="w-4 h-4 mr-2" /> Iniciar Pausa
            </Button>
          ) : (
            <>
              <Button
                onClick={() => setIsRunning(!isRunning)}
                className={`neu-raised px-6 ${isRunning ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground glow-pink"}`}
              >
                {isRunning ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isRunning ? "Pausar" : "Iniciar"}
              </Button>
              <Button onClick={resetTimer} variant="outline" className="neu-btn">
                <RotateCcw className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>

        {/* Quick complete button during session */}
        {isRunning && selectedTaskId && selectedTaskId !== "none" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Button
              onClick={() => { setIsRunning(false); handleWorkComplete(); }}
              variant="outline"
              className="neu-btn text-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Concluir agora
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
