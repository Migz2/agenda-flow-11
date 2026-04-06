import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

export const PRESETS = [
  { label: "25/5 (Clássico)", work: 25, rest: 5 },
  { label: "50/10 (Deep Work)", work: 50, rest: 10 },
];

const STORAGE_KEY = "focus_timer_v1";

interface PersistedState {
  targetEnd: number | null;
  flowStart: number | null;
  preset: number;
  flowMode: boolean;
  isBreak: boolean;
  selectedTaskId: string;
  isPaused: boolean;
  pausedRemaining: number | null;
  pausedFlowElapsed: number | null;
  completed: boolean;
}

function load(): PersistedState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persist(s: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

interface TimerCtx {
  isRunning: boolean;
  secondsLeft: number;
  flowSeconds: number;
  preset: number;
  flowMode: boolean;
  isBreak: boolean;
  completed: boolean;
  selectedTaskId: string;
  totalSeconds: number;
  progress: number;
  justFinished: boolean;
  breakJustFinished: boolean;

  start: () => void;
  pause: () => void;
  reset: () => void;
  changePreset: (p: number) => void;
  changeFlowMode: (f: boolean) => void;
  changeSelectedTask: (id: string) => void;
  markCompleted: () => void;
  startBreak: () => void;
  clearFinished: () => void;
  clearBreakFinished: () => void;
}

const Ctx = createContext<TimerCtx | null>(null);

export function FocusTimerProvider({ children }: { children: ReactNode }) {
  const init = useRef(load());

  const [preset, setPreset] = useState(init.current?.preset ?? 0);
  const [flowMode, setFlowMode] = useState(init.current?.flowMode ?? false);
  const [selectedTaskId, setSelectedTaskId] = useState(init.current?.selectedTaskId ?? "");
  const [isBreak, setIsBreak] = useState(init.current?.isBreak ?? false);
  const [completed, setCompleted] = useState(init.current?.completed ?? false);
  const [isPaused, setIsPaused] = useState(init.current?.isPaused ?? true);
  const [targetEnd, setTargetEnd] = useState<number | null>(init.current?.targetEnd ?? null);
  const [flowStart, setFlowStart] = useState<number | null>(init.current?.flowStart ?? null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(init.current?.pausedRemaining ?? null);
  const [pausedFlowElapsed, setPausedFlowElapsed] = useState<number | null>(init.current?.pausedFlowElapsed ?? null);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [flowSeconds, setFlowSeconds] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [breakJustFinished, setBreakJustFinished] = useState(false);

  const isRunning = !isPaused && !completed;
  const totalSeconds = isBreak ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60;

  // Persist
  useEffect(() => {
    persist({ targetEnd, flowStart, preset, flowMode, isBreak, selectedTaskId, isPaused, pausedRemaining, pausedFlowElapsed, completed });
  }, [targetEnd, flowStart, preset, flowMode, isBreak, selectedTaskId, isPaused, pausedRemaining, pausedFlowElapsed, completed]);

  // Tick
  useEffect(() => {
    const tick = () => {
      if (isPaused || completed) {
        if (pausedRemaining !== null) setSecondsLeft(Math.max(0, Math.round(pausedRemaining)));
        else if (!completed) setSecondsLeft(PRESETS[preset].work * 60);
        if (pausedFlowElapsed !== null) setFlowSeconds(Math.round(pausedFlowElapsed));
        else if (isPaused && !completed) setFlowSeconds(0);
        return;
      }
      if (flowMode && !isBreak && flowStart) {
        setFlowSeconds(Math.floor((Date.now() - flowStart) / 1000));
      } else if (targetEnd) {
        const rem = (targetEnd - Date.now()) / 1000;
        if (rem <= 0) {
          setSecondsLeft(0);
          setIsPaused(true);
          setTargetEnd(null);
          if (!isBreak) {
            setCompleted(true);
            setJustFinished(true);
          } else {
            setIsBreak(false);
            setPausedRemaining(null);
            setBreakJustFinished(true);
          }
          return;
        }
        setSecondsLeft(Math.ceil(rem));
      }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [isPaused, completed, flowMode, isBreak, targetEnd, flowStart, preset, pausedRemaining, pausedFlowElapsed]);

  const start = useCallback(() => {
    if (flowMode && !isBreak) {
      setFlowStart(pausedFlowElapsed != null ? Date.now() - pausedFlowElapsed * 1000 : Date.now());
    } else {
      const rem = pausedRemaining ?? (isBreak ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60);
      setTargetEnd(Date.now() + rem * 1000);
    }
    setIsPaused(false);
    setPausedRemaining(null);
    setPausedFlowElapsed(null);
  }, [flowMode, isBreak, pausedFlowElapsed, pausedRemaining, preset]);

  const pause = useCallback(() => {
    if (flowMode && !isBreak && flowStart) {
      setPausedFlowElapsed(Math.floor((Date.now() - flowStart) / 1000));
      setFlowStart(null);
    } else if (targetEnd) {
      setPausedRemaining(Math.max(0, (targetEnd - Date.now()) / 1000));
      setTargetEnd(null);
    }
    setIsPaused(true);
  }, [flowMode, isBreak, flowStart, targetEnd]);

  const reset = useCallback(() => {
    setIsPaused(true);
    setTargetEnd(null);
    setFlowStart(null);
    setPausedRemaining(null);
    setPausedFlowElapsed(null);
    setCompleted(false);
    setIsBreak(false);
    setJustFinished(false);
    setBreakJustFinished(false);
    setFlowSeconds(0);
    setSecondsLeft(PRESETS[preset].work * 60);
  }, [preset]);

  const changePreset = useCallback((p: number) => {
    setPreset(p);
    setFlowMode(false);
    setIsPaused(true);
    setTargetEnd(null);
    setFlowStart(null);
    setPausedRemaining(null);
    setPausedFlowElapsed(null);
    setCompleted(false);
    setIsBreak(false);
    setJustFinished(false);
    setBreakJustFinished(false);
    setFlowSeconds(0);
    setSecondsLeft(PRESETS[p].work * 60);
  }, []);

  const changeFlowMode = useCallback((f: boolean) => {
    setFlowMode(f);
    if (f) {
      setIsPaused(true);
      setTargetEnd(null);
      setPausedRemaining(null);
      setPausedFlowElapsed(null);
      setCompleted(false);
      setIsBreak(false);
      setFlowSeconds(0);
    }
  }, []);

  const markCompleted = useCallback(() => {
    setCompleted(true);
    setIsPaused(true);
    setTargetEnd(null);
    setFlowStart(null);
    setJustFinished(true);
  }, []);

  const startBreak = useCallback(() => {
    setIsBreak(true);
    setCompleted(false);
    setJustFinished(false);
    setIsPaused(false);
    setFlowStart(null);
    setPausedRemaining(null);
    setPausedFlowElapsed(null);
    setTargetEnd(Date.now() + PRESETS[preset].rest * 60 * 1000);
  }, [preset]);

  const progress = flowMode && !isBreak
    ? Math.min(flowSeconds / 3600, 1)
    : totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  return (
    <Ctx.Provider value={{
      isRunning, secondsLeft, flowSeconds, preset, flowMode, isBreak,
      completed, selectedTaskId, totalSeconds, progress, justFinished, breakJustFinished,
      start, pause, reset,
      changePreset, changeFlowMode,
      changeSelectedTask: setSelectedTaskId,
      markCompleted, startBreak,
      clearFinished: () => setJustFinished(false),
      clearBreakFinished: () => setBreakJustFinished(false),
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFocusTimer() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFocusTimer must be used within FocusTimerProvider");
  return ctx;
}
