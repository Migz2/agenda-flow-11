import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GraduationCap, Sparkles, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useAllTasks, useCustomCategories, type NewTask } from "@/hooks/useTasks";
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
  { id: "A", label: "Tipo A – Matemática", desc: "30% teoria / 70% exercícios" },
  { id: "B", label: "Tipo B – Sistemas Técnicos", desc: "40% conceito / 30% visualização / 30% prática" },
  { id: "C", label: "Tipo C – Modelos Formais", desc: "50% modelo / 50% exercícios" },
  { id: "D", label: "Tipo D – Conceitual Leve", desc: "Leitura / resumo / exemplos" },
];

const PALETTE = ["#ff0080", "#ff6600", "#00d4ff", "#22cc44", "#aa44ff", "#ffcc00", "#ff4444", "#00ff88", "#4488ff", "#ff88cc"];

interface Subject {
  id: string;
  name: string;
  days: number[];
  difficulty: "normal" | "hard";
  learningType: string;
  color: string;
}

function getDescriptionForType(type: string): string {
  switch (type) {
    case "A": return "📐 Proporção: 30% teoria / 70% exercícios.\nFoque em resolver problemas práticos após revisar a teoria.";
    case "B": return "🔧 Proporção: 40% conceito / 30% visualização / 30% prática.\nEntenda o sistema, visualize diagramas, depois pratique.";
    case "C": return "📊 Proporção: 50% modelo / 50% exercícios.\nEstude os modelos formais e aplique em exercícios.";
    case "D": return "📖 Método: Leitura / resumo / exemplos.\nLeia o material, faça resumos e analise exemplos práticos.";
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

function generateStudyTasks(
  subjects: Subject[],
  weeksAhead: number,
  categoryMap: Record<string, string> // subjectName -> customCategoryId
): NewTask[] {
  const tasks: NewTask[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the start of this week (Monday)
  const startOfWeek = new Date(today);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  // Track used time slots per day to avoid overlaps
  const daySlots: Record<string, number> = {}; // dateStr -> next available hour

  function getNextSlot(date: Date, durationMin: number): { start: Date; end: Date } {
    const dateStr = date.toISOString().slice(0, 10);
    const startHour = daySlots[dateStr] || 8; // Start from 8 AM
    const startDate = setTime(date, Math.floor(startHour), Math.round((startHour % 1) * 60));
    const endDate = new Date(startDate.getTime() + durationMin * 60000);
    // Add 15 min gap
    daySlots[dateStr] = startHour + (durationMin + 15) / 60;
    return { start: startDate, end: endDate };
  }

  for (let week = 0; week < weeksAhead; week++) {
    const weekStart = addDays(startOfWeek, week * 7);

    for (const subject of subjects) {
      const catId = categoryMap[subject.name] || null;

      for (const classDay of subject.days) {
        const classDate = addDays(weekStart, classDay === 0 ? 6 : classDay - 1);
        
        // Skip past dates
        if (classDate < today) continue;

        // === Rule: Preparation (if hard) - 1-2 days before ===
        if (subject.difficulty === "hard") {
          const prepDate = addDays(classDate, -1);
          if (prepDate >= today) {
            const slot = getNextSlot(prepDate, 45);
            tasks.push({
              title: `Preparação: ${subject.name}`,
              description: `Estudo preparatório para a aula de ${subject.name}.\n${getDescriptionForType(subject.learningType)}`,
              start_time: slot.start.toISOString(),
              end_time: slot.end.toISOString(),
              category: subject.name.toLowerCase(),
              icon: "brain",
              custom_category_id: catId,
            });
          }
        }

        // === Rule: Class Day Study (45-60 min blocks) ===
        const block1 = getNextSlot(classDate, 50);
        tasks.push({
          title: `Estudo Forte: ${subject.name}`,
          description: `Bloco principal de estudo pós-aula.\n${getDescriptionForType(subject.learningType)}`,
          start_time: block1.start.toISOString(),
          end_time: block1.end.toISOString(),
          category: subject.name.toLowerCase(),
          icon: "book",
          custom_category_id: catId,
        });

        if (subject.difficulty === "hard") {
          const block2 = getNextSlot(classDate, 45);
          tasks.push({
            title: `Estudo Forte 2: ${subject.name}`,
            description: `Segundo bloco de reforço.\n${getDescriptionForType(subject.learningType)}`,
            start_time: block2.start.toISOString(),
            end_time: block2.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "book",
            custom_category_id: catId,
          });
        }

        // === Rule: Spaced Repetition ===
        // Review 1: next day, 10 min
        const rev1Date = addDays(classDate, 1);
        if (rev1Date >= today) {
          const slot = getNextSlot(rev1Date, 10);
          tasks.push({
            title: `Revisão 1: ${subject.name}`,
            description: "Revisão espaçada (1 dia depois). Releia resumos e faça flashcards.",
            start_time: slot.start.toISOString(),
            end_time: slot.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "brain",
            custom_category_id: catId,
          });
        }

        // Review 2: 3 days later, 10 min
        const rev2Date = addDays(classDate, 3);
        if (rev2Date >= today) {
          const slot = getNextSlot(rev2Date, 10);
          tasks.push({
            title: `Revisão 2: ${subject.name}`,
            description: "Revisão espaçada (3 dias depois). Teste sua memória ativa.",
            start_time: slot.start.toISOString(),
            end_time: slot.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "brain",
            custom_category_id: catId,
          });
        }

        // Review 3: 7 days later, 15 min
        const rev3Date = addDays(classDate, 7);
        if (rev3Date >= today) {
          const slot = getNextSlot(rev3Date, 15);
          tasks.push({
            title: `Revisão 3: ${subject.name}`,
            description: "Revisão espaçada (7 dias depois). Consolide o conhecimento.",
            start_time: slot.start.toISOString(),
            end_time: slot.end.toISOString(),
            category: subject.name.toLowerCase(),
            icon: "brain",
            custom_category_id: catId,
          });
        }
      }
    }

    // === Rule: Weekly Practice & Recovery (Saturday) ===
    const saturday = addDays(weekStart, 5);
    if (saturday >= today) {
      const recSlot = getNextSlot(saturday, 40);
      tasks.push({
        title: "Recuperação Ativa Geral",
        description: "Revisão geral de todas as matérias da semana. Faça testes práticos e identifique pontos fracos.",
        start_time: recSlot.start.toISOString(),
        end_time: recSlot.end.toISOString(),
        category: "estudo",
        icon: "graduation",
      });

      const pracSlot = getNextSlot(saturday, 60);
      tasks.push({
        title: "Prática Semanal / Projeto",
        description: "Dedique tempo a projetos práticos ou exercícios integradores das matérias da semana.",
        start_time: pracSlot.start.toISOString(),
        end_time: pracSlot.end.toISOString(),
        category: "estudo",
        icon: "code",
      });
    }
  }

  return tasks;
}

export function StudyRoutineGenerator() {
  const { addTasksBatch } = useAllTasks();
  const { addCategory } = useCustomCategories();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [weeksAhead, setWeeksAhead] = useState(4);
  const [generating, setGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  const addSubject = () => {
    setSubjects([...subjects, {
      id: crypto.randomUUID(),
      name: "",
      days: [],
      difficulty: "normal",
      learningType: "A",
      color: PALETTE[subjects.length % PALETTE.length],
    }]);
  };

  const updateSubject = (id: string, updates: Partial<Subject>) => {
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

    // Create custom categories for each subject
    const categoryMap: Record<string, string> = {};
    for (const sub of valid) {
      const cat = await addCategory(sub.name, sub.color);
      if (cat) categoryMap[sub.name] = cat.id;
    }

    // Generate tasks
    const tasks = generateStudyTasks(valid, weeksAhead, categoryMap);

    // Batch insert
    const error = await addTasksBatch(tasks);
    if (error) {
      toast({ title: "Erro ao gerar", description: "Não foi possível criar as tarefas.", variant: "destructive" });
    } else {
      toast({ title: "Rotina gerada! 🎓", description: `${tasks.length} tarefas criadas para ${weeksAhead} semanas.` });
      setGenerated(true);
    }
    setGenerating(false);
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
          Configure suas matérias e gere automaticamente um plano de estudos otimizado com revisão espaçada.
        </p>
      </div>

      {generated ? (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-16">
          <Sparkles className="w-16 h-16 text-primary mx-auto mb-4" />
          <h3 className="text-xl font-display font-bold text-foreground mb-2">Rotina gerada com sucesso!</h3>
          <p className="text-sm text-muted-foreground mb-6">Confira suas tarefas no Planner, Calendar e Tasks.</p>
          <Button onClick={() => { setGenerated(false); setSubjects([]); }} variant="outline" className="border-border/50">
            Gerar outra rotina
          </Button>
        </motion.div>
      ) : (
        <>
          {/* Subjects list */}
          <div className="flex flex-col gap-4 mb-6">
            <AnimatePresence>
              {subjects.map((sub, idx) => (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  className="bg-card rounded-2xl p-5 border border-border/30"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-sm font-display font-semibold text-foreground">
                        Matéria {idx + 1}
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

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Dificuldade</Label>
                      <Select value={sub.difficulty} onValueChange={v => updateSubject(sub.id, { difficulty: v as any })}>
                        <SelectTrigger className="bg-secondary border-border/50 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border/30">
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="hard">Difícil</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tipo de Aprendizagem *</Label>
                      <Select value={sub.learningType} onValueChange={v => updateSubject(sub.id, { learningType: v })}>
                        <SelectTrigger className="bg-secondary border-border/50 mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-popover border-border/30">
                          {LEARNING_TYPES.map(lt => (
                            <SelectItem key={lt.id} value={lt.id}>
                              <div>
                                <span className="font-medium">{lt.label}</span>
                                <span className="text-muted-foreground text-xs ml-2">({lt.desc})</span>
                              </div>
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

          <button
            onClick={addSubject}
            className="w-full py-4 border-2 border-dashed border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:border-border/80 transition-all flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Adicionar Matéria</span>
          </button>

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
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-pink py-6 text-base font-display font-semibold"
            >
              {generating ? (
                "Gerando rotina..."
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Gerar Rotina de Estudos
                </>
              )}
            </Button>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
            <div className="bg-card rounded-2xl p-4 border border-border/30">
              <BookOpen className="w-6 h-6 text-primary mb-2" />
              <h4 className="text-sm font-display font-semibold text-foreground">Revisão Espaçada</h4>
              <p className="text-xs text-muted-foreground mt-1">3 revisões automáticas: 1 dia, 3 dias e 7 dias após cada aula.</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border/30">
              <GraduationCap className="w-6 h-6 text-primary mb-2" />
              <h4 className="text-sm font-display font-semibold text-foreground">Preparação</h4>
              <p className="text-xs text-muted-foreground mt-1">Matérias difíceis recebem bloco de preparação 1 dia antes.</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border border-border/30">
              <Sparkles className="w-6 h-6 text-primary mb-2" />
              <h4 className="text-sm font-display font-semibold text-foreground">Prática Semanal</h4>
              <p className="text-xs text-muted-foreground mt-1">Recuperação ativa + projeto prático todo sábado.</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
