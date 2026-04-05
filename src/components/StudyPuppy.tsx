import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Droplets, Drumstick, Sparkles, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const DECAY_RATE = 3; // 3% per hour

function applyDecay(profile: NonNullable<ReturnType<typeof useProfile>["profile"]>) {
  if (!profile.last_decay_update) return { hunger: profile.puppy_hunger, thirst: profile.puppy_thirst, hygiene: profile.puppy_hygiene, hours: 0 };
  const elapsed = (Date.now() - new Date(profile.last_decay_update).getTime()) / 3600000;
  const hours = Math.floor(elapsed);
  if (hours <= 0) return { hunger: profile.puppy_hunger, thirst: profile.puppy_thirst, hygiene: profile.puppy_hygiene, hours: 0 };
  const decay = hours * DECAY_RATE;
  return {
    hunger: Math.max(0, profile.puppy_hunger - decay),
    thirst: Math.max(0, profile.puppy_thirst - decay),
    hygiene: Math.max(0, profile.puppy_hygiene - decay),
    hours,
  };
}

function PuppySprite({ isSad }: { isSad: boolean }) {
  return (
    <motion.div
      animate={isSad ? { y: [0, 2, 0], rotate: [-2, 2, -2] } : { y: [0, -6, 0] }}
      transition={{ duration: isSad ? 1.5 : 2, repeat: Infinity, ease: "easeInOut" }}
      className="text-7xl select-none"
    >
      {isSad ? "🐶" : "🐕"}
    </motion.div>
  );
}

function ShakingBox() {
  return (
    <motion.div
      animate={{ rotate: [-3, 3, -3, 3, 0], scale: [1, 1.02, 1] }}
      transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1 }}
      className="text-7xl select-none"
    >
      🎁
    </motion.div>
  );
}

function ConfettiOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  const emojis = ["🎉", "✨", "🎊", "⭐", "🌟"];
  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.span
          key={i}
          initial={{ y: -20, x: `${Math.random() * 100}%`, opacity: 1, scale: 0.5 }}
          animate={{ y: "120%", opacity: 0, scale: 1, rotate: Math.random() * 360 }}
          transition={{ duration: 1.5 + Math.random(), delay: Math.random() * 0.5 }}
          className="absolute text-2xl"
        >
          {emojis[i % emojis.length]}
        </motion.span>
      ))}
    </div>
  );
}

