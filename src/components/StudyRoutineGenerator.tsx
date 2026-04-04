import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GraduationCap, Sparkles, BookOpen, History, Pencil, Clock, AlertTriangle, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useAllTasks, useCustomCategories, useStudyGenerations, type NewTask, type DbTask } from "@/hooks/useTasks";
import { useStudyRoutines, type StudyRoutine } from "@/hooks/useStudyRoutines";
import { toast } from "@/hooks/use-toast";

const WEEK_DAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sáb" },
];

const LEARNING_TYPES = [
  { id: "visual", label: "Visual", desc: "40% conceito / 30% visualização / 30% prática" },
  { id: "reading", label: "Leitura", desc: "Leitura / resumo / exemplos" },
  { id: "practice", label: "Prática", desc: "30% teoria / 70% exercícios" },
  { id: "mixed", label: "Misto", desc: "50% modelo / 50% exercícios" },
];

const PRIORITY_CONFIG = {
  low: { label: "Baixa", color: "text-neon-green", glow: "" },
  medium: { label: "Média", color: "text-neon-orange", glow: "glow-orange" },
  high: { label: "Alta", color: "text-neon-pink", glow: "glow-pink" },
};

const PALETTE = ["#ff0080", "#ff6600", "#00d4ff", "#22cc44", "#aa44ff", "#ffcc00", "#ff4444", "#00ff88", "#4488ff", "#ff88cc"];

interface SubjectForm {
  id: string;
  name: string;
  days: number[];
  learningType: string;
  color: string;
  studyBlocks: number;
  revisions: number;
  preparation: number;
  blockDuration: number;
  priority: "low" | "medium" | "high";
}

