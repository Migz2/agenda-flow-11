import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Target, Plus, Trash2, ChevronDown, ChevronUp, TrendingUp, Radar as RadarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface Exam { id: string; name: string; exam_date: string; }
interface Content {
  id: string; exam_id: string; name: string;
  total_questions: number; correct: number; wrong: number; post_questions: number;
}

const db = supabase as any;

export function PerformancePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [exams, setExams] = useState<Exam[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [openExamId, setOpenExamId] = useState<string | null>(null);
  const [filterExamId, setFilterExamId] = useState<string>("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [newExamName, setNewExamName] = useState("");
  const [newExamDate, setNewExamDate] = useState("");
  const [draftContents, setDraftContents] = useState<{ name: string; total: number; correct: number }[]>([
    { name: "", total: 0, correct: 0 },
  ]);

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

  const resetModal = () => {
    setNewExamName(""); setNewExamDate("");
    setDraftContents([{ name: "", total: 0, correct: 0 }]);
  };

  const saveExam = async () => {
    if (!user || !newExamName.trim() || !newExamDate) {
      toast({ title: "Preencha o nome e a data da prova", variant: "destructive" });
      return;
    }
    const { data: exam, error } = await db.from("espcex_exams")
      .insert({ user_id: user.id, name: newExamName.trim(), exam_date: newExamDate })
      .select().single();
    if (error || !exam) {
      toast({ title: "Erro ao criar prova", description: error?.message, variant: "destructive" });
      return;
    }
    const validContents = draftContents.filter(c => c.name.trim());
    if (validContents.length > 0) {
      const rows = validContents.map(c => ({
        user_id: user.id,
        exam_id: exam.id,
        name: c.name.trim(),
        total_questions: c.total,
        correct: c.correct,
        wrong: Math.max(0, c.total - c.correct),
        post_questions: 0,
      }));
      const { error: cErr } = await db.from("espcex_contents").insert(rows);
      if (cErr) toast({ title: "Aviso", description: "Prova criada, mas falha ao inserir conteúdos.", variant: "destructive" });
    }
    toast({ title: "Prova registrada!", description: `${validContents.length} conteúdo(s) vinculado(s).` });
    setModalOpen(false);
    resetModal();
    fetchAll();
  };

  const removeExam = async (id: string) => {
    await db.from("espcex_exams").delete().eq("id", id);
    await db.from("espcex_contents").delete().eq("exam_id", id);
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

  // ---- Filter-aware data ----
  const filteredExams = useMemo(
    () => filterExamId === "all" ? exams : exams.filter(e => e.id === filterExamId),
    [exams, filterExamId]
  );
  const filteredContents = useMemo(
    () => filterExamId === "all" ? contents : contents.filter(c => c.exam_id === filterExamId),
    [contents, filterExamId]
  );

  // Evolution chart (line): only meaningful when "all" — one point per exam, average %
  const evolution = useMemo(() => {
    const examsAsc = [...filteredExams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    const contentNames = Array.from(new Set(filteredContents.map(c => c.name)));
    const data = examsAsc.map(ex => {
      const row: any = { name: ex.name };
      contentNames.forEach(n => {
        const c = filteredContents.find(cc => cc.exam_id === ex.id && cc.name === n);
        if (c && c.total_questions > 0) row[n] = Math.round((c.correct / c.total_questions) * 100);
      });
      return row;
    });
    return { data, contentNames };
  }, [filteredExams, filteredContents]);

  // Radar chart: % per content. If "all", average across exams; else exact %.
  const radarData = useMemo(() => {
    const byName = new Map<string, { total: number; correct: number }>();
    filteredContents.forEach(c => {
      const e = byName.get(c.name) ?? { total: 0, correct: 0 };
      e.total += c.total_questions; e.correct += c.correct;
      byName.set(c.name, e);
    });
    return Array.from(byName.entries()).map(([name, v]) => ({
      content: name,
      pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }));
  }, [filteredContents]);

  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";
  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const palette = ["hsl(330 100% 55%)", "hsl(186 100% 50%)", "hsl(50 100% 55%)", "hsl(140 80% 50%)", "hsl(280 90% 60%)", "hsl(20 100% 55%)"];
  const radarColor = theme === "dark" ? "hsl(186 100% 50%)" : "hsl(168 55% 32%)";

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto pt-24">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Análise</p>
          <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> Desempenho
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o desempenho em provas anteriores por conteúdo.</p>
        </div>
        <Button onClick={() => setModalOpen(true)} className="bg-primary text-primary-foreground neu-raised">
          <Plus className="w-4 h-4 mr-1" /> Registrar Prova
        </Button>
      </div>

      {/* Filter */}
      {exams.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Label className="text-xs text-muted-foreground">Filtrar gráficos:</Label>
          <Select value={filterExamId} onValueChange={setFilterExamId}>
            <SelectTrigger className="w-60 neu-pressed border-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Provas</SelectItem>
              {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Charts grid */}
      {(evolution.contentNames.length > 0 || radarData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card neu-flat rounded-2xl p-6">
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

          <div className="bg-card neu-flat rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <RadarIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-display font-semibold text-foreground">
                Radar de acertos por conteúdo {filterExamId === "all" ? "(média geral)" : ""}
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke={gridColor} />
                  <PolarAngleAxis dataKey="content" tick={{ fill: tickColor, fontSize: 10 }} />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: tickColor, fontSize: 9 }} />
                  <Radar name="Acertos %" dataKey="pct" stroke={radarColor} fill={radarColor} fillOpacity={0.35} />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
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

      {/* Modal: register exam + contents in batch */}
      <Dialog open={modalOpen} onOpenChange={(o) => { setModalOpen(o); if (!o) resetModal(); }}>
        <DialogContent className="max-w-2xl bg-card neu-flat">
          <DialogHeader>
            <DialogTitle>Registrar Prova</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
            <div>
              <Label className="text-xs text-muted-foreground">Nome da Prova</Label>
              <Input value={newExamName} onChange={e => setNewExamName(e.target.value)} placeholder="Ex: Simulado 03" className="neu-pressed border-0 mt-1" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Data</Label>
              <Input type="date" value={newExamDate} onChange={e => setNewExamDate(e.target.value)} className="neu-pressed border-0 mt-1" />
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdos</Label>
              <Button
                onClick={() => setDraftContents(prev => [...prev, { name: "", total: 0, correct: 0 }])}
                variant="outline" size="sm" className="neu-btn text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Conteúdo
              </Button>
            </div>
            <div className="flex flex-col gap-2 max-h-72 overflow-y-auto pr-1">
              {draftContents.map((c, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end bg-background neu-pressed rounded-xl p-3">
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Nome</Label>
                    <Input value={c.name} onChange={e => {
                      const v = e.target.value;
                      setDraftContents(prev => prev.map((x, i) => i === idx ? { ...x, name: v } : x));
                    }} placeholder="Ex: Matemática" className="bg-card neu-flat border-0 h-9 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
                    <Input type="number" min={0} value={c.total} onChange={e => {
                      const v = Math.max(0, parseInt(e.target.value || "0", 10));
                      setDraftContents(prev => prev.map((x, i) => i === idx ? { ...x, total: v } : x));
                    }} className="bg-card neu-flat border-0 h-9 text-sm mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase text-muted-foreground">Acertos</Label>
                    <Input type="number" min={0} value={c.correct} onChange={e => {
                      const v = Math.max(0, parseInt(e.target.value || "0", 10));
                      setDraftContents(prev => prev.map((x, i) => i === idx ? { ...x, correct: v } : x));
                    }} className="bg-card neu-flat border-0 h-9 text-sm mt-1" />
                  </div>
                  <button
                    onClick={() => setDraftContents(prev => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive p-2"
                    disabled={draftContents.length === 1}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="neu-btn" onClick={() => { setModalOpen(false); resetModal(); }}>Cancelar</Button>
            <Button onClick={saveExam} className="bg-primary text-primary-foreground neu-raised">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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