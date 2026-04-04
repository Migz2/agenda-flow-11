import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Clock, CheckCircle2, Target, Flame, Sparkles, Brain, TrendingUp } from "lucide-react";
import { useCompletedTasksHistory, useAllTasks, useCustomCategories } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useTheme } from "@/hooks/useTheme";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";

function calculateStreak(completedTasks: any[]): number {
  if (completedTasks.length === 0) return 0;
  const dates = new Set(completedTasks.map(t => new Date(t.updated_at).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (dates.has(d.toISOString().slice(0, 10))) streak++;
    else if (i > 0) break;
    else break;
  }
  return streak;
}

function calculateHours(tasks: any[]): number {
  return tasks.reduce((sum, t) => {
    const s = new Date(t.start_time).getTime();
    const e = new Date(t.end_time).getTime();
    return sum + (e - s) / 3600000;
  }, 0);
}

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function MetricCard({ label, value, subtitle, icon: Icon, glowClass }: { label: string; value: string; subtitle: string; icon: any; glowClass: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-card neu-flat rounded-2xl p-5 ${glowClass}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-2xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  );
}

export function MetaDashboard() {
  const completedTasks = useCompletedTasksHistory();
  const { tasks: allTasks } = useAllTasks();
  const { categories } = useCustomCategories();
  const { profile } = useProfile();
  const { theme } = useTheme();

  const [sessionGoal, setSessionGoal] = useState("");
  const [retentionScore, setRetentionScore] = useState([7]);
  const [retentionHistory, setRetentionHistory] = useState<number[]>([]);
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

  useMemo(() => {
    if (categories.length > 0 && selectedCatIds.size === 0) {
      setSelectedCatIds(new Set(categories.map(c => c.id)));
    }
  }, [categories]);

  const totalCompleted = completedTasks.length;
  const totalPending = allTasks.filter(t => !t.completed).length;
  const rate = allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0;
  const hours = useMemo(() => calculateHours(completedTasks), [completedTasks]);
  const streak = useMemo(() => calculateStreak(completedTasks), [completedTasks]);

  const radarData = useMemo(() => {
    const now = new Date();
    return categories
      .filter(cat => selectedCatIds.has(cat.id))
      .map(cat => {
        let thisWeek = 0, lastWeek = 0;
        completedTasks.forEach(t => {
          if (t.custom_category_id !== cat.id) return;
          const d = new Date(t.updated_at);
          const tw = getWeekNumber(d), cw = getWeekNumber(now);
          if (d.getFullYear() === now.getFullYear()) {
            if (tw === cw) thisWeek++;
            else if (tw === cw - 1) lastWeek++;
          }
        });
        return { category: cat.name, thisWeek, lastWeek };
      });
  }, [completedTasks, categories, selectedCatIds]);

  const handleLogRetention = () => {
    setRetentionHistory(prev => [...prev.slice(-19), retentionScore[0]]);
  };

  const c1 = theme === "dark" ? "hsl(330 100% 50%)" : "hsl(168 55% 32%)";
  const c2 = theme === "dark" ? "hsl(186 100% 50%)" : "hsl(200 60% 45%)";
  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";

  const chronoLabel = profile?.chronotype === "lion" ? "🦁 Leão" : profile?.chronotype === "bear" ? "🐻 Urso" : profile?.chronotype === "wolf" ? "🐺 Lobo" : null;

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto pt-20">
      <div className="mb-6">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Visão Geral</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Dashboard</h2>
        {chronoLabel && (
          <p className="text-sm text-muted-foreground mt-1">
            Perfil: {chronoLabel} · {profile?.conscientiousness === "high" ? "Alta Disciplina" : "Disciplina Flexível"} · {profile?.neuroticism === "high" ? "Alta Sensibilidade" : "Baixa Sensibilidade"}
          </p>
        )}
      </div>

      {/* Session Wrappers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card neu-flat rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs font-display font-semibold text-foreground">Sessão Ativa</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">Qual o seu objetivo para o bloco de agora?</p>
          <Input
            value={sessionGoal}
            onChange={e => setSessionGoal(e.target.value)}
            placeholder="Ex: Revisar capítulo 5 de Cálculo"
            className="bg-secondary border-border/50 neu-pressed text-sm"
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card neu-flat rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <p className="text-xs font-display font-semibold text-foreground">Pós-Sessão</p>
          </div>
          <p className="text-xs text-muted-foreground mb-2">De 1 a 10, quão bem você reteve a última matéria?</p>
          <div className="flex items-center gap-3">
            <Slider value={retentionScore} onValueChange={setRetentionScore} min={1} max={10} step={1} className="flex-1" />
            <span className="text-lg font-display font-bold text-foreground w-8 text-center">{retentionScore[0]}</span>
            <Button onClick={handleLogRetention} size="sm" className="bg-primary text-primary-foreground text-xs shrink-0">
              Registrar
            </Button>
          </div>
          {retentionHistory.length > 0 && (
            <div className="flex gap-1 mt-3 items-end h-6">
              {retentionHistory.map((v, i) => (
                <div key={i} className="flex-1 rounded-sm bg-primary/60 transition-all" style={{ height: `${(v / 10) * 100}%` }} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Horas Estudadas" value={hours.toFixed(1) + "h"} subtitle="tempo concluído" icon={Clock} glowClass="" />
        <MetricCard label="Blocos Concluídos" value={`${totalCompleted}/${totalCompleted + totalPending}`} subtitle={`${totalPending} pendentes`} icon={CheckCircle2} glowClass="" />
        <MetricCard label="Taxa de Conclusão" value={`${rate}%`} subtitle={rate >= 70 ? "Excelente!" : "Continue!"} icon={Target} glowClass="" />
        <MetricCard label="Streak" value={`${streak} dia${streak !== 1 ? "s" : ""}`} subtitle={streak >= 7 ? "🔥 Em chamas!" : "Mantenha o ritmo!"} icon={Flame} glowClass="" />
      </div>

      {/* Radar Chart */}
      <div className="bg-card neu-flat rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-display font-semibold text-foreground">Produtividade por Categoria</h3>
            <p className="text-xs text-muted-foreground">Tarefas concluídas esta semana vs. anterior</p>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="neu-btn text-xs">
                Filtrar ({selectedCatIds.size}/{categories.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="bg-popover border-border/30 w-56 p-3">
              {categories.map(c => (
                <label key={c.id} className="flex items-center gap-2 cursor-pointer py-1">
                  <Checkbox checked={selectedCatIds.has(c.id)} onCheckedChange={() => {
                    const next = new Set(selectedCatIds);
                    next.has(c.id) ? next.delete(c.id) : next.add(c.id);
                    setSelectedCatIds(next);
                  }} />
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                  <span className="text-xs text-foreground truncate">{c.name}</span>
                </label>
              ))}
              {categories.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria</p>}
            </PopoverContent>
          </Popover>
        </div>
        {radarData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="70%">
                <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="category" tick={{ fill: tickColor, fontSize: 10 }} />
                <PolarRadiusAxis angle={30} domain={[0, Math.max(1, ...radarData.map(d => Math.max(d.thisWeek, d.lastWeek))) + 2]} tick={{ fill: tickColor, fontSize: 8 }} axisLine={false} />
                <Radar name="Esta Semana" dataKey="thisWeek" stroke={c1} fill={c1} fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Semana Passada" dataKey="lastWeek" stroke={c2} fill={c2} fillOpacity={0.1} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <p className="text-xs text-muted-foreground">Selecione categorias para ver o gráfico</p>
          </div>
        )}
      </div>
    </div>
  );
}
