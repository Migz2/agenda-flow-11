import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Trash2, TrendingUp, Radar as RadarIcon, X, BookOpen,
  ChevronRight, ChevronDown, Pencil, History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNotebooks } from "@/hooks/useNotebooks";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";

interface Exam { id: string; name: string; exam_date: string; notes?: string | null; notebook_id?: string | null; }
interface Content {
  id: string; exam_id: string; name: string; parent_id?: string | null;
  total_questions: number; correct: number; wrong: number; post_questions: number;
}
interface QuizSession {
  id: string; created_at: string; notebook_id: string; exam_id: string | null;
  total_questions: number; correct: number; topic: string | null;
}

const db = supabase as any;

export function PerformancePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { notebooks } = useNotebooks();
  const [exams, setExams] = useState<Exam[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExamId, setFilterExamId] = useState<string>("all");
  const [drawerExamId, setDrawerExamId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

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

  const removeExam = async (id: string) => {
    await db.from("espcex_exams").delete().eq("id", id);
    await db.from("espcex_contents").delete().eq("exam_id", id);
    setDrawerExamId(null);
    fetchAll();
  };

  // ---- Filter-aware data ----
  const filteredExams = useMemo(
    () => filterExamId === "all" ? exams : exams.filter(e => e.id === filterExamId),
    [exams, filterExamId]
  );
  // Only top-level contents enter the radar/line chart; sub-contents enrich the drawer view
  const topContents = useMemo(() => contents.filter(c => !c.parent_id), [contents]);
  const filteredContents = useMemo(
    () => filterExamId === "all" ? topContents : topContents.filter(c => c.exam_id === filterExamId),
    [topContents, filterExamId]
  );

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

  const drawerExam = drawerExamId ? exams.find(e => e.id === drawerExamId) ?? null : null;

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
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground neu-raised">
          <Plus className="w-4 h-4 mr-1" /> Registrar Prova
        </Button>
      </div>

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
                Radar de acertos {filterExamId === "all" ? "(média geral)" : ""}
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

      {/* Exam list (no accordion — opens side drawer) */}
      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando...</p>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 neu-flat rounded-2xl">
          <p className="text-sm text-muted-foreground">Nenhuma prova registrada ainda.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {exams.map((exam) => {
            const rows = topContents.filter(c => c.exam_id === exam.id);
            const totalQ = rows.reduce((s, r) => s + (r.total_questions || 0), 0);
            const totalC = rows.reduce((s, r) => s + (r.correct || 0), 0);
            const pct = totalQ > 0 ? Math.round((totalC / totalQ) * 100) : 0;
            const nb = notebooks.find(n => n.id === exam.notebook_id);
            return (
              <motion.div key={exam.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className="bg-card neu-flat rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:scale-[1.005] transition-transform"
                onClick={() => setDrawerExamId(exam.id)}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display font-semibold text-foreground truncate">{exam.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-muted-foreground">{new Date(exam.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    {nb && (
                      <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                        <BookOpen className="w-3 h-3" /> {nb.title}
                      </span>
                    )}
                  </div>
                </div>
                <span className="px-3 py-1 rounded-xl neu-pressed text-xs font-medium text-primary">{pct}%</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            );
          })}
        </div>
      )}

      <ExamDrawer
        exam={drawerExam}
        contents={contents.filter(c => drawerExam && c.exam_id === drawerExam.id)}
        notebooks={notebooks}
        onClose={() => setDrawerExamId(null)}
        onEdit={(e) => { setEditing(e); setModalOpen(true); }}
        onDelete={removeExam}
        onChanged={fetchAll}
      />

      <ExamModal
        open={modalOpen}
        editing={editing}
        notebooks={notebooks}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        onSaved={() => { setModalOpen(false); setEditing(null); fetchAll(); }}
      />
    </div>
  );
}

