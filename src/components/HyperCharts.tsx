import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useCompletedTasksHistory, useAllTasks, useCustomCategories } from "@/hooks/useTasks";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { Input } from "@/components/ui/input";
import { Pencil } from "lucide-react";

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function buildDynamicRadarData(
  tasks: any[],
  customCats: { id: string; name: string; color: string }[],
  period: "week" | "month"
) {
  const now = new Date();

  return customCats.map(cat => {
    let thisCount = 0;
    let lastCount = 0;

    tasks.forEach(t => {
      if (t.custom_category_id !== cat.id) return;
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

    return { category: cat.name, thisWeek: thisCount, lastWeek: lastCount, color: cat.color };
  });
}

function NeonRadarChart({ title, subtitle, onTitleChange, onSubtitleChange, dataKey1, dataKey2, color1, color2, data }: {
  title: string; subtitle: string;
  onTitleChange: (v: string) => void; onSubtitleChange: (v: string) => void;
  dataKey1: string; dataKey2: string;
  color1: string; color2: string;
  data: any[];
}) {
  const maxVal = Math.max(1, ...data.map(d => Math.max(d.thisWeek, d.lastWeek)));
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingSub, setEditingSub] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl p-5 border border-border/30"
    >
      <div className="flex items-center gap-2 mb-1">
        {editingTitle ? (
          <Input value={title} onChange={e => onTitleChange(e.target.value)} onBlur={() => setEditingTitle(false)} autoFocus className="bg-secondary border-border/50 h-7 text-sm font-display font-semibold" />
        ) : (
          <h3 className="text-sm font-display font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingTitle(true)}>
            {title} <Pencil className="w-3 h-3 inline ml-1 text-muted-foreground" />
          </h3>
        )}
      </div>
      {editingSub ? (
        <Input value={subtitle} onChange={e => onSubtitleChange(e.target.value)} onBlur={() => setEditingSub(false)} autoFocus className="bg-secondary border-border/50 h-6 text-xs mb-4" />
      ) : (
        <p className="text-xs text-muted-foreground mb-4 cursor-pointer hover:text-foreground/60" onClick={() => setEditingSub(true)}>{subtitle}</p>
      )}

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Crie categorias para ver os gráficos</p>
        </div>
      ) : (
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
      )}
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
  const { categories: customCats } = useCustomCategories();

  const [weekTitle, setWeekTitle] = useState("Produtividade Semanal");
  const [weekSub, setWeekSub] = useState("Tarefas concluídas por categoria esta semana");
  const [monthTitle, setMonthTitle] = useState("Tendência Mensal");
  const [monthSub, setMonthSub] = useState("Tarefas concluídas por categoria este mês");

  const weeklyData = useMemo(() => buildDynamicRadarData(completedTasks, customCats, "week"), [completedTasks, customCats]);
  const monthlyData = useMemo(() => buildDynamicRadarData(completedTasks, customCats, "month"), [completedTasks, customCats]);

  const totalCompleted = completedTasks.length;
  const totalPending = allTasks.filter(t => !t.completed).length;
  const rate = allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0;

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Analytics</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Hyper Charts</h2>
        <p className="text-sm text-muted-foreground mt-1">Visualização dinâmica da sua produtividade</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tarefas Completas" value={String(totalCompleted)} change={`${totalPending} pendentes`} color="hsl(110 100% 55%)" />
        <StatCard label="Total de Tarefas" value={String(allTasks.length)} change="todas as tarefas" color="hsl(186 100% 50%)" />
        <StatCard label="Taxa de Conclusão" value={`${rate}%`} change={rate >= 70 ? "Ótimo!" : "Continue!"} color="hsl(330 100% 50%)" />
        <StatCard label="Categorias Ativas" value={String(customCats.length)} change="categorias criadas" color="hsl(22 100% 50%)" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonRadarChart
          title={weekTitle} subtitle={weekSub}
          onTitleChange={setWeekTitle} onSubtitleChange={setWeekSub}
          dataKey1="Esta Semana" dataKey2="Semana Passada"
          color1="hsl(330 100% 50%)" color2="hsl(186 100% 50%)"
          data={weeklyData}
        />
        <NeonRadarChart
          title={monthTitle} subtitle={monthSub}
          onTitleChange={setMonthTitle} onSubtitleChange={setMonthSub}
          dataKey1="Este Mês" dataKey2="Mês Passado"
          color1="hsl(110 100% 55%)" color2="hsl(22 100% 50%)"
          data={monthlyData}
        />
      </div>
    </div>
  );
}
