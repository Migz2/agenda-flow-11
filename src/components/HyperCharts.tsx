import { motion } from "framer-motion";
import { categories, type CategoryId } from "@/lib/taskData";
import { useMemo } from "react";
import { useCompletedTasksHistory, useAllTasks } from "@/hooks/useTasks";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function buildRadarData(tasks: any[], period: "week" | "month") {
  const now = new Date();
  const catIds = Object.keys(categories) as CategoryId[];

  return catIds.map(id => {
    const cat = categories[id];
    let thisCount = 0;
    let lastCount = 0;

    tasks.forEach(t => {
      if (t.category !== id) return;
      const d = new Date(t.updated_at);
      if (period === "week") {
        const taskWeek = getWeekNumber(d);
        const currentWeek = getWeekNumber(now);
        if (d.getFullYear() === now.getFullYear()) {
          if (taskWeek === currentWeek) thisCount++;
          else if (taskWeek === currentWeek - 1) lastCount++;
        }
      } else {
        if (d.getFullYear() === now.getFullYear()) {
          if (d.getMonth() === now.getMonth()) thisCount++;
          else if (d.getMonth() === now.getMonth() - 1) lastCount++;
        }
      }
    });

    return { category: cat.label, thisWeek: thisCount, lastWeek: lastCount, hsl: cat.hsl };
  });
}

function NeonRadarChart({ title, subtitle, dataKey1, dataKey2, color1, color2, data }: {
  title: string; subtitle: string;
  dataKey1: string; dataKey2: string;
  color1: string; color2: string;
  data: any[];
}) {
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.thisWeek, d.lastWeek)));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl p-5 border border-border/30"
    >
      <h3 className="text-sm font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">{subtitle}</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(0 0% 20%)" strokeDasharray="3 3" />
            <PolarAngleAxis dataKey="category" tick={{ fill: "hsl(0 0% 50%)", fontSize: 10 }} />
            <PolarRadiusAxis angle={30} domain={[0, maxVal + 2]} tick={{ fill: "hsl(0 0% 30%)", fontSize: 8 }} axisLine={false} />
            <Radar name={dataKey1} dataKey="thisWeek" stroke={color1} fill={color1} fillOpacity={0.15} strokeWidth={2} dot={false} />
            <Radar name={dataKey2} dataKey="lastWeek" stroke={color2} fill={color2} fillOpacity={0.1} strokeWidth={2} dot={false} />
            <Tooltip
              contentStyle={{ backgroundColor: "hsl(0 0% 8%)", border: "1px solid hsl(0 0% 20%)", borderRadius: "8px", fontSize: "12px" }}
              labelStyle={{ color: "hsl(0 0% 90%)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1 }} />
          <span className="text-[10px] text-muted-foreground">{dataKey1}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2 }} />
          <span className="text-[10px] text-muted-foreground">{dataKey2}</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, change, color }: { label: string; value: string; change: string; color: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl p-5 border border-border/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p>
      <p className="text-xs mt-1" style={{ color }}>{change}</p>
    </motion.div>
  );
}

export function HyperCharts() {
  const completedTasks = useCompletedTasksHistory();
  const { tasks: allTasks } = useAllTasks();

  const weeklyData = useMemo(() => buildRadarData(completedTasks, "week"), [completedTasks]);
  const monthlyData = useMemo(() => buildRadarData(completedTasks, "month"), [completedTasks]);

  const totalCompleted = completedTasks.length;
  const totalPending = allTasks.filter(t => !t.completed).length;
  const rate = allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0;

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Analytics</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Hyper Charts</h2>
        <p className="text-sm text-muted-foreground mt-1">Visualização da sua produtividade</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tarefas Completas" value={String(totalCompleted)} change={`${totalPending} pendentes`} color="hsl(110 100% 55%)" />
        <StatCard label="Total de Tarefas" value={String(allTasks.length)} change="todas as tarefas" color="hsl(186 100% 50%)" />
        <StatCard label="Taxa de Conclusão" value={`${rate}%`} change={rate >= 70 ? "Ótimo!" : "Continue!"} color="hsl(330 100% 50%)" />
        <StatCard label="Categorias Ativas" value={String(new Set(allTasks.map(t => t.category)).size)} change="categorias utilizadas" color="hsl(22 100% 50%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonRadarChart
          title="Produtividade Semanal"
          subtitle="Tarefas concluídas por categoria esta semana"
          dataKey1="Esta Semana"
          dataKey2="Semana Passada"
          color1="hsl(330 100% 50%)"
          color2="hsl(186 100% 50%)"
          data={weeklyData}
        />
        <NeonRadarChart
          title="Tendência Mensal"
          subtitle="Tarefas concluídas por categoria este mês"
          dataKey1="Este Mês"
          dataKey2="Mês Passado"
          color1="hsl(110 100% 55%)"
          color2="hsl(22 100% 50%)"
          data={monthlyData}
        />
      </div>
    </div>
  );
}
