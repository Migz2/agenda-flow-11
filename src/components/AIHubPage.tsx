import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, Trash2, BookOpen, FileText, Link, Sparkles, Send, MessageSquare,
  RefreshCw, X, ChevronLeft, Loader2, Upload, Eye, ChevronRight, MessageCircle, ThumbsUp, ThumbsDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNotebooks, useNotebookSources, useChatMessages, type Notebook } from "@/hooks/useNotebooks";
import { useCustomCategories } from "@/hooks/useTasks";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-ai`;

interface QuizQuestion {
  question: string;
  options: { label: string; text: string; explanation: string }[];
  correctIndex: number;
}

async function streamChat({
  messages, mode, sources, onDelta, onDone, onError, type, question
}: {
  messages: { role: string; content: string }[];
  mode: string;
  sources: { title: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
  type?: string;
  question?: string;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, sources, type: type || "chat", question }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Erro desconhecido" }));
    onError(data.error || `Erro ${resp.status}`);
    return;
  }
  if (!resp.body) { onError("Sem resposta"); return; }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, idx);
      buf = buf.slice(idx + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { onDone(); return; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) onDelta(content);
      } catch { /* partial */ }
    }
  }
  onDone();
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => item.str).join(" ");
    fullText += `\n--- Página ${i} ---\n${pageText}`;
  }
  return fullText.trim();
}

export function AIHubPage() {
  const { notebooks, loading, addNotebook, deleteNotebook } = useNotebooks();
  const { categories } = useCustomCategories();
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategoryId, setNewCategoryId] = useState<string>("");

  if (selectedNotebook) {
    return <NotebookView notebook={selectedNotebook} onBack={() => setSelectedNotebook(null)} categories={categories} />;
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    const nb = await addNotebook(newTitle, newCategoryId || null);
    if (nb) {
      setSelectedNotebook(nb);
      setNewTitle("");
      setNewCategoryId("");
      setShowNewForm(false);
    }
  };

  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Inteligência Artificial</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
          <Brain className="w-8 h-8 text-primary" />
          AI Study Hub
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Crie notebooks vinculados às suas matérias, gere exercícios e converse com um tutor IA.
        </p>
      </div>

      <AnimatePresence>
        {showNewForm && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-6 bg-card rounded-2xl p-5 border border-border/30 overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold text-foreground">Novo Notebook</h3>
              <button onClick={() => setShowNewForm(false)} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Título</Label>
                <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Cálculo II" className="bg-secondary border-border/50 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Vincular a matéria (opcional)</Label>
                <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                  <SelectTrigger className="bg-secondary border-border/50 mt-1"><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
                  <SelectContent className="bg-popover border-border/30">
                    <SelectItem value="none">Sem vínculo</SelectItem>
                    {categories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleCreate} className="mt-4 bg-primary text-primary-foreground glow-pink">
              <Plus className="w-4 h-4 mr-2" /> Criar Notebook
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showNewForm && (
        <button onClick={() => setShowNewForm(true)} className="w-full py-4 border-2 border-dashed border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:border-border/80 transition-all flex items-center justify-center gap-2 mb-6">
          <Plus className="w-5 h-5" /><span className="text-sm font-medium">Novo Notebook</span>
        </button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-sm text-muted-foreground col-span-full">Carregando...</p>}
        {notebooks.map(nb => {
          const cat = categories.find(c => c.id === nb.category_id);
          return (
            <motion.div key={nb.id} whileHover={{ scale: 1.02 }} className="bg-card rounded-2xl p-5 border border-border/30 cursor-pointer hover:border-primary/30 transition-all" onClick={() => setSelectedNotebook(nb)}>
              <div className="flex items-start justify-between mb-3">
                <BookOpen className="w-6 h-6 text-primary" />
                <button onClick={e => { e.stopPropagation(); deleteNotebook(nb.id); }} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
              <h3 className="text-base font-display font-semibold text-foreground">{nb.title}</h3>
              {cat && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-muted-foreground">{cat.name}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">{new Date(nb.updated_at).toLocaleDateString("pt-BR")}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== Source Viewer Modal ========== */
function SourceViewerModal({ source, onClose }: { source: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative bg-card neu-raised rounded-2xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-display font-semibold text-foreground">{source.title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        {source.url && (
          <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mb-3 block">{source.url}</a>
        )}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
          <ReactMarkdown>{source.content || "Sem conteúdo."}</ReactMarkdown>
        </div>
      </motion.div>
    </div>
  );
}

/* ========== Quiz UI ========== */
function QuizView({ questions, sources, onBack }: { questions: QuizQuestion[]; sources: { title: string; content: string }[]; onBack: () => void }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [explainText, setExplainText] = useState("");
  const [explaining, setExplaining] = useState(false);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);

  const q = questions[currentIdx];
  if (!q) return null;

  const isCorrect = selectedOption === q.correctIndex;

  const handleSelect = (idx: number) => {
    if (answered) return;
    setSelectedOption(idx);
    setAnswered(true);
    if (idx === q.correctIndex) setScore(s => s + 1);
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setAnswered(false);
      setShowExplanation(false);
      setExplainText("");
    }
  };

  const handleExplain = async () => {
    setShowExplanation(true);
    if (explainText) return;
    setExplaining(true);
    let text = "";
    const questionContext = `Questão: ${q.question}\nAlternativas:\n${q.options.map(o => `${o.label}) ${o.text}`).join("\n")}\nResposta correta: ${q.options[q.correctIndex]?.label}) ${q.options[q.correctIndex]?.text}`;

    await streamChat({
      messages: [{ role: "user", content: questionContext }],
      mode: "sources_only",
      sources,
      type: "explain",
      question: questionContext,
      onDelta: (chunk) => { text += chunk; setExplainText(text); },
      onDone: () => setExplaining(false),
      onError: () => { setExplaining(false); setExplainText("Erro ao gerar explicação."); },
    });
  };

  const finished = currentIdx === questions.length - 1 && answered;

  return (
    <div className="flex flex-col gap-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{currentIdx + 1} / {questions.length}</span>
        <span className="text-xs text-muted-foreground">Acertos: {score}</span>
      </div>
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${((currentIdx + (answered ? 1 : 0)) / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <motion.div key={currentIdx} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="mt-2">
        <p className="text-base font-display font-semibold text-foreground leading-relaxed">{q.question}</p>
      </motion.div>

      {/* Options */}
      <div className="flex flex-col gap-3 mt-2">
        {q.options.map((opt, i) => {
          let optionClass = "neu-btn";
          if (answered) {
            if (i === q.correctIndex) optionClass = "ring-2 ring-green-500 bg-green-500/10";
            else if (i === selectedOption) optionClass = "ring-2 ring-destructive bg-destructive/10";
            else optionClass = "opacity-60";
          }
          return (
            <motion.button
              key={i}
              whileTap={!answered ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(i)}
              disabled={answered}
              className={`w-full text-left rounded-2xl p-4 transition-all ${optionClass}`}
            >
              <div className="flex gap-3">
                <span className="text-xs font-bold text-muted-foreground shrink-0 mt-0.5">{opt.label}.</span>
                <div className="flex-1">
                  <span className="text-sm font-medium text-foreground">{opt.text}</span>
                  {answered && (
                    <p className="text-xs text-muted-foreground mt-1.5">{opt.explanation}</p>
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-2">
        {answered && !finished && (
          <Button onClick={handleNext} className="bg-primary text-primary-foreground glow-pink flex-1">
            Próxima <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
        {answered && (
          <Button onClick={handleExplain} variant="outline" className="neu-btn text-xs">
            <MessageCircle className="w-3.5 h-3.5 mr-1" /> Explicar
          </Button>
        )}
      </div>

      {/* Finished */}
      {finished && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card neu-raised rounded-2xl p-5 text-center mt-2">
          <p className="text-2xl font-display font-bold text-foreground">{score}/{questions.length}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {score === questions.length ? "Perfeito! 🎉" : score >= questions.length * 0.7 ? "Muito bom! 👏" : "Continue estudando! 📚"}
          </p>
          <Button onClick={onBack} variant="outline" className="mt-4 neu-btn text-xs">Voltar</Button>
        </motion.div>
      )}

      {/* Explain panel */}
      <AnimatePresence>
        {showExplanation && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="bg-card rounded-2xl p-4 border border-border/30 overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">💬 Explicação do Tutor</span>
              <button onClick={() => setShowExplanation(false)} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            {explaining && !explainText && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
              <ReactMarkdown>{explainText}</ReactMarkdown>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ========== Notebook View ========== */
function NotebookView({ notebook, onBack, categories }: { notebook: Notebook; onBack: () => void; categories: any[] }) {
  const { sources, addSource, removeSource, syncTaskNotes } = useNotebookSources(notebook.id);
  const { messages, addMessage, updateLastAssistant, clearMessages } = useChatMessages(notebook.id);
  const [activeTab, setActiveTab] = useState<"sources" | "exercises" | "chat">("sources");
  const [chatMode, setChatMode] = useState<"sources_only" | "general">("sources_only");
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [viewingSource, setViewingSource] = useState<any>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [syncing, setSyncing] = useState(false);
  const [interleaving, setInterleaving] = useState(false);
  const [feynmanInput, setFeynmanInput] = useState("");
  const [feynmanResult, setFeynmanResult] = useState("");
  const [feynmanStreaming, setFeynmanStreaming] = useState(false);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const cat = categories.find((c: any) => c.id === notebook.category_id);

  const handleSyncNotes = async () => {
    setSyncing(true);
    const count = await syncTaskNotes(notebook.category_id);
    toast({ title: "Fontes sincronizadas", description: `${count || 0} novas anotações importadas.` });
    setSyncing(false);
  };

  const handleAddManualSource = async () => {
    if (!newSourceTitle.trim()) return;
    await addSource({ title: newSourceTitle, content: newSourceContent, source_type: newSourceUrl ? "link" : "manual", url: newSourceUrl });
    setNewSourceTitle(""); setNewSourceContent(""); setNewSourceUrl(""); setShowAddSource(false);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast({ title: "Formato inválido", description: "Apenas PDFs são suportados.", variant: "destructive" }); return; }
    setUploadingPdf(true);
    try {
      const text = await extractPdfText(file);
      await addSource({ title: file.name.replace(".pdf", ""), content: text, source_type: "pdf" });
      toast({ title: "PDF importado!", description: `${file.name} adicionado como fonte.` });
    } catch (err) {
      toast({ title: "Erro ao processar PDF", variant: "destructive" });
    }
    setUploadingPdf(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleGenerateQuiz = async () => {
    if (sources.length === 0) {
      toast({ title: "Sem fontes", description: "Adicione ou sincronize fontes antes de gerar quiz.", variant: "destructive" });
      return;
    }
    setGeneratingQuiz(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        body: JSON.stringify({ type: "quiz", sources: sources.map(s => ({ title: s.title, content: s.content })), interleaving }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        toast({ title: "Erro", description: data.error || "Falha ao gerar quiz.", variant: "destructive" });
        setGeneratingQuiz(false);
        return;
      }
      const data = await resp.json();
      if (data.questions) {
        setQuizQuestions(data.questions);
        setActiveTab("exercises");
      } else {
        toast({ title: "Erro", description: data.error || "Quiz inválido. Tente novamente.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro de rede", variant: "destructive" });
    }
    setGeneratingQuiz(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userText = chatInput.trim();
    setChatInput("");
    await addMessage("user", userText);
    setIsStreaming(true);

    let assistantText = "";
    const chatMessages = [...messages.map(m => ({ role: m.role, content: m.content })), { role: "user", content: userText }];

    await streamChat({
      messages: chatMessages, mode: chatMode, sources: sources.map(s => ({ title: s.title, content: s.content })),
      onDelta: (chunk) => { assistantText += chunk; updateLastAssistant(assistantText); },
      onDone: async () => { if (assistantText) await addMessage("assistant", assistantText); setIsStreaming(false); },
      onError: (msg) => { toast({ title: "Erro da IA", description: msg, variant: "destructive" }); setIsStreaming(false); },
    });
  };

  const tabs = [
    { id: "sources", label: "Fontes", icon: FileText },
    { id: "exercises", label: "Quiz", icon: Sparkles },
    { id: "feynman", label: "Feynman", icon: MessageCircle },
    { id: "chat", label: "Chat Tutor", icon: MessageSquare },
  ] as const;

  const handleFeynman = async () => {
    if (!feynmanInput.trim() || feynmanStreaming) return;
    setFeynmanStreaming(true);
    setFeynmanResult("");
    let text = "";
    await streamChat({
      messages: [{ role: "user", content: feynmanInput }],
      mode: "sources_only",
      sources: sources.map(s => ({ title: s.title, content: s.content })),
      type: "feynman",
      question: feynmanInput,
      onDelta: (chunk) => { text += chunk; setFeynmanResult(text); },
      onDone: () => setFeynmanStreaming(false),
      onError: () => { setFeynmanStreaming(false); setFeynmanResult("Erro ao avaliar."); },
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {viewingSource && <SourceViewerModal source={viewingSource} onClose={() => setViewingSource(null)} />}
      <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handlePdfUpload} />

      {/* Header */}
      <div className="p-4 lg:px-8 lg:py-5 border-b border-border/30 shrink-0">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="text-muted-foreground hover:text-foreground neu-btn p-1.5 rounded-xl">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-lg font-display font-bold text-foreground">{notebook.title}</h2>
            {cat && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-xs text-muted-foreground">{cat.name}</span>
              </div>
            )}
          </div>
          <Button onClick={handleGenerateQuiz} disabled={generatingQuiz} size="sm" className="bg-primary text-primary-foreground glow-pink text-xs">
            {generatingQuiz ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Gerar Quiz
          </Button>
        </div>
        <div className="flex gap-1 mt-3">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === tab.id ? "neu-pressed text-foreground" : "neu-btn text-muted-foreground"}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 lg:px-8">
        {activeTab === "sources" && (
          <div className="flex flex-col gap-4">
            <div className="flex gap-2 flex-wrap">
              {notebook.category_id && (
                <Button variant="outline" size="sm" onClick={handleSyncNotes} disabled={syncing} className="text-xs">
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} /> Sincronizar Anotações
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowAddSource(!showAddSource)} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" /> Fonte Manual
              </Button>
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploadingPdf} className="text-xs">
                {uploadingPdf ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-1" />}
                Upload PDF
              </Button>
            </div>

            {showAddSource && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-4 border border-border/30">
                <div className="grid grid-cols-1 gap-3">
                  <div><Label className="text-xs text-muted-foreground">Título</Label><Input value={newSourceTitle} onChange={e => setNewSourceTitle(e.target.value)} className="bg-secondary border-border/50 mt-1" placeholder="Ex: Resumo Cap. 3" /></div>
                  <div><Label className="text-xs text-muted-foreground">Conteúdo</Label><Textarea value={newSourceContent} onChange={e => setNewSourceContent(e.target.value)} className="bg-secondary border-border/50 mt-1 min-h-[80px]" placeholder="Cole seu texto ou resumo aqui..." /></div>
                  <div><Label className="text-xs text-muted-foreground">Link (opcional)</Label><Input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} className="bg-secondary border-border/50 mt-1" placeholder="https://..." /></div>
                  <Button onClick={handleAddManualSource} size="sm" className="bg-primary text-primary-foreground w-fit"><Plus className="w-4 h-4 mr-1" /> Adicionar</Button>
                </div>
              </motion.div>
            )}

            {sources.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma fonte adicionada.</p>
                <p className="text-xs mt-1">Sincronize anotações, adicione manualmente ou faça upload de um PDF.</p>
              </div>
            )}

            {sources.map(source => (
              <div key={source.id} className="bg-card rounded-xl p-4 border border-border/20 flex gap-3 cursor-pointer hover:border-primary/30 transition-all" onClick={() => setViewingSource(source)}>
                <div className="shrink-0 mt-0.5">
                  {source.source_type === "task_note" ? <BookOpen className="w-4 h-4 text-primary" /> :
                   source.source_type === "pdf" ? <FileText className="w-4 h-4 text-neon-purple" /> :
                   source.url ? <Link className="w-4 h-4 text-neon-blue" /> :
                   <FileText className="w-4 h-4 text-neon-orange" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{source.content.replace(/<[^>]*>/g, "").slice(0, 150)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <button onClick={e => { e.stopPropagation(); removeSource(source.id); }} className="text-muted-foreground hover:text-destructive"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "exercises" && (
          <div>
            {quizQuestions && quizQuestions.length > 0 ? (
              <QuizView questions={quizQuestions} sources={sources.map(s => ({ title: s.title, content: s.content }))} onBack={() => setQuizQuestions(null)} />
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum quiz gerado ainda.</p>
                <p className="text-xs mt-1">Clique em "Gerar Quiz" para criar questões interativas baseadas nas suas fontes.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col gap-4 pb-4">
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/20">
              <span className="text-xs text-muted-foreground">Modo:</span>
              <button onClick={() => setChatMode("sources_only")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chatMode === "sources_only" ? "neu-pressed text-primary" : "neu-btn text-muted-foreground"}`}>
                <BookOpen className="w-3.5 h-3.5" /> Apenas Fontes
              </button>
              <button onClick={() => setChatMode("general")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${chatMode === "general" ? "neu-pressed text-primary" : "neu-btn text-muted-foreground"}`}>
                <Brain className="w-3.5 h-3.5" /> Busca Geral
              </button>
              {messages.length > 0 && <button onClick={clearMessages} className="ml-auto text-xs text-muted-foreground hover:text-destructive">Limpar</button>}
            </div>

            <div className="flex flex-col gap-3 min-h-[200px]">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Comece uma conversa com seu tutor IA.</p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border/30 text-foreground"}`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                    ) : msg.content}
                  </div>
                </div>
              ))}
              {isStreaming && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Pensando...</div>}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {activeTab === "chat" && (
        <div className="p-4 lg:px-8 border-t border-border/30 shrink-0">
          <div className="flex gap-2">
            <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendChat()} placeholder="Pergunte algo ao tutor..." className="bg-secondary border-border/50 flex-1" disabled={isStreaming} />
            <Button onClick={handleSendChat} disabled={isStreaming || !chatInput.trim()} className="bg-primary text-primary-foreground shrink-0"><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
