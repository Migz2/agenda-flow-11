import { motion } from "framer-motion";
import { BookOpen, Brain, RefreshCw, Shuffle, Lightbulb, Timer, Target, TrendingUp } from "lucide-react";

const ARTICLES = [
  {
    title: "Active Recall",
    icon: Brain,
    color: "hsl(var(--neon-pink))",
    glow: "glow-pink",
    summary: "Testar a si mesmo é a forma mais eficaz de consolidar memórias. Ao forçar o cérebro a recuperar informações, você fortalece as conexões neurais.",
    tip: "Use os Quizzes do AI Hub para praticar Active Recall automaticamente.",
  },
  {
    title: "Spaced Repetition",
    icon: RefreshCw,
    color: "hsl(var(--neon-blue))",
    glow: "glow-blue",
    summary: "Revisar o conteúdo em intervalos crescentes (1, 3, 7, 14 dias) aproveita a curva de esquecimento de Ebbinghaus para maximizar a retenção.",
    tip: "O Gerador de Rotinas já distribui revisões espaçadas automaticamente.",
  },
  {
    title: "Interleaving",
    icon: Shuffle,
    color: "hsl(var(--neon-orange))",
    glow: "glow-orange",
    summary: "Misturar assuntos durante o estudo melhora a capacidade de discriminação e transferência de conhecimento entre domínios.",
    tip: "Ative o modo 'Interleaving' ao gerar Quizzes no AI Hub.",
  },
  {
    title: "Técnica Feynman",
    icon: Lightbulb,
    color: "hsl(var(--neon-green))",
    glow: "glow-green",
    summary: "Explique um conceito com suas próprias palavras como se ensinasse a uma criança. Se não conseguir, você encontrou uma lacuna no seu conhecimento.",
    tip: "Use a aba 'Feynman' no AI Hub para a IA avaliar suas explicações.",
  },
  {
    title: "Pomodoro Technique",
    icon: Timer,
    color: "hsl(var(--neon-purple))",
    glow: "glow-purple",
    summary: "Trabalhe em blocos de 25 minutos com pausas de 5 minutos. Isso mantém o foco alto e previne fadiga cognitiva.",
    tip: "O Modo Foco se adapta ao seu perfil cognitivo automaticamente.",
  },
  {
    title: "Metacognição",
    icon: Target,
    color: "hsl(var(--neon-yellow))",
    glow: "glow-yellow",
    summary: "Pensar sobre como você pensa e aprende. Autoavaliação regular melhora a eficiência do estudo e identifica estratégias ideais.",
    tip: "O Dashboard mostra métricas de retenção e produtividade em tempo real.",
  },
  {
    title: "Cronotipos",
    icon: TrendingUp,
    color: "hsl(var(--primary))",
    glow: "glow-pink",
    summary: "Seu relógio biológico determina seus picos de energia. Leões rendem de manhã, Ursos à tarde e Lobos à noite. Estudar no momento certo multiplica resultados.",
    tip: "Seu cronotipo foi detectado no Onboarding e otimiza o Smart Scheduler.",
  },
];

export function LibraryPage() {
  return (
    <div className="flex-1 p-4 lg:p-8 overflow-y-auto pt-20">
      <div className="mb-8">
        <p className="text-xs text-muted-foreground font-body uppercase tracking-widest">Referências</p>
        <h2 className="text-2xl lg:text-3xl font-display font-bold text-foreground mt-1 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-primary" />
          Biblioteca Científica
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          As técnicas de aprendizagem baseadas em evidências que potencializam seu estudo.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {ARTICLES.map((article, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-card neu-flat rounded-2xl p-6 hover:scale-[1.02] transition-transform`}
          >
            <div className={`w-12 h-12 rounded-2xl neu-btn flex items-center justify-center mb-4 ${article.glow}`}>
              <article.icon className="w-6 h-6" style={{ color: article.color }} />
            </div>
            <h3 className="text-base font-display font-bold text-foreground mb-2">{article.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">{article.summary}</p>
            <div className="bg-secondary/50 rounded-xl p-3 border border-border/20">
              <p className="text-[10px] text-primary font-medium">💡 No NeonPlanner:</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{article.tip}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
