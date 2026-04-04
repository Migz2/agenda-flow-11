import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";

interface Step {
  title: string;
  subtitle: string;
  options: { value: string; emoji: string; label: string; desc: string }[];
}

const STEPS: Step[] = [
  {
    title: "Qual é o seu cronotipo?",
    subtitle: "Quando você se sente mais produtivo?",
    options: [
      { value: "lion", emoji: "🦁", label: "Leão (Manhã)", desc: "Acordo cedo e rendo mais pela manhã." },
      { value: "bear", emoji: "🐻", label: "Urso (Tarde)", desc: "Meu pico de energia é no meio do dia." },
      { value: "wolf", emoji: "🐺", label: "Lobo (Noite)", desc: "Sou noturno, foco melhor à noite." },
    ],
  },
  {
    title: "Como é sua disciplina?",
    subtitle: "Avalie sua consistência com rotinas.",
    options: [
      { value: "high", emoji: "🎯", label: "Alta Conscienciosidade", desc: "Consigo seguir rotinas com facilidade." },
      { value: "low", emoji: "🌊", label: "Baixa Conscienciosidade", desc: "Preciso de estrutura externa e lembretes." },
    ],
  },
  {
    title: "Como você lida com pressão?",
    subtitle: "Avalie seu nível de ansiedade ao estudar.",
    options: [
      { value: "high", emoji: "⚡", label: "Alto Neuroticismo", desc: "Me estresso fácil com prazos e provas." },
      { value: "low", emoji: "😌", label: "Baixo Neuroticismo", desc: "Lido bem com pressão e prazos." },
    ],
  },
];

const PROFILE_NAMES: Record<string, Record<string, Record<string, string>>> = {
  lion: {
    high: { high: "Leão Estratégico", low: "Leão Disciplinado" },
    low: { high: "Leão Ansioso", low: "Leão Explorador" },
  },
  bear: {
    high: { high: "Urso Metódico", low: "Urso Equilibrado" },
    low: { high: "Urso Criativo", low: "Urso Adaptável" },
  },
  wolf: {
    high: { high: "Lobo Focado", low: "Lobo Constante" },
    low: { high: "Lobo Intenso", low: "Lobo Livre" },
  },
};

export function OnboardingQuiz({ onComplete }: { onComplete: () => void }) {
  const { updateProfile } = useProfile();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSelect = (value: string) => {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      setShowResult(true);
    }
  };

  const profileName = answers.length === 3
    ? PROFILE_NAMES[answers[0]]?.[answers[1]]?.[answers[2]] || "Estudante Único"
    : "";

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({
      chronotype: answers[0],
      conscientiousness: answers[1],
      neuroticism: answers[2],
    });
    setSaving(false);
    onComplete();
  };

  if (showResult) {
    return (
      <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-sm"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 rounded-3xl bg-primary/20 neu-raised flex items-center justify-center mx-auto mb-6 glow-pink text-4xl"
          >
            {answers[0] === "lion" ? "🦁" : answers[0] === "bear" ? "🐻" : "🐺"}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-xs text-muted-foreground uppercase tracking-widest mb-2"
          >
            Seu perfil cognitivo
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-3xl font-display font-bold text-foreground mb-3"
          >
            {profileName}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-sm text-muted-foreground mb-8 leading-relaxed"
          >
            Seu app foi personalizado com base no seu perfil.
            {answers[1] === "low" && " Timer travado em Pomodoro para manter o foco."}
            {answers[0] === "wolf" && " Horários de estudo otimizados para a noite."}
            {answers[0] === "lion" && " Horários de estudo otimizados para a manhã."}
          </motion.p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { label: "Cronotipo", value: answers[0] === "lion" ? "Manhã" : answers[0] === "bear" ? "Tarde" : "Noite" },
              { label: "Disciplina", value: answers[1] === "high" ? "Alta" : "Baixa" },
              { label: "Ansiedade", value: answers[2] === "high" ? "Alta" : "Baixa" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="bg-card neu-flat rounded-2xl p-3"
              >
                <p className="text-[10px] text-muted-foreground">{item.label}</p>
                <p className="text-sm font-display font-bold text-foreground mt-0.5">{item.value}</p>
              </motion.div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground glow-pink rounded-2xl neu-raised"
          >
            {saving ? "Salvando..." : "Começar a Estudar"}
            <Sparkles className="w-4 h-4 ml-2" />
          </Button>
        </motion.div>
      </div>
    );
  }

  const currentStep = STEPS[step];

  return (
    <div className="min-h-screen bg-background bg-grid flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? "bg-primary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
              Etapa {step + 1} de {STEPS.length}
            </p>
            <h2 className="text-2xl font-display font-bold text-foreground mb-1">
              {currentStep.title}
            </h2>
            <p className="text-sm text-muted-foreground mb-8">
              {currentStep.subtitle}
            </p>

            <div className="flex flex-col gap-3">
              {currentStep.options.map((opt) => (
                <motion.button
                  key={opt.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(opt.value)}
                  className="w-full text-left rounded-2xl p-5 neu-btn transition-all hover:border-primary/30"
                >
                  <div className="flex items-start gap-4">
                    <span className="text-3xl">{opt.emoji}</span>
                    <div>
                      <p className="text-sm font-display font-semibold text-foreground">{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