function getDescriptionForType(type: string): string {
  switch (type) {
    case "practice": return "📐 Proporção: 30% teoria / 70% exercícios.\nFoque em resolver problemas práticos após revisar a teoria.";
    case "visual": return "🔧 Proporção: 40% conceito / 30% visualização / 30% prática.\nEntenda o sistema, visualize diagramas, depois pratique.";
    case "mixed": return "📊 Proporção: 50% modelo / 50% exercícios.\nEstude os modelos formais e aplique em exercícios.";
    case "reading": return "📖 Método: Leitura / resumo / exemplos.\nLeia o material, faça resumos e analise exemplos práticos.";
    default: return "";
  }
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function setTime(date: Date, hours: number, minutes: number): Date {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function detectCollisions(newTasks: NewTask[], existingTasks: DbTask[]): { task: NewTask; shifted: boolean }[] {
  const results: { task: NewTask; shifted: boolean }[] = [];

  for (const nt of newTasks) {
    let start = new Date(nt.start_time);
    let end = new Date(nt.end_time);
    const duration = end.getTime() - start.getTime();
    let shifted = false;

    // Check collision with existing tasks
    const hasCollision = (s: Date, e: Date) =>
      existingTasks.some(et => {
        const es = new Date(et.start_time).getTime();
        const ee = new Date(et.end_time).getTime();
        return s.getTime() < ee && e.getTime() > es;
      });

    let attempts = 0;
    while (hasCollision(start, end) && attempts < 20) {
      start = new Date(start.getTime() + 15 * 60000);
      end = new Date(start.getTime() + duration);
      shifted = true;
      attempts++;
    }

    results.push({
      task: { ...nt, start_time: start.toISOString(), end_time: end.toISOString() },
      shifted,
    });
  }

  return results;
}

function generateStudyTasks(
  subject: SubjectForm,
  weeksAhead: number,
  categoryId: string | null,
  batchId: string,
  chronotypeStartHour?: number
): NewTask[] {
  const tasks: NewTask[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const daySlots: Record<string, number> = {};

  function getNextSlot(date: Date, durationMin: number): { start: Date; end: Date } {
    const dateStr = date.toISOString().slice(0, 10);
    const startHour = daySlots[dateStr] || (chronotypeStartHour ?? 8);
    const startDate = setTime(date, Math.floor(startHour), Math.round((startHour % 1) * 60));
    const endDate = new Date(startDate.getTime() + durationMin * 60000);
    daySlots[dateStr] = startHour + (durationMin + 15) / 60;
    return { start: startDate, end: endDate };
  }

  const revIntervals = [1, 3, 7, 14, 21].slice(0, subject.revisions);

  for (let week = 0; week < weeksAhead; week++) {
    const weekStart = addDays(startOfWeek, week * 7);

    for (const classDay of subject.days) {
      const classDate = addDays(weekStart, classDay === 0 ? 6 : classDay - 1);
      if (classDate < today) continue;

      // Preparation blocks
      for (let p = 0; p < subject.preparation; p++) {
        const prepDate = addDays(classDate, -(p + 1));
        if (prepDate >= today) {
          const slot = getNextSlot(prepDate, 45);
          tasks.push({
            title: `Preparação${subject.preparation > 1 ? ` ${p + 1}` : ""}: ${subject.name}`,
            description: "",
            start_time: slot.start.toISOString(),
            end_time: slot.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "brain",
            custom_category_id: categoryId,
            batch_id: batchId,
          });
        }
      }

      // Study blocks
      for (let b = 0; b < subject.studyBlocks; b++) {
        const slot = getNextSlot(classDate, subject.blockDuration);
        tasks.push({
          title: `Estudo${subject.studyBlocks > 1 ? ` ${b + 1}` : ""}: ${subject.name}`,
          description: "",
          start_time: slot.start.toISOString(),
          end_time: slot.end.toISOString(),
          category: subject.name.toLowerCase(),
          icon: "book",
          custom_category_id: categoryId,
          batch_id: batchId,
        });
      }

      // Revisions
      for (let r = 0; r < revIntervals.length; r++) {
        const revDate = addDays(classDate, revIntervals[r]);
        if (revDate >= today) {
          const slot = getNextSlot(revDate, r < 2 ? 10 : 15);
          tasks.push({
            title: `Revisão ${r + 1}: ${subject.name}`,
            description: "",
            start_time: slot.start.toISOString(),
            end_time: slot.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "brain",
            custom_category_id: categoryId,
            batch_id: batchId,
          });
        }
      }
    }
  }

  return tasks;
}

// Stepper component
function Stepper({ value, onChange, min, max, label }: { value: number; onChange: (v: number) => void; min: number; max: number; label: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <div className="w-10 h-8 rounded-xl neu-pressed flex items-center justify-center text-sm font-display font-bold text-foreground">
          {value}
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-xl neu-btn flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export function StudyRoutineGenerator() {
  const { tasks: allTasks, addTasksBatch } = useAllTasks();
  const { addCategory } = useCustomCategories();
  const { generations, addGeneration, deleteGeneration } = useStudyGenerations();
  const { routines, addRoutine, updateRoutine, deleteRoutine, deleteFutureTasks } = useStudyRoutines();
  const [subjects, setSubjects] = useState<SubjectForm[]>([]);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<string | null>(null);

  // Estimated weekly hours
  const weeklyHours = useMemo(() => {
    return subjects.reduce((total, sub) => {
      if (!sub.name.trim() || sub.days.length === 0) return total;
      const blocksPerDay = sub.studyBlocks * sub.blockDuration;
      const prepPerDay = sub.preparation * 45;
      const revPerDay = sub.revisions * 12; // avg 12 min per revision
      const minutesPerWeek = sub.days.length * (blocksPerDay + prepPerDay + revPerDay);
      return total + minutesPerWeek / 60;
    }, 0);
  }, [subjects]);

  const addSubject = () => {
    setSubjects([...subjects, {
      id: crypto.randomUUID(),
      name: "",
      days: [],
      learningType: "practice",
      color: PALETTE[subjects.length % PALETTE.length],
      studyBlocks: 2,
      revisions: 3,
      preparation: 1,
      blockDuration: 50,
      priority: "medium",
    }]);
  };

  const updateSubject = (id: string, updates: Partial<SubjectForm>) => {
    setSubjects(subjects.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  const toggleDay = (subjectId: string, dayId: number) => {
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) return;
    const days = subject.days.includes(dayId)
      ? subject.days.filter(d => d !== dayId)
      : [...subject.days, dayId];
    updateSubject(subjectId, { days });
  };

  const handleGenerate = async () => {
    const valid = subjects.filter(s => s.name.trim() && s.days.length > 0);
    if (valid.length === 0) {
      toast({ title: "Adicione matérias", description: "Preencha pelo menos uma matéria com dias de aula.", variant: "destructive" });
      return;
    }

    setGenerating(true);
    const batchId = crypto.randomUUID();

    let collisionCount = 0;

    for (const sub of valid) {
      const cat = await addCategory(sub.name, sub.color);
      const catId = cat?.id || null;

      const rawTasks = generateStudyTasks(sub, weeksAhead, catId, batchId);
      const withCollisions = detectCollisions(rawTasks, allTasks);
      collisionCount += withCollisions.filter(c => c.shifted).length;
      const finalTasks = withCollisions.map(c => c.task);

      const error = await addTasksBatch(finalTasks);
      if (error) {
        toast({ title: "Erro ao gerar", description: `Não foi possível criar tarefas para ${sub.name}.`, variant: "destructive" });
        continue;
      }

      // Save routine pattern
      await addRoutine({
        subject: sub.name,
        category_id: catId,
        batch_id: batchId,
        study_blocks: sub.studyBlocks,
        revisions: sub.revisions,
        preparation: sub.preparation,
        block_duration_min: sub.blockDuration,
        start_date: new Date().toISOString().slice(0, 10),
        priority: sub.priority,
        learning_type: sub.learningType as any,
      });
    }

    const label = `${valid.map(s => s.name).join(", ")} · ${weeksAhead} sem.`;
    const totalTasks = valid.reduce((sum, sub) => {
      return sum + generateStudyTasks(sub, weeksAhead, null, "").length;
    }, 0);
    await addGeneration(batchId, label, totalTasks);

    let description = `Rotina criada para ${weeksAhead} semanas.`;
    if (collisionCount > 0) {
      description += ` ${collisionCount} tarefa(s) foram deslocadas para evitar sobreposição.`;
    }
    toast({ title: "Rotina gerada! 🎓", description });
    setSubjects([]);
    setGenerating(false);
  };

  const handleEditForward = async (routine: StudyRoutine) => {
    const sub = subjects.find(s => s.name === routine.subject);
    if (!sub || !routine.batch_id) return;

    setGenerating(true);

    // Delete future tasks
    await deleteFutureTasks(routine.batch_id);

    // Regenerate
    const newBatchId = crypto.randomUUID();
    const cat = await addCategory(sub.name, sub.color);
    const catId = cat?.id || null;

    const rawTasks = generateStudyTasks(sub, weeksAhead, catId, newBatchId);
    const withCollisions = detectCollisions(rawTasks, allTasks);
    const finalTasks = withCollisions.map(c => c.task);
    const shifted = withCollisions.filter(c => c.shifted).length;

    await addTasksBatch(finalTasks);
    await updateRoutine(routine.id, {
      batch_id: newBatchId,
      study_blocks: sub.studyBlocks,
      revisions: sub.revisions,
      preparation: sub.preparation,
      block_duration_min: sub.blockDuration,
      priority: sub.priority,
      learning_type: sub.learningType as any,
    });

    let desc = `Rotina atualizada. ${finalTasks.length} novas tarefas criadas.`;
    if (shifted > 0) desc += ` ${shifted} deslocada(s) por colisão.`;
    toast({ title: "Rotina editada! ✏️", description: desc });
    setEditingRoutine(null);
    setSubjects([]);
    setGenerating(false);
  };

  const handleDeleteGeneration = async (id: string, batchId: string) => {
    setDeleting(id);
    await deleteGeneration(id, batchId);
    toast({ title: "Rotina apagada", description: "Todas as tarefas do lote foram removidas." });
    setDeleting(null);
  };

  const startEditRoutine = (routine: StudyRoutine) => {
    setEditingRoutine(routine.id);
    setSubjects([{
      id: crypto.randomUUID(),
      name: routine.subject,
      days: [],
      learningType: routine.learning_type,
      color: PALETTE[0],
      studyBlocks: routine.study_blocks,
      revisions: routine.revisions,
      preparation: routine.preparation,
      blockDuration: routine.block_duration_min,
      priority: routine.priority,
    }]);
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Módulo Avançado</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-primary" />
          Gerador de Rotina de Estudos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Configure suas matérias e gere automaticamente um plano otimizado com revisão espaçada.
        </p>
      </div>

      {/* Active Routines */}
      {routines.length > 0 && (
        <div className="mb-8 bg-card rounded-2xl p-5 border border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-semibold text-foreground">Rotinas Ativas</h3>
          </div>
          <div className="flex flex-col gap-2">
            {routines.filter(r => r.is_active).map(routine => (
              <div key={routine.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-4 py-3 border border-border/20">
                <div className={`w-2 h-2 rounded-full ${
                  routine.priority === "high" ? "bg-neon-pink" : routine.priority === "medium" ? "bg-neon-orange" : "bg-neon-green"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-medium text-foreground truncate">{routine.subject}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {routine.study_blocks} blocos · {routine.revisions} revisões · {routine.preparation} prep ·{" "}
                    {PRIORITY_CONFIG[routine.priority].label}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditRoutine(routine)}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteRoutine(routine.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generation History */}
      {generations.length > 0 && (
        <div className="mb-8 bg-card rounded-2xl p-5 border border-border/30">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-semibold text-foreground">Histórico de Gerações</h3>
          </div>
          <div className="flex flex-col gap-2">
            {generations.map(gen => (
              <div key={gen.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl px-4 py-3 border border-border/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-medium text-foreground truncate">{gen.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(gen.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {" · "}{gen.task_count} tarefas
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteGeneration(gen.id, gen.batch_id)}
                  disabled={deleting === gen.id}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                >
                  {deleting === gen.id ? (
                    <span className="text-xs">Apagando...</span>
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly hours estimate */}
      {subjects.length > 0 && weeklyHours > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-card rounded-2xl p-4 border border-border/30 flex items-center gap-3">
          <Clock className="w-5 h-5 text-primary shrink-0" />
          <div>
            <p className="text-sm font-display font-semibold text-foreground">
              Carga estimada: {weeklyHours.toFixed(1)}h / semana
            </p>
            <p className="text-[10px] text-muted-foreground">
              {weeklyHours > 20 && "⚠️ Carga alta! Considere reduzir blocos ou revisões."}
              {weeklyHours <= 20 && weeklyHours > 10 && "Carga moderada – bom equilíbrio."}
              {weeklyHours <= 10 && "Carga leve – considere aumentar para melhor retenção."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Subjects list */}
      <div className="flex flex-col gap-4 mb-6">
        <AnimatePresence>
          {subjects.map((sub, idx) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`bg-card rounded-2xl p-5 border border-border/30 ${
                sub.priority === "high" ? "dark:shadow-[0_0_20px_hsl(var(--neon-pink)/0.15)]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sub.color }} />
                  <span className="text-sm font-display font-semibold text-foreground">
                    {editingRoutine ? "Editando Rotina" : `Matéria ${idx + 1}`}
                  </span>
                </div>
                <button onClick={() => removeSubject(sub.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome da Matéria *</Label>
                  <Input
                    value={sub.name}
                    onChange={e => updateSubject(sub.id, { name: e.target.value })}
                    placeholder="Ex: Cálculo II"
                    className="bg-secondary border-border/50 mt-1"
                    disabled={!!editingRoutine}
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Cor</Label>
                  <div className="flex gap-1.5 mt-2 flex-wrap">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        onClick={() => updateSubject(sub.id, { color: c })}
                        className={`w-5 h-5 rounded-full border-2 transition-all ${sub.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Days */}
              <div className="mt-4">
                <Label className="text-xs text-muted-foreground">Dias da Aula *</Label>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {WEEK_DAYS.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(sub.id, day.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        sub.days.includes(day.id)
                          ? "text-primary-foreground"
                          : "bg-secondary text-muted-foreground hover:text-foreground"
                      }`}
                      style={sub.days.includes(day.id) ? { backgroundColor: sub.color } : undefined}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steppers */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
                <Stepper label="Blocos de Estudo" value={sub.studyBlocks} onChange={v => updateSubject(sub.id, { studyBlocks: v })} min={1} max={4} />
                <Stepper label="Revisões" value={sub.revisions} onChange={v => updateSubject(sub.id, { revisions: v })} min={0} max={5} />
                <Stepper label="Preparação" value={sub.preparation} onChange={v => updateSubject(sub.id, { preparation: v })} min={0} max={2} />
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs text-muted-foreground">Duração (min)</Label>
                  <div className="flex items-center gap-2">
                    <Slider
                      value={[sub.blockDuration]}
                      onValueChange={([v]) => updateSubject(sub.id, { blockDuration: v })}
                      min={25}
                      max={90}
                      step={5}
                      className="flex-1"
                    />
                    <span className="text-xs font-display font-bold text-foreground w-8 text-right">{sub.blockDuration}</span>
                  </div>
                </div>
              </div>

              {/* Priority + Learning Type */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Prioridade</Label>
                  <div className="flex gap-2 mt-2">
                    {(["low", "medium", "high"] as const).map(p => (
                      <button
                        key={p}
                        onClick={() => updateSubject(sub.id, { priority: p })}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          sub.priority === p
                            ? `neu-pressed ${PRIORITY_CONFIG[p].color} ${PRIORITY_CONFIG[p].glow}`
                            : "neu-btn text-muted-foreground"
                        }`}
                      >
                        {PRIORITY_CONFIG[p].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Tipo de Aprendizagem</Label>
                  <Select value={sub.learningType} onValueChange={v => updateSubject(sub.id, { learningType: v })}>
                    <SelectTrigger className="bg-secondary border-border/50 mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border/30">
                      {LEARNING_TYPES.map(lt => (
                        <SelectItem key={lt.id} value={lt.id}>
                          <span className="font-medium">{lt.label}</span>
                          <span className="text-muted-foreground text-xs ml-2">({lt.desc})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {!editingRoutine && (
        <button
          onClick={addSubject}
          className="w-full py-4 border-2 border-dashed border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:border-border/80 transition-all flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Adicionar Matéria</span>
        </button>
      )}

      {subjects.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-5 border border-border/30 mb-6">
          <Label className="text-xs text-muted-foreground">Gerar para quantas semanas?</Label>
          <div className="flex items-center gap-4 mt-2">
            {[2, 4, 8, 12, 16].map(w => (
              <button
                key={w}
                onClick={() => setWeeksAhead(w)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  weeksAhead === w
                    ? "bg-primary text-primary-foreground glow-pink"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {w} sem.
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {subjects.length > 0 && (
        editingRoutine ? (
          <div className="flex gap-3">
            <Button
              onClick={() => {
                const routine = routines.find(r => r.id === editingRoutine);
                if (routine) handleEditForward(routine);
              }}
              disabled={generating}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground glow-pink py-6 text-base font-display font-semibold"
            >
              {generating ? "Atualizando..." : (
                <>
                  <Pencil className="w-5 h-5 mr-2" />
                  Salvar Edição (Daqui para Frente)
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => { setEditingRoutine(null); setSubjects([]); }}
              className="py-6"
            >
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-pink py-6 text-base font-display font-semibold"
          >
            {generating ? "Gerando rotina..." : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Rotina de Estudos
              </>
            )}
          </Button>
        )
      )}

      {/* Info cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <BookOpen className="w-6 h-6 text-primary mb-2" />
          <h4 className="text-sm font-display font-semibold text-foreground">Revisão Espaçada</h4>
          <p className="text-xs text-muted-foreground mt-1">Até 5 revisões configuráveis com intervalos crescentes.</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <AlertTriangle className="w-6 h-6 text-neon-orange mb-2" />
          <h4 className="text-sm font-display font-semibold text-foreground">Colisão Inteligente</h4>
          <p className="text-xs text-muted-foreground mt-1">Tarefas são deslocadas automaticamente se houver sobreposição.</p>
        </div>
        <div className="bg-card rounded-2xl p-4 border border-border/30">
          <Sparkles className="w-6 h-6 text-primary mb-2" />
          <h4 className="text-sm font-display font-semibold text-foreground">Edição "Daqui para Frente"</h4>
          <p className="text-xs text-muted-foreground mt-1">Edite rotinas ativas sem alterar o histórico passado.</p>
        </div>
      </div>
    </div>
  );
}