export function StudyPuppy() {
  const { profile, updateProfile, loading } = useProfile();
  const [showConfetti, setShowConfetti] = useState(false);
  const [namingMode, setNamingMode] = useState(false);
  const [puppyNameInput, setPuppyNameInput] = useState("");

  // Decay on mount
  useEffect(() => {
    if (!profile || !profile.has_hatched) return;
    const { hunger, thirst, hygiene, hours } = applyDecay(profile);
    if (hours > 0) {
      updateProfile({
        puppy_hunger: hunger,
        puppy_thirst: thirst,
        puppy_hygiene: hygiene,
        last_decay_update: new Date().toISOString(),
      });
    }
  }, [profile?.last_decay_update]);

  const handleCare = useCallback(async (type: "hunger" | "thirst" | "hygiene", cost: number) => {
    if (!profile) return;
    if (profile.study_coins < cost) {
      toast({ title: "Moedas insuficientes!", description: `Você precisa de ${cost} coins. Complete sessões no Modo Foco!`, variant: "destructive" });
      return;
    }
    const updates: any = { study_coins: profile.study_coins - cost };
    if (type === "hunger") updates.puppy_hunger = 100;
    if (type === "thirst") updates.puppy_thirst = 100;
    if (type === "hygiene") updates.puppy_hygiene = 100;
    await updateProfile(updates);
    toast({ title: "Cuidado realizado! 🐾", description: `Seu puppy está mais feliz!` });
  }, [profile, updateProfile]);

  const handleSetName = async () => {
    if (!puppyNameInput.trim()) return;
    await updateProfile({ puppy_name: puppyNameInput.trim() });
    setNamingMode(false);
  };

  if (loading || !profile) return null;

  const { hunger, thirst, hygiene } = applyDecay(profile);
  const isSad = hunger < 30 || thirst < 30 || hygiene < 30;
  const hasHatched = profile.has_hatched;
  const puppyName = profile.puppy_name || "Seu Puppy";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden neu-flat"
      style={{
        background: "linear-gradient(180deg, #8BC34A 0%, #6B9B37 30%, #5D4037 60%, #4E342E 100%)",
        minHeight: 280,
      }}
    >
      {/* Coins HUD */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white tabular-nums">{profile.study_coins}</span>
      </div>

      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}

      {/* Main area */}
      <div className="flex flex-col items-center justify-center pt-6 pb-2 relative z-10">
        {/* Name */}
        {hasHatched && (
          <div className="mb-2">
            {namingMode ? (
              <div className="flex gap-1.5 items-center">
                <Input
                  value={puppyNameInput}
                  onChange={e => setPuppyNameInput(e.target.value)}
                  placeholder="Nome do puppy"
                  className="h-7 text-xs w-28 bg-white/80 text-gray-800 border-0"
                  onKeyDown={e => e.key === "Enter" && handleSetName()}
                />
                <Button size="sm" onClick={handleSetName} className="h-7 text-xs bg-white/80 text-gray-800 hover:bg-white/90 border-0">
                  OK
                </Button>
              </div>
            ) : (
              <button
                onClick={() => { setPuppyNameInput(profile.puppy_name || ""); setNamingMode(true); }}
                className="text-white font-display font-bold text-sm bg-black/20 backdrop-blur-sm rounded-full px-3 py-0.5 hover:bg-black/30 transition-colors"
              >
                {puppyName}
              </button>
            )}
          </div>
        )}

        {/* Character */}
        <div className="h-24 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {hasHatched ? (
              <motion.div key="puppy" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                <PuppySprite isSad={isSad} />
              </motion.div>
            ) : (
              <motion.div key="box" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                <ShakingBox />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!hasHatched && (
          <p className="text-white/80 text-xs font-body mt-2 text-center px-4">
            Complete 1 ciclo no Modo Foco para chocar seu Study Puppy!
          </p>
        )}
      </div>

      {/* Stats & Care Buttons */}
      {hasHatched && (
        <div className="px-4 pb-4 relative z-10">
          {/* Bars */}
          <div className="space-y-1.5 mb-3">
            <StatBar label="🍗 Fome" value={hunger} color="hsl(var(--neon-orange))" />
            <StatBar label="💧 Sede" value={thirst} color="hsl(var(--neon-blue))" />
            <StatBar label="🧼 Higiene" value={hygiene} color="hsl(var(--neon-green))" />
          </div>

          {/* Care buttons */}
          <div className="grid grid-cols-3 gap-2">
            <CareButton emoji="🍗" label="Alimentar" cost={5} onClick={() => handleCare("hunger", 5)} disabled={hunger >= 100} />
            <CareButton emoji="💧" label="Água" cost={2} onClick={() => handleCare("thirst", 2)} disabled={thirst >= 100} />
            <CareButton emoji="🧼" label="Limpar" cost={5} onClick={() => handleCare("hygiene", 5)} disabled={hygiene >= 100} />
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-white/80 w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-black/30 overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-xs text-white/70 w-8 text-right tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}

function CareButton({ emoji, label, cost, onClick, disabled }: { emoji: string; label: string; cost: number; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl bg-white/15 backdrop-blur-sm hover:bg-white/25 active:bg-white/10 transition-all text-white disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-[10px] font-medium">{label}</span>
      <span className="text-[9px] opacity-70 flex items-center gap-0.5">
        <Coins className="w-2.5 h-2.5" /> {cost}
      </span>
    </button>
  );
}
