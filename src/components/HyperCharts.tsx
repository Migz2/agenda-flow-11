import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { useCompletedTasksHistory, useAllTasks, useCustomCategories } from "@/hooks/useTasks";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";
import { Input } from "@/components/ui/input";
import { Pencil, Flame, Clock, CheckCircle2, Target } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

function getWeekNumber(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
}

function buildDynamicRadarData(
  tasks: any[],
  customCats: { id: string; name: string; color: string }[],
  period: "week" | "month",
  selectedCatIds: Set<string>
) {
  const now = new Date();
  return customCats
    .filter(cat => selectedCatIds.has(cat.id))
    .map(cat => {
      let thisCount = 0, lastCount = 0;
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

function calculateStreak(completedTasks: any[]): number {
  if (completedTasks.length === 0) return 0;
  const dates = new Set(completedTasks.map(t => new Date(t.updated_at).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    if (dates.has(key)) streak++;
    else if (i > 0) break; // allow today to not have tasks yet
    else break;
  }
  return streak;
}

function calculateHoursStudied(completedTasks: any[]): number {
  return completedTasks.reduce((sum, t) => {
    const start = new Date(t.start_time).getTime();
    const end = new Date(t.end_time).getTime();
    return sum + (end - start) / 3600000;
  }, 0);
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
  const { theme } = useTheme();

  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";
  const tooltipBg = theme === "dark" ? "hsl(160 8% 10%)" : "hsl(35 25% 92%)";
  const tooltipBorder = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 78%)";

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }} className="bg-card neu-flat rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-1">
        {editingTitle ? (
          <Input value={title} onChange={e => onTitleChange(e.target.value)} onBlur={() => setEditingTitle(false)} autoFocus className="bg-secondary border-0 neu-pressed h-7 text-sm font-display font-semibold rounded-xl" />
        ) : (
          <h3 className="text-sm font-display font-semibold text-foreground cursor-pointer hover:text-primary transition-colors" onClick={() => setEditingTitle(true)}>
            {title} <Pencil className="w-3 h-3 inline ml-1 text-muted-foreground" />
          </h3>
        )}
      </div>
      {editingSub ? (
        <Input value={subtitle} onChange={e => onSubtitleChange(e.target.value)} onBlur={() => setEditingSub(false)} autoFocus className="bg-secondary border-0 neu-pressed h-6 text-xs mb-4 rounded-xl" />
      ) : (
        <p className="text-xs text-muted-foreground mb-4 cursor-pointer hover:text-foreground/60" onClick={() => setEditingSub(true)}>{subtitle}</p>
      )}

      {data.length === 0 ? (
        <div className="h-64 flex items-center justify-center"><p className="text-xs text-muted-foreground">Selecione categorias para ver os gráficos</p></div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke={gridColor} strokeDasharray="3 3" />
              <PolarAngleAxis dataKey="category" tick={{ fill: tickColor, fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, maxVal + 2]} tick={{ fill: tickColor, fontSize: 8 }} axisLine={false} />
              <Radar name={dataKey1} dataKey="thisWeek" stroke={color1} fill={color1} fillOpacity={0.15} strokeWidth={2} dot={false} />
              <Radar name={dataKey2} dataKey="lastWeek" stroke={color2} fill={color2} fillOpacity={0.1} strokeWidth={2} dot={false} />
              <Tooltip contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: "12px", fontSize: "12px" }} labelStyle={{ color: "inherit" }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1 }} /><span className="text-[10px] text-muted-foreground">{dataKey1}</span></div>
        <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2 }} /><span className="text-[10px] text-muted-foreground">{dataKey2}</span></div>
      </div>
    </motion.div>
  );
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

