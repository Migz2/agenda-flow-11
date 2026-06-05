import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

interface Exam {
  id: string;
  name: string;
  exam_date: string;
}
interface Content {
  id: string;
  exam_id: string;
  name: string;
  total_questions: number;
  correct: number;
  wrong: number;
  post_questions: number;
}

const db = supabase as any;

export function EsPCExPerformance() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [exams, setExams] = useState<Exam[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [openExamId, setOpenExamId] = useState<string | null>(null);

  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");

  const fetchAll = async () => {
    if (!user) return;
    setLoading(true);
    const { data: e } = await db.from("espcex_exams").select("*").eq("user_id", user.id).order("exam_date", { ascending: false });
    const { data: c } = await db.from("espcex_contents").select("*").eq("user_id", user.id);
    setExams(e ?? []);
    setContents(c ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const addExam = async () => {
    if (!user || !newExamName.trim() || !newExamDate) return;
    const { error } = await db.from("espcex_exams").insert({
      user_id: user.id,
      name: newExamName.trim(),
      exam_date: newExamDate,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewExamName(""); setNewExamDate("");
    toast({ title: "Prova registrada!" });
    fetchAll();
  };

  const removeExam = async (id: string) => {
    await db.from("espcex_exams").delete().eq("id", id);
    fetchAll();
  };

  const addContent = async (examId: string) => {
    if (!user) return;
    const { error } = await db.from("espcex_contents").insert({
      user_id: user.id, exam_id: examId, name: "Novo conteúdo",
      total_questions: 0, correct: 0, wrong: 0, post_questions: 0,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    fetchAll();
  };

  const updateContent = async (id: string, patch: Partial<Content>) => {
    setContents(prev => prev.map(c => c.id === id ? { ...c, ...patch } as Content : c));
    await db.from("espcex_contents").update(patch).eq("id", id);
  };

  const removeContent = async (id: string) => {
    await db.from("espcex_contents").delete().eq("id", id);
    setContents(prev => prev.filter(c => c.id !== id));
  };

  // Build evolution chart: line per content name across exams (ordered by date asc)
  const evolution = useMemo(() => {
    const examsAsc = [...exams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    const contentNames = Array.from(new Set(contents.map(c => c.name)));
    const data = examsAsc.map(ex => {
      const row: any = { name: ex.name };
      contentNames.forEach(n => {
        const c = contents.find(cc => cc.exam_id === ex.id && cc.name === n);
        if (c && c.total_questions > 0) {
          row[n] = Math.round((c.correct / c.total_questions) * 100);
        }
      });
      return row;
    });
    return { data, contentNames };
  }, [exams, contents]);

  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";
  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const palette = ["hsl(330 100% 55%)", "hsl(186 100% 50%)", "hsl(50 100% 55%)", "hsl(140 80% 50%)", "hsl(280 90% 60%)", "hsl(20 100% 55%)"];

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto pt-24">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Performance</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
          <Target className="w-8 h-8 text-primary" /> EsPCEx
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Acompanhe o desempenho em provas anteriores por conteúdo.</p>
      </div>

      {/* New exam form */}
      <div className="bg-card neu-flat rounded-2xl p-6 mb-8">
        <h3 className="text-sm font-display font-semibold text-foreground mb-4">Registrar nova prova</h3>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_auto] gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome</Label>
            <Input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="Ex: Simulado 03" className="neu-pressed border-0 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="neu-pressed border-0 mt-1" />
          </div>
          <Button onClick={addExam} className="self-end bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Evolution chart */}
      {evolution.contentNames.length > 0 && (
        <div className="bg-card neu-flat rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-display font-semibold text-foreground">Evolução de acertos por conteúdo (%)</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolution.data}>
                <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {evolution.contentNames.map((n, i) => (
                  <Line key={n} type="monotone" dataKey={n} stroke={palette[i % palette.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Exams list */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 neu-flat rounded-2xl">
          <p className="text-sm text-muted-foreground">Nenhuma prova registrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {exams.map((exam) => {
            const rows = contents.filter(c => c.exam_id === exam.id);
            const totalQ = rows.reduce((s, r) => s + (r.total_questions || 0), 0);
            const totalC = rows.reduce((s, r) => s + (r.correct || 0), 0);
            const overallPct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
            const isOpen = openExamId === exam.id;
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-card neu-flat rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <button onClick={() => setOpenExamId(isOpen ? null : exam.id)} className="flex items-center gap-3 flex-1 text-left">
                    {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    <div className="flex-1">
                      <p className="text-sm font-display font-semibold text-foreground">{exam.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(exam.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="px-3 py-1 rounded-xl neu-pressed text-xs font-medium text-primary">{overallPct}%</span>
                  </button>
                  <button onClick={() => removeExam(exam.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {isOpen && (
                  <div className="mt-4 flex flex-col gap-3">
                    {rows.map((c) => {
                      const pct = c.total_questions > 0 ? Math.round((c.correct / c.total_questions) * 100) : 0;
                      return (
                        <div key={c.id} className="bg-background neu-pressed rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <Input value={c.name} onChange={e => updateContent(c.id, { name: e.target.value })} className="bg-card neu-flat border-0 h-9 text-sm font-medium flex-1" />
                            <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-semibold">{pct}%</span>
                            <button onClick={() => removeContent(c.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <NumField label="Total" value={c.total_questions} onChange={v => updateContent(c.id, { total_questions: v })} />
                            <NumField label="Acertos" value={c.correct} onChange={v => updateContent(c.id, { correct: v })} />
                            <NumField label="Erros" value={c.wrong} onChange={v => updateContent(c.id, { wrong: v })} />
                            <NumField label="Pós-prova" value={c.post_questions} onChange={v => updateContent(c.id, { post_questions: v })} />
                          </div>
                        </div>
                      );
                    })}
                    <Button onClick={() => addContent(exam.id)} variant="outline" className="neu-btn text-xs self-start">
                      <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar conteúdo
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={e => onChange(Math.max(0, parseInt(e.target.value || "0", 10)))}
        className="bg-card neu-flat border-0 h-9 text-sm mt-1"
      />
    </div>
  );
}