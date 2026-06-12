import { useEffect, useMemo, useState, useRef, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Target, Plus, Trash2, TrendingUp, Radar as RadarIcon, X, BookOpen,
  ChevronRight, ChevronDown, Pencil, History, Layers,
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
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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

/* ====== Effective metrics: if content has subs, totals = sum of subs ====== */
function effective(c: Content, children: Content[]) {
  if (children.length === 0) {
    return {
      total: c.total_questions, correct: c.correct, wrong: c.wrong, post: c.post_questions,
      hasSubs: false,
    };
  }
  const total = children.reduce((s, x) => s + (x.total_questions || 0), 0);
  const correct = children.reduce((s, x) => s + (x.correct || 0), 0);
  const wrong = children.reduce((s, x) => s + (x.wrong || 0), 0);
  const post = children.reduce((s, x) => s + (x.post_questions || 0), 0);
  return { total, correct, wrong, post, hasSubs: true };
}

/* ====== Focus-safe inputs (local state, push on blur) ====== */
const DebouncedText = memo(function DebouncedText({
  value, onCommit, className, disabled,
}: { value: string; onCommit: (v: string) => void; className?: string; disabled?: boolean }) {
  const [local, setLocal] = useState(value);
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(value); }, [value]);
  return (
    <Input
      value={local}
      disabled={disabled}
      onFocus={() => { focused.current = true; }}
      onChange={e => setLocal(e.target.value)}
      onBlur={() => { focused.current = false; if (local !== value) onCommit(local); }}
      className={className}
    />
  );
});