function CategoryFilter({ categories, selectedIds, onChange }: { categories: any[]; selectedIds: Set<string>; onChange: (ids: Set<string>) => void }) {
  const toggle = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange(next);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="neu-btn text-xs">
          Filtrar Categorias ({selectedIds.size}/{categories.length})
        </Button>
      </PopoverTrigger>
      <PopoverContent className="bg-popover border-border/30 w-56 p-3">
        <div className="flex flex-col gap-2">
          {categories.map(c => (
            <label key={c.id} className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={selectedIds.has(c.id)} onCheckedChange={() => toggle(c.id)} />
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-foreground truncate">{c.name}</span>
            </label>
          ))}
          {categories.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma categoria criada</p>}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function HyperCharts() {
  const completedTasks = useCompletedTasksHistory();
  const { tasks: allTasks } = useAllTasks();
  const { categories: customCats } = useCustomCategories();
  const { theme } = useTheme();

  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

  // Auto-select all categories when they load
  useMemo(() => {
    if (customCats.length > 0 && selectedCatIds.size === 0) {
      setSelectedCatIds(new Set(customCats.map(c => c.id)));
    }
  }, [customCats]);

  const [weekTitle, setWeekTitle] = useState("Produtividade Semanal");
  const [weekSub, setWeekSub] = useState("Tarefas concluídas por categoria esta semana");
  const [monthTitle, setMonthTitle] = useState("Tendência Mensal");
  const [monthSub, setMonthSub] = useState("Tarefas concluídas por categoria este mês");

  const weeklyData = useMemo(() => buildDynamicRadarData(completedTasks, customCats, "week", selectedCatIds), [completedTasks, customCats, selectedCatIds]);
  const monthlyData = useMemo(() => buildDynamicRadarData(completedTasks, customCats, "month", selectedCatIds), [completedTasks, customCats, selectedCatIds]);

  const totalCompleted = completedTasks.length;
  const totalPending = allTasks.filter(t => !t.completed).length;
  const rate = allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0;
  const hoursStudied = useMemo(() => calculateHoursStudied(completedTasks), [completedTasks]);
  const streak = useMemo(() => calculateStreak(completedTasks), [completedTasks]);

  const c1 = theme === "dark" ? "hsl(330 100% 50%)" : "hsl(168 55% 32%)";
  const c2 = theme === "dark" ? "hsl(186 100% 50%)" : "hsl(200 60% 45%)";
  const c3 = theme === "dark" ? "hsl(110 100% 55%)" : "hsl(140 50% 40%)";
  const c4 = theme === "dark" ? "hsl(22 100% 50%)" : "hsl(30 70% 50%)";

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Analytics</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Visão completa da sua produtividade</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Horas Estudadas" value={hoursStudied.toFixed(1) + "h"} subtitle="tempo total concluído" icon={Clock} glowClass="" />
        <MetricCard label="Blocos Concluídos" value={`${totalCompleted}/${totalCompleted + totalPending}`} subtitle={`${totalPending} pendentes`} icon={CheckCircle2} glowClass="" />
        <MetricCard label="Taxa de Conclusão" value={`${rate}%`} subtitle={rate >= 70 ? "Excelente!" : "Continue!"} icon={Target} glowClass="" />
        <MetricCard label="Streak" value={`${streak} dia${streak !== 1 ? "s" : ""}`} subtitle={streak >= 7 ? "🔥 Em chamas!" : "Mantenha o ritmo!"} icon={Flame} glowClass="" />
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <CategoryFilter categories={customCats} selectedIds={selectedCatIds} onChange={setSelectedCatIds} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonRadarChart title={weekTitle} subtitle={weekSub} onTitleChange={setWeekTitle} onSubtitleChange={setWeekSub} dataKey1="Esta Semana" dataKey2="Semana Passada" color1={c1} color2={c2} data={weeklyData} />
        <NeonRadarChart title={monthTitle} subtitle={monthSub} onTitleChange={setMonthTitle} onSubtitleChange={setMonthSub} dataKey1="Este Mês" dataKey2="Mês Passado" color1={c3} color2={c4} data={monthlyData} />
      </div>
    </div>
  );
}
