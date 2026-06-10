import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export const PRESETS = [
  { label: "25/5 (Clássico)", work: 25, rest: 5 },
  { label: "50/10 (Deep Work)", work: 50, rest: 10 },
];

const STORAGE_KEY = "focus_timer_v1";

interface PersistedState {
  targetEnd: number | null;
  preset: number;
  isBreak: boolean;
  selectedTaskId: string;
  isPaused: boolean;
  pausedRemaining: number | null;
  completed: boolean;
  stopwatchMode: boolean;
  stopwatchStart: number | null;
  stopwatchPausedElapsed: number | null;
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
  stopwatchSeconds: number;
  preset: number;
  stopwatchMode: boolean;
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
  changeStopwatchMode: (f: boolean) => void;
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
  const [stopwatchMode, setStopwatchMode] = useState(init.current?.stopwatchMode ?? false);
  const [selectedTaskId, setSelectedTaskId] = useState(init.current?.selectedTaskId ?? "");
  const [isBreak, setIsBreak] = useState(init.current?.isBreak ?? false);
  const [completed, setCompleted] = useState(init.current?.completed ?? false);
  const [isPaused, setIsPaused] = useState(init.current?.isPaused ?? true);
  const [targetEnd, setTargetEnd] = useState<number | null>(init.current?.targetEnd ?? null);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(init.current?.pausedRemaining ?? null);
  const [stopwatchStart, setStopwatchStart] = useState<number | null>(init.current?.stopwatchStart ?? null);
  const [stopwatchPausedElapsed, setStopwatchPausedElapsed] = useState<number | null>(init.current?.stopwatchPausedElapsed ?? null);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [justFinished, setJustFinished] = useState(false);
  const [breakJustFinished, setBreakJustFinished] = useState(false);

  const isRunning = !isPaused && !completed;
  const totalSeconds = isBreak ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60;