const DebouncedNum = memo(function DebouncedNum({
  label, value, onCommit, disabled,
}: { label: string; value: number; onCommit: (v: number) => void; disabled?: boolean }) {
  const [local, setLocal] = useState(String(value));
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setLocal(String(value)); }, [value]);
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number" min={0}
        value={local}
        disabled={disabled}
        onFocus={() => { focused.current = true; }}
        onChange={e => setLocal(e.target.value)}
        onBlur={() => {
          focused.current = false;
          const v = Math.max(0, parseInt(local || "0", 10));
          if (v !== value) onCommit(v);
        }}
        className={`bg-card neu-flat border-0 h-8 text-xs mt-0.5 ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      />
    </div>
  );
});

/* ============================================================ */
export function PerformancePage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { notebooks } = useNotebooks();
  const [exams, setExams] = useState<Exam[]>([]);
  const [contents, setContents] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterExamId, setFilterExamId] = useState<string>("all");
  const [filterContentName, setFilterContentName] = useState<string>("all");
  const [drawerExamId, setDrawerExamId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exam | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchAll = async () => {
    if (!user) return;
    const { data: e } = await db.from("espcex_exams").select("*").eq("user_id", user.id).order("exam_date", { ascending: false });
    const { data: c } = await db.from("espcex_contents").select("*").eq("user_id", user.id);
    setExams(e ?? []);
    setContents(c ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [user]);

  const removeExam = async (id: string) => {
    setDrawerExamId(null);
    await db.from("espcex_exams").delete().eq("id", id);
    await db.from("espcex_contents").delete().eq("exam_id", id);
    fetchAll();
  };

  const topContents = useMemo(() => contents.filter(c => !c.parent_id), [contents]);
  const filteredExams = useMemo(
    () => filterExamId === "all" ? exams : exams.filter(e => e.id === filterExamId),
    [exams, filterExamId]
  );
  const filteredTopContents = useMemo(
    () => filterExamId === "all" ? topContents : topContents.filter(c => c.exam_id === filterExamId),
    [topContents, filterExamId]
  );

  // Effective (sum-of-subs aware) value per top content
  const effContents = useMemo(() => filteredTopContents.map(c => ({
    ...c, _eff: effective(c, contents.filter(s => s.parent_id === c.id)),
  })), [filteredTopContents, contents]);

  // ====== Drill-in: if a content name is selected, switch charts to its sub-contents ======
  const drillSubs = useMemo(() => {
    if (filterContentName === "all") return null;
    const parents = filteredTopContents.filter(c => c.name === filterContentName);
    const subs = contents.filter(s => s.parent_id && parents.some(p => p.id === s.parent_id));
    return subs;
  }, [filterContentName, filteredTopContents, contents]);

  const evolution = useMemo(() => {
    const examsAsc = [...filteredExams].sort((a, b) => a.exam_date.localeCompare(b.exam_date));
    if (drillSubs) {
      const subNames = Array.from(new Set(drillSubs.map(s => s.name)));
      const data = examsAsc.map(ex => {
        const row: any = { name: ex.name };
        subNames.forEach(n => {
          const subsOnExam = drillSubs.filter(s => s.name === n && s.exam_id === ex.id);
          const t = subsOnExam.reduce((a, b) => a + b.total_questions, 0);
          const c = subsOnExam.reduce((a, b) => a + b.correct, 0);
          if (t > 0) row[n] = Math.round((c / t) * 100);
        });
        return row;
      });
      return { data, contentNames: subNames };
    }
    const contentNames = Array.from(new Set(effContents.map(c => c.name)));
    const data = examsAsc.map(ex => {
      const row: any = { name: ex.name };
      contentNames.forEach(n => {
        const c = effContents.find(cc => cc.exam_id === ex.id && cc.name === n);
        if (c && c._eff.total > 0) row[n] = Math.round((c._eff.correct / c._eff.total) * 100);
      });
      return row;
    });
    return { data, contentNames };
  }, [filteredExams, effContents, drillSubs]);

  const radarData = useMemo(() => {
    const byName = new Map<string, { total: number; correct: number }>();
    if (drillSubs) {
      drillSubs.forEach(s => {
        const e = byName.get(s.name) ?? { total: 0, correct: 0 };
        e.total += s.total_questions; e.correct += s.correct;
        byName.set(s.name, e);
      });
    } else {
      effContents.forEach(c => {
        const e = byName.get(c.name) ?? { total: 0, correct: 0 };
        e.total += c._eff.total; e.correct += c._eff.correct;
        byName.set(c.name, e);
      });
    }
    return Array.from(byName.entries()).map(([name, v]) => ({
      content: name, pct: v.total > 0 ? Math.round((v.correct / v.total) * 100) : 0,
    }));
  }, [effContents, drillSubs]);

  // List of unique top content names for the drill-in filter
  const contentNameOptions = useMemo(() => {
    return Array.from(new Set(filteredTopContents.map(c => c.name)));
  }, [filteredTopContents]);

  const tickColor = theme === "dark" ? "hsl(0 0% 50%)" : "hsl(210 10% 50%)";
  const gridColor = theme === "dark" ? "hsl(160 6% 20%)" : "hsl(35 15% 75%)";
  const palette = ["hsl(330 100% 55%)", "hsl(186 100% 50%)", "hsl(50 100% 55%)", "hsl(140 80% 50%)", "hsl(280 90% 60%)", "hsl(20 100% 55%)"];
  const radarColor = theme === "dark" ? "hsl(186 100% 50%)" : "hsl(168 55% 32%)";

  const drawerExam = drawerExamId ? exams.find(e => e.id === drawerExamId) ?? null : null;

  const handleEditFromDrawer = (e: Exam) => {
    // FIX: close drawer FIRST, then open modal on next tick to avoid stacked backdrops/blur
    setDrawerExamId(null);
    setTimeout(() => {
      setEditing(e);
      setModalOpen(true);
    }, 220);
  };

  return (
    <div className="flex-1 p-6 lg:p-12 overflow-y-auto pt-24">
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Análise</p>
          <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
            <Target className="w-8 h-8 text-primary" /> Desempenho
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o desempenho em provas anteriores por conteúdo e subconteúdo.</p>
        </div>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-primary text-primary-foreground neu-raised">
          <Plus className="w-4 h-4 mr-1" /> Registrar Prova
        </Button>
      </div>

      {exams.length > 0 && (
        <div className="mb-6 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Prova:</Label>
            <Select value={filterExamId} onValueChange={(v) => { setFilterExamId(v); setFilterContentName("all"); }}>
              <SelectTrigger className="w-56 neu-pressed border-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Provas</SelectItem>
                {exams.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {contentNameOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Conteúdo:</Label>
              <Select value={filterContentName} onValueChange={setFilterContentName}>
                <SelectTrigger className="w-56 neu-pressed border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos (visão macro)</SelectItem>
                  {contentNameOptions.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {(evolution.contentNames.length > 0 || radarData.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-card neu-flat rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-display font-semibold text-foreground">
                {drillSubs ? `Evolução — subconteúdos de ${filterContentName} (%)` : "Evolução de acertos por conteúdo (%)"}
              </h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {drillSubs ? (
                  <BarChart data={radarData.map(d => ({ name: d.content, pct: d.pct }))}>
                    <CartesianGrid stroke={gridColor} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: tickColor, fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="pct" name="Acertos %" fill={palette[0]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                ) : (
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
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card neu-flat rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-1">
              <RadarIcon className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-display font-semibold text-foreground">
                {drillSubs ? `Radar — subconteúdos de ${filterContentName}` : `Radar de acertos ${filterExamId === "all" ? "(média geral)" : ""}`}
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
            let totalQ = 0, totalC = 0;
            rows.forEach(r => {
              const eff = effective(r, contents.filter(s => s.parent_id === r.id));
              totalQ += eff.total; totalC += eff.correct;
            });
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
        allContents={contents}
        notebooks={notebooks}
        onClose={() => setDrawerExamId(null)}
        onEdit={handleEditFromDrawer}
        onDelete={removeExam}
        onContentsChanged={(updater) => setContents(prev => updater(prev))}
        refetch={fetchAll}
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
  exam, allContents, notebooks, onClose, onEdit, onDelete, onContentsChanged, refetch,
}: {
  exam: Exam | null;
  allContents: Content[];
  notebooks: { id: string; title: string }[];
  onClose: () => void;
  onEdit: (e: Exam) => void;
  onDelete: (id: string) => void;
  onContentsChanged: (updater: (prev: Content[]) => Content[]) => void;
  refetch: () => void;
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

  const examContents = useMemo(
    () => exam ? allContents.filter(c => c.exam_id === exam.id) : [],
    [exam, allContents]
  );

  // Optimistic helpers
  const optUpdate = (id: string, patch: Partial<Content>) => {
    onContentsChanged(prev => prev.map(c => c.id === id ? { ...c, ...patch } as Content : c));
    db.from("espcex_contents").update(patch).eq("id", id).then(({ error }: any) => {
      if (error) { toast({ title: "Erro ao salvar", variant: "destructive" }); refetch(); }
    });
  };

  const addContent = async (parentId: string | null) => {
    if (!user || !exam) return;
    const { data } = await db.from("espcex_contents").insert({
      user_id: user.id, exam_id: exam.id, parent_id: parentId,
      name: parentId ? "Novo subconteúdo" : "Novo conteúdo",
      total_questions: 0, correct: 0, wrong: 0, post_questions: 0,
    }).select().single();
    if (data) {
      onContentsChanged(prev => [...prev, data as Content]);
      if (parentId) setExpanded(prev => { const n = new Set(prev); n.add(parentId); return n; });
    }
  };

  const removeContent = async (id: string) => {
    onContentsChanged(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    await db.from("espcex_contents").delete().eq("id", id);
  };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const topContents = examContents.filter(c => !c.parent_id);
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
                    const subs = examContents.filter(s => s.parent_id === c.id);
                    const eff = effective(c, subs);
                    const pct = eff.total > 0 ? Math.round((eff.correct / eff.total) * 100) : 0;
                    const isOpen = expanded.has(c.id);
                    return (
                      <div key={c.id} className="bg-background neu-pressed rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <button onClick={() => toggle(c.id)} className="text-muted-foreground">
                            {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </button>
                          <DebouncedText
                            value={c.name}
                            onCommit={(v) => optUpdate(c.id, { name: v })}
                            className="bg-card neu-flat border-0 h-8 text-xs font-medium flex-1"
                          />
                          <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-semibold">{pct}%</span>
                          <button onClick={() => removeContent(c.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {eff.hasSubs ? (
                          <div className="grid grid-cols-4 gap-2">
                            <ReadOnlyNum label="Total" v={eff.total} />
                            <ReadOnlyNum label="Acertos" v={eff.correct} />
                            <ReadOnlyNum label="Erros" v={eff.wrong} />
                            <ReadOnlyNum label="Pós" v={eff.post} />
                          </div>
                        ) : (
                          <div className="grid grid-cols-4 gap-2">
                            <DebouncedNum label="Total" value={c.total_questions} onCommit={(v) => optUpdate(c.id, { total_questions: v })} />
                            <DebouncedNum label="Acertos" value={c.correct} onCommit={(v) => optUpdate(c.id, { correct: v })} />
                            <DebouncedNum label="Erros" value={c.wrong} onCommit={(v) => optUpdate(c.id, { wrong: v })} />
                            <DebouncedNum label="Pós" value={c.post_questions} onCommit={(v) => optUpdate(c.id, { post_questions: v })} />
                          </div>
                        )}
                        {eff.hasSubs && (
                          <p className="text-[10px] text-muted-foreground mt-1.5">⚙ Valores calculados a partir dos subconteúdos.</p>
                        )}

                        {isOpen && (
                          <div className="mt-3 pl-4 border-l border-border/30 flex flex-col gap-2">
                            {subs.map(s => {
                              const sp = s.total_questions > 0 ? Math.round((s.correct / s.total_questions) * 100) : 0;
                              return (
                                <div key={s.id} className="bg-card neu-flat rounded-lg p-2">
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <DebouncedText
                                      value={s.name}
                                      onCommit={(v) => optUpdate(s.id, { name: v })}
                                      className="bg-background neu-pressed border-0 h-7 text-[11px] flex-1"
                                    />
                                    <span className="px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold">{sp}%</span>
                                    <button onClick={() => removeContent(s.id)} className="text-muted-foreground hover:text-destructive">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-1.5">
                                    <DebouncedNum label="Total" value={s.total_questions} onCommit={(v) => optUpdate(s.id, { total_questions: v })} />
                                    <DebouncedNum label="Acertos" value={s.correct} onCommit={(v) => optUpdate(s.id, { correct: v })} />
                                    <DebouncedNum label="Erros" value={s.wrong} onCommit={(v) => optUpdate(s.id, { wrong: v })} />
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

function ReadOnlyNum({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <Label className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <div className="bg-card/60 rounded-md h-8 text-xs mt-0.5 px-2 flex items-center text-foreground/80 border border-border/20">
        {v}
      </div>
    </div>
  );
}

/* =================== Create / Edit Modal (nested draft) =================== */
interface DraftSub { name: string; total: number; correct: number; }
interface DraftContent { name: string; total: number; correct: number; subs: DraftSub[]; }

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
  const [drafts, setDrafts] = useState<DraftContent[]>([{ name: "", total: 0, correct: 0, subs: [] }]);

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setDate(editing?.exam_date ?? "");
      setNotes(editing?.notes ?? "");
      setNotebookId(editing?.notebook_id ?? "none");
      setDrafts(editing ? [] : [{ name: "", total: 0, correct: 0, subs: [] }]);
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
      // Insert parents, then subs
      for (const d of drafts.filter(d => d.name.trim())) {
        const totalForParent = d.subs.length > 0 ? d.subs.reduce((s, x) => s + x.total, 0) : d.total;
        const correctForParent = d.subs.length > 0 ? d.subs.reduce((s, x) => s + x.correct, 0) : d.correct;
        const { data: parent } = await db.from("espcex_contents").insert({
          user_id: user.id, exam_id: exam.id, name: d.name.trim(),
          total_questions: totalForParent, correct: correctForParent,
          wrong: Math.max(0, totalForParent - correctForParent), post_questions: 0,
        }).select().single();
        if (parent && d.subs.length > 0) {
          await db.from("espcex_contents").insert(d.subs.filter(s => s.name.trim()).map(s => ({
            user_id: user.id, exam_id: exam.id, parent_id: parent.id, name: s.name.trim(),
            total_questions: s.total, correct: s.correct,
            wrong: Math.max(0, s.total - s.correct), post_questions: 0,
          })));
        }
      }
      toast({ title: "Prova registrada!" });
    }
    onSaved();
  };

  const setDraft = (idx: number, patch: Partial<DraftContent>) =>
    setDrafts(prev => prev.map((d, i) => i === idx ? { ...d, ...patch } : d));
  const setSub = (di: number, si: number, patch: Partial<DraftSub>) =>
    setDrafts(prev => prev.map((d, i) => i === di ? { ...d, subs: d.subs.map((s, j) => j === si ? { ...s, ...patch } : s) } : d));

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl bg-card neu-flat max-h-[90vh] overflow-y-auto z-[120]">
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
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Conteúdos e Subconteúdos</Label>
              <Button onClick={() => setDrafts(prev => [...prev, { name: "", total: 0, correct: 0, subs: [] }])}
                variant="outline" size="sm" className="neu-btn text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Conteúdo
              </Button>
            </div>
            <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
              {drafts.map((d, idx) => {
                const hasSubs = d.subs.length > 0;
                return (
                  <div key={idx} className="bg-background neu-pressed rounded-xl p-3">
                    <div className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-end">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Conteúdo</Label>
                        <Input value={d.name} onChange={e => setDraft(idx, { name: e.target.value })}
                          placeholder="Ex: Matemática" className="bg-card neu-flat border-0 h-9 text-sm mt-1" />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
                        <Input type="number" min={0} disabled={hasSubs}
                          value={hasSubs ? d.subs.reduce((s, x) => s + x.total, 0) : d.total}
                          onChange={e => setDraft(idx, { total: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                          className={`bg-card neu-flat border-0 h-9 text-sm mt-1 ${hasSubs ? "opacity-60" : ""}`} />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Acertos</Label>
                        <Input type="number" min={0} disabled={hasSubs}
                          value={hasSubs ? d.subs.reduce((s, x) => s + x.correct, 0) : d.correct}
                          onChange={e => setDraft(idx, { correct: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                          className={`bg-card neu-flat border-0 h-9 text-sm mt-1 ${hasSubs ? "opacity-60" : ""}`} />
                      </div>
                      <button onClick={() => setDrafts(prev => prev.filter((_, i) => i !== idx))}
                        className="text-muted-foreground hover:text-destructive p-2"
                        disabled={drafts.length === 1}>
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 pl-3 border-l border-border/30 flex flex-col gap-2">
                      {d.subs.map((s, si) => (
                        <div key={si} className="grid grid-cols-[1fr_70px_70px_auto] gap-2 items-end bg-card neu-flat rounded-lg p-2">
                          <Input value={s.name} placeholder="Subconteúdo"
                            onChange={e => setSub(idx, si, { name: e.target.value })}
                            className="bg-background neu-pressed border-0 h-8 text-xs" />
                          <Input type="number" min={0} value={s.total}
                            onChange={e => setSub(idx, si, { total: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                            className="bg-background neu-pressed border-0 h-8 text-xs" />
                          <Input type="number" min={0} value={s.correct}
                            onChange={e => setSub(idx, si, { correct: Math.max(0, parseInt(e.target.value || "0", 10)) })}
                            className="bg-background neu-pressed border-0 h-8 text-xs" />
                          <button onClick={() => setDraft(idx, { subs: d.subs.filter((_, j) => j !== si) })}
                            className="text-muted-foreground hover:text-destructive p-1">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <Button size="sm" variant="ghost" className="text-[11px] h-7 self-start"
                        onClick={() => setDraft(idx, { subs: [...d.subs, { name: "", total: 0, correct: 0 }] })}>
                        <Plus className="w-3 h-3 mr-1" /> Subconteúdo
                      </Button>
                    </div>
                  </div>
                );
              })}
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