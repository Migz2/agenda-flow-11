import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Plus, Trash2, BookOpen, FileText, Link, Sparkles, Send, MessageSquare,
  RefreshCw, X, ChevronLeft, ToggleLeft, ToggleRight, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useNotebooks, useNotebookSources, useChatMessages, type Notebook } from "@/hooks/useNotebooks";
import { useCustomCategories } from "@/hooks/useTasks";
import { toast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/study-ai`;

async function streamChat({
  messages,
  mode,
  sources,
  onDelta,
  onDone,
  onError,
}: {
  messages: { role: string; content: string }[];
  mode: string;
  sources: { title: string; content: string }[];
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (msg: string) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages, mode, sources, type: "chat" }),
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

      {/* New notebook form */}
      <AnimatePresence>
        {showNewForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="mb-6 bg-card rounded-2xl p-5 border border-border/30 overflow-hidden"
          >
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
                  <SelectTrigger className="bg-secondary border-border/50 mt-1">
                    <SelectValue placeholder="Sem vínculo" />
                  </SelectTrigger>
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
        <button
          onClick={() => setShowNewForm(true)}
          className="w-full py-4 border-2 border-dashed border-border/40 rounded-2xl text-muted-foreground hover:text-foreground hover:border-border/80 transition-all flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-5 h-5" />
          <span className="text-sm font-medium">Novo Notebook</span>
        </button>
      )}

      {/* Notebooks grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading && <p className="text-sm text-muted-foreground col-span-full">Carregando...</p>}
        {notebooks.map(nb => {
          const cat = categories.find(c => c.id === nb.category_id);
          return (
            <motion.div
              key={nb.id}
              whileHover={{ scale: 1.02 }}
              className="bg-card rounded-2xl p-5 border border-border/30 cursor-pointer hover:border-primary/30 transition-all"
              onClick={() => setSelectedNotebook(nb)}
            >
              <div className="flex items-start justify-between mb-3">
                <BookOpen className="w-6 h-6 text-primary" />
                <button
                  onClick={e => { e.stopPropagation(); deleteNotebook(nb.id); }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-base font-display font-semibold text-foreground">{nb.title}</h3>
              {cat && (
                <div className="flex items-center gap-1.5 mt-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                  <span className="text-xs text-muted-foreground">{cat.name}</span>
                </div>
              )}
              <p className="text-[10px] text-muted-foreground mt-2">
                {new Date(nb.updated_at).toLocaleDateString("pt-BR")}
              </p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function NotebookView({ notebook, onBack, categories }: { notebook: Notebook; onBack: () => void; categories: any[] }) {
  const { sources, addSource, removeSource, syncTaskNotes } = useNotebookSources(notebook.id);
  const { messages, addMessage, updateLastAssistant, clearMessages } = useChatMessages(notebook.id);
  const [activeTab, setActiveTab] = useState<"sources" | "exercises" | "chat">("sources");
  const [chatMode, setChatMode] = useState<"sources_only" | "general">("sources_only");
  const [chatInput, setChatInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [exercises, setExercises] = useState<string | null>(null);
  const [generatingExercises, setGeneratingExercises] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceTitle, setNewSourceTitle] = useState("");
  const [newSourceContent, setNewSourceContent] = useState("");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const cat = categories.find((c: any) => c.id === notebook.category_id);

  const handleSyncNotes = async () => {
    setSyncing(true);
    const count = await syncTaskNotes(notebook.category_id);
    toast({ title: "Fontes sincronizadas", description: `${count || 0} novas anotações importadas.` });
    setSyncing(false);
  };

  const handleAddManualSource = async () => {
    if (!newSourceTitle.trim()) return;
    await addSource({
      title: newSourceTitle,
      content: newSourceContent,
      source_type: newSourceUrl ? "link" : "manual",
      url: newSourceUrl,
    });
    setNewSourceTitle("");
    setNewSourceContent("");
    setNewSourceUrl("");
    setShowAddSource(false);
  };

  const handleGenerateExercises = async () => {
    if (sources.length === 0) {
      toast({ title: "Sem fontes", description: "Adicione ou sincronize fontes antes de gerar exercícios.", variant: "destructive" });
      return;
    }
    setGeneratingExercises(true);
    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: "exercises",
          sources: sources.map(s => ({ title: s.title, content: s.content })),
        }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        toast({ title: "Erro", description: data.error || "Falha ao gerar exercícios.", variant: "destructive" });
        setGeneratingExercises(false);
        return;
      }
      const data = await resp.json();
      setExercises(data.content);
      setActiveTab("exercises");
    } catch {
      toast({ title: "Erro de rede", variant: "destructive" });
    }
    setGeneratingExercises(false);
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() || isStreaming) return;
    const userText = chatInput.trim();
    setChatInput("");
    await addMessage("user", userText);
    setIsStreaming(true);

    let assistantText = "";
    const chatMessages = [
      ...messages.map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText },
    ];

    await streamChat({
      messages: chatMessages,
      mode: chatMode,
      sources: sources.map(s => ({ title: s.title, content: s.content })),
      onDelta: (chunk) => {
        assistantText += chunk;
        updateLastAssistant(assistantText);
      },
      onDone: async () => {
        if (assistantText) await addMessage("assistant", assistantText);
        setIsStreaming(false);
      },
      onError: (msg) => {
        toast({ title: "Erro da IA", description: msg, variant: "destructive" });
        setIsStreaming(false);
      },
    });
  };

  const tabs = [
    { id: "sources", label: "Fontes", icon: FileText },
    { id: "exercises", label: "Exercícios", icon: Sparkles },
    { id: "chat", label: "Chat Tutor", icon: MessageSquare },
  ] as const;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
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
          <Button
            onClick={handleGenerateExercises}
            disabled={generatingExercises}
            size="sm"
            className="bg-primary text-primary-foreground glow-pink text-xs"
          >
            {generatingExercises ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            Gerar Exercícios
          </Button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id ? "neu-pressed text-foreground" : "neu-btn text-muted-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
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
                  <RefreshCw className={`w-3.5 h-3.5 mr-1 ${syncing ? "animate-spin" : ""}`} />
                  Sincronizar Anotações
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setShowAddSource(!showAddSource)} className="text-xs">
                <Plus className="w-3.5 h-3.5 mr-1" />
                Fonte Manual
              </Button>
            </div>

            {showAddSource && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card rounded-2xl p-4 border border-border/30">
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Título</Label>
                    <Input value={newSourceTitle} onChange={e => setNewSourceTitle(e.target.value)} className="bg-secondary border-border/50 mt-1" placeholder="Ex: Resumo Cap. 3" />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Conteúdo</Label>
                    <Textarea value={newSourceContent} onChange={e => setNewSourceContent(e.target.value)} className="bg-secondary border-border/50 mt-1 min-h-[80px]" placeholder="Cole seu texto ou resumo aqui..." />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Link (opcional)</Label>
                    <Input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} className="bg-secondary border-border/50 mt-1" placeholder="https://..." />
                  </div>
                  <Button onClick={handleAddManualSource} size="sm" className="bg-primary text-primary-foreground w-fit">
                    <Plus className="w-4 h-4 mr-1" /> Adicionar
                  </Button>
                </div>
              </motion.div>
            )}

            {sources.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhuma fonte adicionada.</p>
                <p className="text-xs mt-1">Sincronize anotações das tarefas ou adicione fontes manualmente.</p>
              </div>
            )}

            {sources.map(source => (
              <div key={source.id} className="bg-card rounded-xl p-4 border border-border/20 flex gap-3">
                <div className="shrink-0 mt-0.5">
                  {source.source_type === "task_note" ? (
                    <BookOpen className="w-4 h-4 text-primary" />
                  ) : source.url ? (
                    <Link className="w-4 h-4 text-neon-blue" />
                  ) : (
                    <FileText className="w-4 h-4 text-neon-orange" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{source.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {source.content.replace(/<[^>]*>/g, "").slice(0, 150)}
                  </p>
                  {source.url && (
                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline mt-1 block truncate">
                      {source.url}
                    </a>
                  )}
                </div>
                <button onClick={() => removeSource(source.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTab === "exercises" && (
          <div>
            {exercises ? (
              <div className="bg-card rounded-2xl p-5 border border-border/30 prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{exercises}</ReactMarkdown>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Nenhum exercício gerado ainda.</p>
                <p className="text-xs mt-1">Clique em "Gerar Exercícios" para criar questões baseadas nas suas fontes.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "chat" && (
          <div className="flex flex-col gap-4 pb-4">
            {/* Context toggle */}
            <div className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/20">
              <span className="text-xs text-muted-foreground">Modo:</span>
              <button
                onClick={() => setChatMode(chatMode === "sources_only" ? "general" : "sources_only")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  chatMode === "sources_only" ? "neu-pressed text-primary" : "neu-btn text-muted-foreground"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                Apenas Fontes
              </button>
              <button
                onClick={() => setChatMode(chatMode === "general" ? "sources_only" : "general")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  chatMode === "general" ? "neu-pressed text-primary" : "neu-btn text-muted-foreground"
                }`}
              >
                <Brain className="w-3.5 h-3.5" />
                Busca Geral
              </button>
              {messages.length > 0 && (
                <button onClick={clearMessages} className="ml-auto text-xs text-muted-foreground hover:text-destructive">Limpar</button>
              )}
            </div>

            {/* Messages */}
            <div className="flex flex-col gap-3 min-h-[200px]">
              {messages.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Comece uma conversa com seu tutor IA.</p>
                  <p className="text-xs mt-1">
                    {chatMode === "sources_only"
                      ? "Respostas baseadas apenas nas suas anotações."
                      : "Respostas com conhecimento geral da IA."}
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={msg.id || i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border border-border/30 text-foreground"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              ))}
              {isStreaming && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Pensando...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Chat input */}
      {activeTab === "chat" && (
        <div className="p-4 lg:px-8 border-t border-border/30 shrink-0">
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSendChat()}
              placeholder="Pergunte algo ao tutor..."
              className="bg-secondary border-border/50 flex-1"
              disabled={isStreaming}
            />
            <Button onClick={handleSendChat} disabled={isStreaming || !chatInput.trim()} className="bg-primary text-primary-foreground shrink-0">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
