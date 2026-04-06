import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useProfile } from "@/hooks/useProfile";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import ReactPlayer from "react-player";

const DECAY_RATE = 3;

const VIDEO_URLS = {
  idle: "https://youtu.be/BzQVAP3S-sM",
  eating: "https://youtu.be/Pi69l2pL4Oc",
  drinking: "https://youtu.be/YXziYVcGpp0",
};

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

// Deterministic grass tile colors
const TILE_COLORS = Array.from({ length: 64 }, (_, i) => {
  const hue = 100 + (i * 7) % 30;
  const sat = 45 + (i * 13) % 25;
  const light = 32 + (i * 11) % 18;
  return `hsl(${hue}, ${sat}%, ${light}%)`;
});

function IsometricGround() {
  return (
    <div className="relative flex items-center justify-center" style={{ perspective: "600px" }}>
      <div
        className="relative"
        style={{
          width: 220,
          height: 220,
          transform: "rotateX(60deg) rotateZ(-45deg)",
          transformStyle: "preserve-3d",
        }}
      >
        {/* Top grass surface */}
        <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-[1px] rounded-lg overflow-hidden">
          {TILE_COLORS.map((color, i) => (
            <div
              key={i}
              className="rounded-[2px]"
              style={{
                backgroundColor: color,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
        {/* Side panels for 3D effect */}
        <div
          className="absolute left-0 bottom-0 w-full"
          style={{
            height: 30,
            transform: "rotateX(-90deg) translateZ(0px)",
            transformOrigin: "bottom",
            background: "linear-gradient(180deg, hsl(30, 40%, 28%), hsl(25, 35%, 20%))",
            borderRadius: "0 0 4px 4px",
          }}
        />
        <div
          className="absolute right-0 top-0 h-full"
          style={{
            width: 30,
            transform: "rotateY(90deg) translateZ(0px)",
            transformOrigin: "right",
            background: "linear-gradient(90deg, hsl(30, 35%, 25%), hsl(25, 30%, 18%))",
            borderRadius: "0 4px 4px 0",
          }}
        />
        {/* Small decorative elements */}
        <div className="absolute" style={{ top: "10%", left: "15%", fontSize: 14, transform: "rotateZ(45deg) rotateX(-60deg)" }}>🌳</div>
        <div className="absolute" style={{ top: "70%", left: "75%", fontSize: 12, transform: "rotateZ(45deg) rotateX(-60deg)" }}>🌿</div>
        <div className="absolute" style={{ top: "20%", left: "70%", fontSize: 10, transform: "rotateZ(45deg) rotateX(-60deg)" }}>🌸</div>
        <div className="absolute" style={{ top: "65%", left: "20%", fontSize: 12, transform: "rotateZ(45deg) rotateX(-60deg)" }}>🌻</div>
      </div>
    </div>
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
  const [videoState, setVideoState] = useState<"idle" | "eating" | "drinking">("idle");

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
    if (type === "hunger") { updates.puppy_hunger = 100; setVideoState("eating"); }
    if (type === "thirst") { updates.puppy_thirst = 100; setVideoState("drinking"); }
    if (type === "hygiene") updates.puppy_hygiene = 100;
    await updateProfile(updates);
    toast({ title: "Cuidado realizado! 🐾", description: "Seu puppy está mais feliz!" });
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
  const hasSetName = !!profile.puppy_name && profile.puppy_name.trim() !== "";

  const currentVideoUrl = VIDEO_URLS[videoState];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl overflow-hidden neu-flat border border-border/20"
      style={{ minHeight: 340 }}
    >
      {/* Coins HUD */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-3 py-1.5">
        <Coins className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-bold text-white tabular-nums">{profile.study_coins}</span>
      </div>

      {showConfetti && <ConfettiOverlay onDone={() => setShowConfetti(false)} />}

      {/* Habitat area */}
      <div className="relative bg-gradient-to-b from-sky-300 via-sky-200 to-emerald-100 dark:from-sky-900 dark:via-sky-800 dark:to-emerald-900 pt-4 pb-6">
        {/* Name */}
        {hasHatched && (
          <div className="flex justify-center mb-3 relative z-10">
            {hasSetName ? (
              <span className="text-white font-display font-bold text-sm bg-black/20 backdrop-blur-sm rounded-full px-3 py-0.5">
                {puppyName}
              </span>
            ) : namingMode ? (
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
                onClick={() => { setPuppyNameInput(""); setNamingMode(true); }}
                className="text-white font-display font-bold text-sm bg-black/20 backdrop-blur-sm rounded-full px-3 py-0.5 hover:bg-black/30 transition-colors"
              >
                ✏️ Dê um nome
              </button>
            )}
          </div>
        )}

        {/* Isometric ground + character */}
        <div className="relative flex flex-col items-center">
          <IsometricGround />

          {/* Character overlay */}
          <div className="absolute inset-0 flex items-center justify-center z-10" style={{ marginTop: "-20px" }}>
            <AnimatePresence mode="wait">
              {hasHatched ? (
                <motion.div
                  key="video"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" }}
                  className="rounded-xl overflow-hidden shadow-lg"
                  style={{ width: 140, height: 140 }}
                >
                  <ReactPlayer
                    src={currentVideoUrl}
                    playing
                    loop={videoState === "idle"}
                    muted
                    width="100%"
                    height="100%"
                    controls={false}
                    onEnded={() => {
                      if (videoState !== "idle") setVideoState("idle");
                    }}
                    style={{ pointerEvents: "none" }}
                  />
                </motion.div>
              ) : (
                <motion.div key="box" initial={{ scale: 0.8 }} animate={{ scale: 1 }}>
                  <ShakingBox />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {!hasHatched && (
          <p className="text-center text-white/80 text-xs font-body mt-2 px-4 relative z-10">
            Complete 1 ciclo no Modo Foco para chocar seu Study Puppy!
          </p>
        )}
      </div>

      {/* Stats & Care Buttons */}
      {hasHatched && (
        <div className="px-4 py-4 bg-card">
          <div className="space-y-2 mb-3">
            <StatBar label="🍗 Fome" value={hunger} color="hsl(var(--neon-orange))" />
            <StatBar label="💧 Sede" value={thirst} color="hsl(var(--neon-blue))" />
            <StatBar label="🧼 Higiene" value={hygiene} color="hsl(var(--neon-green))" />
          </div>

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
      <span className="text-xs text-muted-foreground w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={false}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
      <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">{Math.round(value)}%</span>
    </div>
  );
}

function CareButton({ emoji, label, cost, onClick, disabled }: { emoji: string; label: string; cost: number; onClick: () => void; disabled: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center gap-0.5 py-2 px-1 rounded-xl neu-btn hover:bg-secondary active:bg-muted transition-all text-foreground disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <span className="text-lg">{emoji}</span>
      <span className="text-[10px] font-medium">{label}</span>
      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
        <Coins className="w-2.5 h-2.5" /> {cost}
      </span>
    </button>
  );
}
