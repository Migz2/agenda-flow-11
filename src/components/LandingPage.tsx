import { motion } from "framer-motion";
import { Brain, Sparkles, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin: () => void;
}

export function LandingPage({ onGetStarted, onLogin }: LandingPageProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background bg-grid flex flex-col relative overflow-hidden">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 rounded-xl neu-btn text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-lg"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="w-20 h-20 rounded-3xl bg-primary/20 neu-raised flex items-center justify-center mx-auto mb-8 glow-pink"
          >
            <Brain className="w-10 h-10 text-primary" />
          </motion.div>

          <h1 className="text-4xl lg:text-5xl font-display font-bold text-foreground leading-tight mb-4">
            Seu cérebro tem um ritmo.
          </h1>
          <p className="text-xl font-display text-primary font-semibold mb-2">
            Estude no seu.
          </p>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-10 leading-relaxed">
            Descubra seu perfil cognitivo e receba um plano de estudos personalizado baseado em neurociência.
          </p>

          <div className="flex flex-col gap-3 items-center">
            <Button
              onClick={onGetStarted}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground glow-pink rounded-2xl neu-raised px-8 py-6 text-base font-display font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              Descubra seu Perfil
            </Button>
            <button
              onClick={onLogin}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Já tem conta? <span className="text-primary hover:underline">Entrar</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-16 max-w-xs mx-auto">
            {[
              { emoji: "🦁", label: "Cronotipo" },
              { emoji: "🧠", label: "Metacognição" },
              { emoji: "📊", label: "Analytics" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="flex flex-col items-center gap-1.5"
              >
                <div className="w-12 h-12 rounded-2xl neu-flat flex items-center justify-center text-xl">
                  {item.emoji}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">{item.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