  // ---- Profile-side effects (study day + total focus seconds) ----
  const markStudyDay = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data: prof } = await supabase.from("profiles").select("study_days").eq("id", uid).single();
    const days: string[] = ((prof as any)?.study_days ?? []) as string[];
    if (days.includes(today)) return;
    await supabase.from("profiles").update({ study_days: [...days, today] } as any).eq("id", uid);
    window.dispatchEvent(new Event("profile:refresh"));
  }, []);

  const addFocusSeconds = useCallback(async (sec: number) => {
    if (sec <= 0) return;
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) return;
    const { data: prof } = await supabase.from("profiles").select("total_focus_seconds").eq("id", uid).single();
    const cur = Number((prof as any)?.total_focus_seconds ?? 0);
    await supabase.from("profiles").update({ total_focus_seconds: cur + Math.round(sec) } as any).eq("id", uid);
    window.dispatchEvent(new Event("profile:refresh"));
  }, []);

  // Persist
  useEffect(() => {
    persist({ targetEnd, preset, isBreak, selectedTaskId, isPaused, pausedRemaining, completed, stopwatchMode, stopwatchStart, stopwatchPausedElapsed });
  }, [targetEnd, preset, isBreak, selectedTaskId, isPaused, pausedRemaining, completed, stopwatchMode, stopwatchStart, stopwatchPausedElapsed]);

  // Tick
  useEffect(() => {
    const tick = () => {
      if (isPaused || completed) {
        if (pausedRemaining !== null) setSecondsLeft(Math.max(0, Math.round(pausedRemaining)));
        else if (!completed) setSecondsLeft(PRESETS[preset].work * 60);
        if (stopwatchPausedElapsed !== null) setStopwatchSeconds(Math.round(stopwatchPausedElapsed));
        else if (isPaused && !completed) setStopwatchSeconds(0);
        return;
      }
      if (stopwatchMode && !isBreak && stopwatchStart) {
        setStopwatchSeconds(Math.floor((Date.now() - stopwatchStart) / 1000));
      } else if (targetEnd) {
        const rem = (targetEnd - Date.now()) / 1000;
        if (rem <= 0) {
          setSecondsLeft(0);
          setIsPaused(true);
          setTargetEnd(null);
          if (!isBreak) {
            // Pomodoro work session completed — add full work duration
            addFocusSeconds(PRESETS[preset].work * 60);
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
  }, [isPaused, completed, stopwatchMode, isBreak, targetEnd, stopwatchStart, preset, pausedRemaining, stopwatchPausedElapsed, addFocusSeconds]);

  const start = useCallback(() => {
    // Mark today as studied as soon as the user starts (Pomodoro or Stopwatch)
    if (!isBreak) markStudyDay();
    if (stopwatchMode && !isBreak) {
      setStopwatchStart(stopwatchPausedElapsed != null ? Date.now() - stopwatchPausedElapsed * 1000 : Date.now());
    } else {
      const rem = pausedRemaining ?? (isBreak ? PRESETS[preset].rest * 60 : PRESETS[preset].work * 60);
      setTargetEnd(Date.now() + rem * 1000);
    }
    setIsPaused(false);
    setPausedRemaining(null);
    setStopwatchPausedElapsed(null);
  }, [stopwatchMode, isBreak, pausedRemaining, stopwatchPausedElapsed, preset, markStudyDay]);

  const pause = useCallback(() => {
    if (stopwatchMode && !isBreak && stopwatchStart) {
      setStopwatchPausedElapsed(Math.floor((Date.now() - stopwatchStart) / 1000));
      setStopwatchStart(null);
    } else if (targetEnd) {
      setPausedRemaining(Math.max(0, (targetEnd - Date.now()) / 1000));
      setTargetEnd(null);
    }
    setIsPaused(true);
  }, [stopwatchMode, isBreak, stopwatchStart, targetEnd]);

  const reset = useCallback(() => {
    setIsPaused(true);
    setTargetEnd(null);
    setStopwatchStart(null);
    setPausedRemaining(null);
    setStopwatchPausedElapsed(null);
    setCompleted(false);
    setIsBreak(false);
    setJustFinished(false);
    setBreakJustFinished(false);
    setStopwatchSeconds(0);
    setSecondsLeft(PRESETS[preset].work * 60);
  }, [preset]);

  const changePreset = useCallback((p: number) => {
    setPreset(p);
    setStopwatchMode(false);
    setIsPaused(true);
    setTargetEnd(null);
    setStopwatchStart(null);
    setPausedRemaining(null);
    setStopwatchPausedElapsed(null);
    setCompleted(false);
    setIsBreak(false);
    setJustFinished(false);
    setBreakJustFinished(false);
    setStopwatchSeconds(0);
    setSecondsLeft(PRESETS[p].work * 60);
  }, []);

  const changeStopwatchMode = useCallback((f: boolean) => {
    setStopwatchMode(f);
    if (f) {
      setIsPaused(true);
      setTargetEnd(null);
      setStopwatchStart(null);
      setPausedRemaining(null);
      setStopwatchPausedElapsed(null);
      setCompleted(false);
      setIsBreak(false);
      setStopwatchSeconds(0);
    }
  }, []);

  const markCompleted = useCallback(() => {
    // Compute elapsed focused seconds for stopwatch or pomodoro-in-progress and add to total
    let elapsed = 0;
    if (stopwatchMode && !isBreak) {
      elapsed = stopwatchStart ? Math.floor((Date.now() - stopwatchStart) / 1000) : (stopwatchPausedElapsed ?? 0);
    } else if (!isBreak && targetEnd) {
      const remaining = Math.max(0, (targetEnd - Date.now()) / 1000);
      elapsed = PRESETS[preset].work * 60 - remaining;
    } else if (!isBreak && pausedRemaining !== null) {
      elapsed = PRESETS[preset].work * 60 - pausedRemaining;
    }
    if (elapsed > 0) addFocusSeconds(elapsed);
    setCompleted(true);
    setIsPaused(true);
    setTargetEnd(null);
    setStopwatchStart(null);
    setJustFinished(true);
  }, [stopwatchMode, isBreak, stopwatchStart, stopwatchPausedElapsed, targetEnd, pausedRemaining, preset, addFocusSeconds]);

  const startBreak = useCallback(() => {
    setIsBreak(true);
    setCompleted(false);
    setJustFinished(false);
    setIsPaused(false);
    setPausedRemaining(null);
    setTargetEnd(Date.now() + PRESETS[preset].rest * 60 * 1000);
  }, [preset]);

  const progress = stopwatchMode && !isBreak
    ? Math.min(stopwatchSeconds / 3600, 1)
    : totalSeconds > 0 ? 1 - secondsLeft / totalSeconds : 0;

  return (
    <Ctx.Provider value={{
      isRunning, secondsLeft, stopwatchSeconds, preset, stopwatchMode, isBreak,
      completed, selectedTaskId, totalSeconds, progress, justFinished, breakJustFinished,
      start, pause, reset,
      changePreset, changeStopwatchMode,
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
