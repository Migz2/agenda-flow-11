import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import type { CategoryId } from "@/lib/taskData";

export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  category: CategoryId;
  recurrence: string;
  completed: boolean;
  icon: string;
  location: string;
  created_at: string;
  updated_at: string;
}

export interface NewTask {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  category: CategoryId;
  recurrence?: string;
  icon?: string;
  location?: string;
}

export function useTasks(dateFilter?: string) {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    if (!user) { setTasks([]); setLoading(false); return; }
    setLoading(true);

    let query = supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("start_time", { ascending: true });

    if (dateFilter) {
      const dayStart = `${dateFilter}T00:00:00`;
      const dayEnd = `${dateFilter}T23:59:59`;
      query = query.gte("start_time", dayStart).lte("start_time", dayEnd);
    }

    const { data, error } = await query;
    if (!error && data) {
      setTasks(data as unknown as DbTask[]);
    }
    setLoading(false);
  }, [user, dateFilter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (task: NewTask) => {
    if (!user) return;
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title: task.title,
      description: task.description || "",
      start_time: task.start_time,
      end_time: task.end_time,
      is_all_day: task.is_all_day || false,
      category: task.category,
      recurrence: task.recurrence || "none",
      icon: task.icon || "briefcase",
      location: task.location || "",
    } as any);
    if (!error) await fetchTasks();
    return error;
  };

  const toggleComplete = async (taskId: string, completed: boolean) => {
    const { error } = await supabase
      .from("tasks")
      .update({ completed, updated_at: new Date().toISOString() } as any)
      .eq("id", taskId);
    if (!error) await fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (!error) await fetchTasks();
  };

  return { tasks, loading, addTask, toggleComplete, deleteTask, refetch: fetchTasks };
}

export function useAllTasks() {
  return useTasks();
}

export function useTodayTasks() {
  const today = new Date().toISOString().slice(0, 10);
  return useTasks(today);
}

export function useCompletedTasksHistory() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("updated_at", { ascending: false });
      if (data) setTasks(data as unknown as DbTask[]);
    };
    fetch();
  }, [user]);

  return tasks;
}
