import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Flame, Target, TrendingUp } from "lucide-react";
import { useCompletedTasksHistory, useAllTasks } from "@/hooks/useTasks";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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

function MetricCard({ label, value, subtitle, icon: Icon, glowClass }: { label: string; value: string; subtitle: string; icon: any; glowClass?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`bg-card neu-flat rounded-2xl p-6 ${glowClass ?? ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-3xl font-display font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </motion.div>
  );
}

export function MetaDashboard() {
  const completedTasks = useCompletedTasksHistory();
  const { tasks: allTasks } = useAllTasks();
  const { profile } = useProfile();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [espcexSummary, setEspcexSummary] = useState<{ name: string; pct: number }[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: exams } = await (supabase as any)
        .from("espcex_exams").select("id,name,exam_date").eq("user_id", user.id)
        .order("exam_date", { ascending: false }).limit(3);
      if (!exams || exams.length === 0) return;
      const ids = exams.map((e: any) => e.id);
      const { data: contents } = await (supabase as any)
        .from("espcex_contents").select("exam_id,total_questions,correct").in("exam_id", ids);
      const summary = exams.map((e: any) => {
        const rows = (contents ?? []).filter((c: any) => c.exam_id === e.id);
        const total = rows.reduce((s: number, r: any) => s + (r.total_questions || 0), 0);
        const correct = rows.reduce((s: number, r: any) => s + (r.correct || 0), 0);
        return { name: e.name, pct: total > 0 ? Math.round((correct / total) * 100) : 0 };
      });
      setEspcexSummary(summary);
    })();
  }, [user]);

  const hours = useMemo(() => calculateHours(completedTasks), [completedTasks]);
  const streak = useMemo(() => calculateStreak(completedTasks), [completedTasks]);

  // Weekly tasks completed (current vs previous 7-day windows)
  const weeklyData = useMemo(() => {
    const out: { day: string; current: number; previous: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const cur = new Date(now); cur.setDate(now.getDate() - i);
      const prev = new Date(now); prev.setDate(now.getDate() - i - 7);
      const curKey = cur.toISOString().slice(0, 10);
      const prevKey = prev.toISOString().slice(0, 10);
      const curCount = completedTasks.filter(t => new Date(t.updated_at).toISOString().slice(0, 10) === curKey).length;
      const prevCount = completedTasks.filter(t => new Date(t.updated_at).toISOString().slice(0, 10) === prevKey).length;
      out.push({ day: cur.toLocaleDateString("pt-BR", { weekday: "short" }), current: curCount, previous: prevCount });
    }
    return out;
  }, [completedTasks]);

  // Monthly: tasks per week for last 8 weeks vs previous 8
  const monthlyData = useMemo(() => {
    const out: { week: string; current: number; previous: number }[] = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const startCur = new Date(now); startCur.setDate(now.getDate() - (i + 1) * 7);
      const endCur = new Date(now); endCur.setDate(now.getDate() - i * 7);
      const startPrev = new Date(now); startPrev.setDate(now.getDate() - (i + 5) * 7);
      const endPrev = new Date(now); endPrev.setDate(now.getDate() - (i + 4) * 7);
      const inRange = (d: Date, a: Date, b: Date) => d >= a && d < b;
      const cur = completedTasks.filter(t => inRange(new Date(t.updated_at), startCur, endCur)).length;
      const prev = completedTasks.filter(t => inRange(new Date(t.updated_at), startPrev, endPrev)).length;
      out.push({ week: `S-${i}`, current: cur, previous: prev });
    }
    return out;
  }, [completedTasks]);

  const c1 = theme === "dark" ? "hsl(330 100% 55%)" : "hsl(168 55% 32%)";
  const c2 = theme === "dark" ? "hsl(186 100% 50%)" : "hsl(200 60% 45%)";
  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";

  const chronoLabel = profile?.chronotype === "lion" ? "🦁 Leão" : profile?.chronotype === "bear" ? "🐻 Urso" : profile?.chronotype === "wolf" ? "🐺 Lobo" : null;

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto pt-24">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Visão Geral</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Dashboard</h2>
        {chronoLabel && (
          <p className="text-sm text-muted-foreground mt-1">
            Perfil: {chronoLabel} · {profile?.conscientiousness === "high" ? "Alta Disciplina" : "Disciplina Flexível"} · {profile?.neuroticism === "high" ? "Alta Sensibilidade" : "Baixa Sensibilidade"}
          </p>
        )}
      </div>

      {/* Top metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricCard
          label="Streak Diário"
          value={`${streak} dia${streak !== 1 ? "s" : ""}`}
          subtitle={streak >= 7 ? "🔥 Em chamas!" : "Mantenha o ritmo!"}
          icon={Flame}
          glowClass="dark:shadow-[0_0_25px_hsl(330_100%_50%/0.3)] border border-primary/20"
        />
        <MetricCard
          label="Horas Estudadas"
          value={hours.toFixed(1) + "h"}
          subtitle="tempo total acumulado"
          icon={Clock}
        />
        <MetricCard
          label="Tarefas Concluídas"
          value={String(completedTasks.length)}
          subtitle={`${allTasks.filter(t => !t.completed).length} pendentes`}
          icon={Target}
        />
      </div>

      {/* EsPCEx widget */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card neu-flat rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-display font-semibold text-foreground">Últimos Progressos EsPCEx</h3>
        </div>
        {espcexSummary.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma prova registrada. Acesse a aba EsPCEx para começar.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {espcexSummary.slice().reverse().map((e, i, arr) => (
              <div key={i} className="flex items-center gap-2">
                <span className="px-3 py-1.5 rounded-xl neu-pressed text-xs">
                  <span className="font-medium text-foreground">{e.name}</span>
                  <span className="text-muted-foreground"> · {e.pct}%</span>
                </span>
                {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Productivity charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card neu-flat rounded-2xl p-6">
          <h3 className="text-sm font-display font-semibold text-foreground mb-1">Produtividade Semanal</h3>
          <p className="text-xs text-muted-foreground mb-4">Esta semana vs. semana anterior</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previous" name="Anterior" fill={c2} radius={[6, 6, 0, 0]} />
                <Bar dataKey="current" name="Atual" fill={c1} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card neu-flat rounded-2xl p-6">
          <h3 className="text-sm font-display font-semibold text-foreground mb-1">Produtividade Mensal</h3>
          <p className="text-xs text-muted-foreground mb-4">Últimas 4 semanas vs. 4 anteriores</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="week" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="previous" name="Anterior" fill={c2} radius={[6, 6, 0, 0]} />
                <Bar dataKey="current" name="Atual" fill={c1} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