/* =================== Exam Side Drawer =================== */
function ExamDrawer({
  exam, contents, notebooks, onClose, onEdit, onDelete, onChanged,
}: {
  exam: Exam | null;
  contents: Content[];
  notebooks: { id: string; title: string }[];
  onClose: () => void;
  onEdit: (e: Exam) => void;
  onDelete: (id: string) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!exam || !user) { setSessions([]); return; }
    (async () => {
      const { data } = await db.from("quiz_sessions")
        .select("*").eq("exam_id", exam.id).order("created_at", { ascending: false });
      setSessions(data ?? []);
    })();
  }, [exam?.id, user]);

  const updateContent = async (id: string, patch: Partial<Content>) => {
    await db.from("espcex_contents").update(patch).eq("id", id);
    onChanged();
  };

  const addContent = async (parentId: string | null) => {
    if (!user || !exam) return;
    await db.from("espcex_contents").insert({
      user_id: user.id, exam_id: exam.id, parent_id: parentId,
      name: parentId ? "Novo subconteúdo" : "Novo conteúdo",
      total_questions: 0, correct: 0, wrong: 0, post_questions: 0,
    });
    onChanged();
  };

  const removeContent = async (id: string) => {
    await db.from("espcex_contents").delete().eq("id", id);
    onChanged();
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const topContents = contents.filter(c => !c.parent_id);
  const nb = exam && notebooks.find(n => n.id === exam.notebook_id);

  return (
    <AnimatePresence>
      {exam && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-background/40 backdrop-blur-sm" />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-[70] w-full max-w-xl bg-card border-l border-border/30 shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-border/20 flex items-start justify-between gap-3 shrink-0">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Prova</p>
                <h3 className="text-lg font-display font-bold text-foreground truncate">{exam.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{new Date(exam.exam_date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                {nb && (
                  <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-primary">
                    <BookOpen className="w-3 h-3" /> Vinculada a: {nb.title}
                  </span>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-xl neu-btn text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">
              {exam.notes && (
                <section>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Observações</p>
                  <div className="bg-background neu-pressed rounded-xl p-4 text-sm text-foreground whitespace-pre-wrap">{exam.notes}</div>
                </section>
              )}

              <section>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Conteúdos</p>
                  <Button size="sm" variant="outline" className="neu-btn text-xs h-7" onClick={() => addContent(null)}>
                    <Plus className="w-3 h-3 mr-1" /> Conteúdo
                  </Button>
                </div>
                <div className="flex flex-col gap-2">
                  {topContents.length === 0 && (
                    <p className="text-xs text-muted-foreground">Sem conteúdos.</p>
                  )}
                  {topContents.map(c => {
                    const subs = contents.filter(s => s.parent_id === c.id);
                    const pct = c.total_questions > 0 ? Math.round((c.correct / c.total_questions) * 100) : 0;
                    const isOpen = expanded.has(c.id);
                    return (
                      <div key={c.id} className="bg-background neu-pressed rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <button onClick={() => toggle(c.id)} className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <Input value={c.name} onChange={e => updateContent(c.id, { name: e.target.value })}
                            className="bg-card neu-flat border-0 h-8 text-xs font-medium flex-1" />
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">{pct}%</span>
                          <button onClick={() => removeContent(c.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <Num label="Total" v={c.total_questions} on={(v) => updateContent(c.id, { total_questions: v })} />
                          <Num label="Acertos" v={c.correct} on={(v) => updateContent(c.id, { correct: v })} />
                          <Num label="Erros" v={c.wrong} on={(v) => updateContent(c.id, { wrong: v })} />
                          <Num label="Pós" v={c.post_questions} on={(v) => updateContent(c.id, { post_questions: v })} />
                        </div>

                        {isOpen && (
                          <div className="mt-3 pl-4 border-l border-border/30 flex flex-col gap-2">
                            {subs.map(s => {
                              const sp = s.total_questions > 0 ? Math.round((s.correct / s.total_questions) * 100) : 0;
                              return (
                                <div key={s.id} className="bg-card neu-flat rounded-lg p-2">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <Input value={s.name} onChange={e => updateContent(s.id, { name: e.target.value })}
                                      className="bg-background neu-pressed border-0 h-7 text-[11px] flex-1" />
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">{sp}%</span>
                                    <button onClick={() => removeContent(s.id)} className="text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <Num label="Total" v={s.total_questions} on={(v) => updateContent(s.id, { total_questions: v })} />
                                    <Num label="Acertos" v={s.correct} on={(v) => updateContent(s.id, { correct: v })} />
                                    <Num label="Erros" v={s.wrong} on={(v) => updateContent(s.id, { wrong: v })} />
                                  </div>
                                </div>
                              );
                            })}
                            <Button size="sm" variant="ghost" className="text-[11px] h-7 self-start" onClick={() => addContent(c.id)}>
                              <Plus className="w-3 h-3 mr-1" /> Subconteúdo
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>

              {sessions.length > 0 && (
                <section>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <History className="w-3 h-3" /> Quizzes IA vinculados
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {sessions.map(s => (
                      <div key={s.id} className="bg-background neu-pressed rounded-lg p-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{new Date(s.created_at).toLocaleString("pt-BR")}</span>
                        <span className="font-medium text-primary">{s.correct}/{s.total_questions}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>

            <div className="p-4 border-t border-border/20 flex gap-2 shrink-0">
              <Button variant="outline" className="flex-1 neu-btn" onClick={() => exam && onEdit(exam)}>
                <Pencil className="w-4 h-4 mr-1.5" /> Editar
              </Button>
              <Button variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => exam && onDelete(exam.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* =================== Create / Edit Modal =================== */
function ExamModal({
  open, editing, notebooks, onClose, onSaved,
}: {
  open: boolean;
  editing: Exam | null;
  notebooks: { id: string; title: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [notebookId, setNotebookId] = useState<string>("none");
  const [draftContents, setDraftContents] = useState<{ name: string; total: number; correct: number }[]>([
    { name: "", total: 0, correct: 0 },
  ]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDate(editing?.exam_date ?? "");
      setNotes(editing?.notes ?? "");
      setNotebookId(editing?.notebook_id ?? "none");
      setDraftContents(editing ? [] : [{ name: "", total: 0, correct: 0 }]);
    }
  }, [open, editing]);

  const save = async () => {
    if (!user || !name.trim() || !date) {
      toast({ title: "Preencha o nome e a data da prova", variant: "destructive" });
      return;
    }
    const payload: any = {
      name: name.trim(), exam_date: date, notes: notes || null,
      notebook_id: notebookId === "none" ? null : notebookId,
    };

    if (editing) {
      const { error } = await db.from("espcex_exams").update(payload).eq("id", editing.id);
      if (error) { toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" }); return; }
      toast({ title: "Prova atualizada!" });
    } else {
      const { data: exam, error } = await db.from("espcex_exams")
        .insert({ ...payload, user_id: user.id }).select().single();
      if (error || !exam) { toast({ title: "Erro ao criar prova", description: error?.message, variant: "destructive" }); return; }
      const valid = draftContents.filter(c => c.name.trim());
      if (valid.length > 0) {
        await db.from("espcex_contents").insert(valid.map(c => ({
          user_id: user.id, exam_id: exam.id, name: c.name.trim(),
          total_questions: c.total, correct: c.correct,
          wrong: Math.max(0, c.total - c.correct), post_questions: 0,
        })));
      }
      toast({ title: "Prova registrada!" });
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-card neu-flat max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar Prova" : "Registrar Prova"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Nome da Prova</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Simulado 03" className="neu-pressed border-0 mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Data</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="neu-pressed border-0 mt-1" />
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Notebook vinculado (AI Hub)</Label>
          <Select value={notebookId} onValueChange={setNotebookId}>
            <SelectTrigger className="neu-pressed border-0 mt-1"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem vínculo</SelectItem>
              {notebooks.map(n => <SelectItem key={n.id} value={n.id}>{n.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="mt-3">
          <Label className="text-xs text-muted-foreground">Observações</Label>
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anote pontos de atenção, sentimentos, dúvidas..."
            className="neu-pressed border-0 mt-1 min-h-[100px]" />
        </div>

        {!editing && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdos iniciais</Label>
              <Button onClick={() => setDraftContents(prev => [...prev, { name: "", total: 0, correct: 0 }])}
                variant="outline" size="sm" className="neu-btn text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
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
                  <button onClick={() => setDraftContents(prev => prev.filter((_, i) => i !== idx))}
                    className="text-muted-foreground hover:text-destructive p-2"
                    disabled={draftContents.length === 1}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" className="neu-btn" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} className="bg-primary text-primary-foreground neu-raised">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Num({ label, v, on }: { label: string; v: number; on: (v: number) => void }) {
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input type="number" min={0} value={v}
        onChange={e => on(Math.max(0, parseInt(e.target.value || "0", 10)))}
        className="bg-card neu-flat border-0 h-8 text-xs mt-0.5" />
    </div>
  );
}