import { motion } from "framer-motion";
import { categories, sampleTasks, CategoryId } from "@/lib/taskData";
import { useMemo } from "react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip
} from "recharts";

// Generate mock weekly data for categories
function generateWeeklyData() {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
  const catIds = Object.keys(categories) as CategoryId[];
  
  return days.map(day => {
    const entry: Record<string, any> = { day };
    catIds.forEach(cat => {
      entry[cat] = Math.floor(Math.random() * 5) + 1;
    });
    return entry;
  });
}

function generateRadarData() {
  const catIds = Object.keys(categories) as CategoryId[];
  return catIds.map(id => {
    const cat = categories[id];
    const completedCount = sampleTasks.filter(t => t.category === id && t.completed).length;
    const totalCount = sampleTasks.filter(t => t.category === id).length;
    return {
      category: cat.label,
      thisWeek: Math.floor(Math.random() * 40) + 10,
      lastWeek: Math.floor(Math.random() * 40) + 10,
      hsl: cat.hsl,
    };
  });
}

function NeonRadarChart({ title, dataKey1, dataKey2, color1, color2 }: {
  title: string;
  dataKey1: string;
  dataKey2: string;
  color1: string;
  color2: string;
}) {
  const data = useMemo(generateRadarData, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-card rounded-2xl p-5 border border-border/30"
    >
      <h3 className="text-sm font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4">Frequência semanal por categoria</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid stroke="hsl(0 0% 20%)" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="category"
              tick={{ fill: "hsl(0 0% 50%)", fontSize: 10, fontFamily: "Inter" }}
            />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 50]}
              tick={{ fill: "hsl(0 0% 30%)", fontSize: 8 }}
              axisLine={false}
            />
            <Radar
              name={dataKey1}
              dataKey="thisWeek"
              stroke={color1}
              fill={color1}
              fillOpacity={0.15}
              strokeWidth={2}
              dot={false}
            />
            <Radar
              name={dataKey2}
              dataKey="lastWeek"
              stroke={color2}
              fill={color2}
              fillOpacity={0.1}
              strokeWidth={2}
              dot={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(0 0% 8%)",
                border: "1px solid hsl(0 0% 20%)",
                borderRadius: "8px",
                fontSize: "12px",
                fontFamily: "Inter",
              }}
              labelStyle={{ color: "hsl(0 0% 90%)" }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color1 }} />
          <span className="text-[10px] text-muted-foreground">Esta semana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color2 }} />
          <span className="text-[10px] text-muted-foreground">Semana passada</span>
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ label, value, change, color }: { label: string; value: string; change: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl p-5 border border-border/30"
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-display font-bold text-foreground mt-1">{value}</p>
      <p className="text-xs mt-1" style={{ color }}>{change}</p>
    </motion.div>
  );
}

export function HyperCharts() {
  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Analytics</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1">
          Hyper Charts
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Visualização da sua produtividade</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Tarefas Completas" value="24" change="↑ 12% vs semana passada" color="hsl(110 100% 55%)" />
        <StatCard label="Horas Produtivas" value="38.5h" change="↑ 8.3% vs semana passada" color="hsl(186 100% 50%)" />
        <StatCard label="Streak Atual" value="7 dias" change="Melhor sequência!" color="hsl(330 100% 50%)" />
        <StatCard label="Taxa de Conclusão" value="87%" change="↑ 5% vs média" color="hsl(22 100% 50%)" />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NeonRadarChart
          title="Produtividade Geral"
          dataKey1="Esta Semana"
          dataKey2="Semana Passada"
          color1="hsl(330 100% 50%)"
          color2="hsl(186 100% 50%)"
        />
        <NeonRadarChart
          title="Equilíbrio de Vida"
          dataKey1="Esta Semana"
          dataKey2="Semana Passada"
          color1="hsl(110 100% 55%)"
          color2="hsl(22 100% 50%)"
        />
        <NeonRadarChart
          title="Tendência Mensal"
          dataKey1="Este Mês"
          dataKey2="Mês Passado"
          color1="hsl(280 100% 60%)"
          color2="hsl(50 100% 55%)"
        />
        <NeonRadarChart
          title="Benchmark Pessoal"
          dataKey1="Atual"
          dataKey2="Meta"
          color1="hsl(186 100% 50%)"
          color2="hsl(330 100% 50%)"
        />
      </div>
    </div>
  );
}
