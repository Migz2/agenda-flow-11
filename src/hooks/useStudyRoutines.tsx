import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface StudyRoutine {
  id: string;
  user_id: string;
  subject: string;
  category_id: string | null;
  batch_id: string | null;
  study_blocks: number;
  revisions: number;
  preparation: number;
  block_duration_min: number;
  start_date: string;
  priority: "low" | "medium" | "high";
  learning_type: "visual" | "reading" | "practice" | "mixed";
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NewRoutine {
  subject: string;
  category_id?: string | null;
  study_blocks: number;
  revisions: number;
  preparation: number;
  block_duration_min: number;
  start_date: string;
  priority: "low" | "medium" | "high";
  learning_type: "visual" | "reading" | "practice" | "mixed";
  days: number[]; // stored as part of generation logic, not in DB directly
}

export function useStudyRoutines() {
  const { user } = useAuth();
  const [routines, setRoutines] = useState<StudyRoutine[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoutines = useCallback(async () => {
    if (!user) { setRoutines([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("study_routines")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setRoutines(data as unknown as StudyRoutine[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchRoutines(); }, [fetchRoutines]);

  const addRoutine = async (routine: Omit<StudyRoutine, "id" | "user_id" | "created_at" | "updated_at" | "is_active">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("study_routines")
      .insert({
        user_id: user.id,
        ...routine,
      } as any)
      .select()
      .single();
    if (!error && data) {
      await fetchRoutines();
      return data as unknown as StudyRoutine;
    }
    return null;
  };

  const updateRoutine = async (id: string, updates: Partial<StudyRoutine>) => {
    const { error } = await supabase
      .from("study_routines")
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (!error) await fetchRoutines();
    return error;
  };

  const deleteRoutine = async (id: string) => {
    const routine = routines.find(r => r.id === id);
    if (routine?.batch_id) {
      // Delete all tasks linked to this batch
      await supabase.from("tasks").delete().eq("batch_id", routine.batch_id);
    }
    await supabase.from("study_routines").delete().eq("id", id);
    setRoutines(prev => prev.filter(r => r.id !== id));
  };

  const deleteFutureTasks = async (batchId: string) => {
    const now = new Date().toISOString();
    await supabase
      .from("tasks")
      .delete()
      .eq("batch_id", batchId)
      .gte("start_time", now)
      .eq("completed", false);
  };

  return { routines, loading, addRoutine, updateRoutine, deleteRoutine, deleteFutureTasks, refetch: fetchRoutines };
}
