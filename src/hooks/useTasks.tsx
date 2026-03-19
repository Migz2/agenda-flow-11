import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface DbTask {
  id: string;
  user_id: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  is_all_day: boolean;
  category: string;
  recurrence: string;
  completed: boolean;
  icon: string;
  location: string;
  created_at: string;
  updated_at: string;
  custom_category_id: string | null;
  batch_id: string | null;
  hidden_from_planner: boolean;
}

export interface NewTask {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_all_day?: boolean;
  category: string;
  recurrence?: string;
  icon?: string;
  location?: string;
  custom_category_id?: string | null;
  batch_id?: string | null;
}

export interface CustomCategory {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface StudyGeneration {
  id: string;
  user_id: string;
  batch_id: string;
  label: string;
  task_count: number;
  created_at: string;
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
      category: task.category || "general",
      recurrence: task.recurrence || "none",
      icon: task.icon || "briefcase",
      location: task.location || "",
      custom_category_id: task.custom_category_id || null,
      batch_id: task.batch_id || null,
    } as any);
    if (!error) await fetchTasks();
    return error;
  };

  const addTasksBatch = async (tasksList: NewTask[]) => {
    if (!user || tasksList.length === 0) return;
    const rows = tasksList.map(task => ({
      user_id: user.id,
      title: task.title,
      description: task.description || "",
      start_time: task.start_time,
      end_time: task.end_time,
      is_all_day: task.is_all_day || false,
      category: task.category || "general",
      recurrence: task.recurrence || "none",
      icon: task.icon || "book",
      location: task.location || "",
      custom_category_id: task.custom_category_id || null,
      batch_id: task.batch_id || null,
    }));
    const { error } = await supabase.from("tasks").insert(rows as any);
    if (!error) await fetchTasks();
    return error;
  };

  const updateTask = async (taskId: string, task: Partial<NewTask>) => {
    const updateData: any = { updated_at: new Date().toISOString() };
    if (task.title !== undefined) updateData.title = task.title;
    if (task.description !== undefined) updateData.description = task.description;
    if (task.start_time !== undefined) updateData.start_time = task.start_time;
    if (task.end_time !== undefined) updateData.end_time = task.end_time;
    if (task.is_all_day !== undefined) updateData.is_all_day = task.is_all_day;
    if (task.category !== undefined) updateData.category = task.category;
    if (task.recurrence !== undefined) updateData.recurrence = task.recurrence;
    if (task.icon !== undefined) updateData.icon = task.icon;
    if (task.location !== undefined) updateData.location = task.location;
    if (task.custom_category_id !== undefined) updateData.custom_category_id = task.custom_category_id;

    const { error } = await supabase
      .from("tasks")
      .update(updateData)
      .eq("id", taskId);
    if (!error) await fetchTasks();
    return error;
  };

  const toggleComplete = async (taskId: string, completed: boolean) => {
    // Optimistic update
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
    const { error } = await supabase
      .from("tasks")
      .update({ completed, updated_at: new Date().toISOString() } as any)
      .eq("id", taskId);
    if (error) await fetchTasks(); // revert on error
  };

  const deleteTask = async (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    const { error } = await supabase.from("tasks").delete().eq("id", taskId);
    if (error) await fetchTasks();
  };

  const setHiddenFromPlanner = async (taskId: string, hidden: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, hidden_from_planner: hidden } : t));
    const { error } = await supabase
      .from("tasks")
      .update({ hidden_from_planner: hidden, updated_at: new Date().toISOString() } as any)
      .eq("id", taskId);
    if (error) await fetchTasks();
  };

  const deleteBatch = async (batchId: string) => {
    setTasks(prev => prev.filter(t => t.batch_id !== batchId));
    const { error } = await supabase.from("tasks").delete().eq("batch_id", batchId);
    if (error) await fetchTasks();
  };

  return { tasks, loading, addTask, addTasksBatch, updateTask, toggleComplete, deleteTask, deleteBatch, setHiddenFromPlanner, refetch: fetchTasks };
}

export function useAllTasks() {
  return useTasks();
}

export function useTodayTasks() {
  const today = new Date().toISOString().slice(0, 10);
  return useTasks(today);
}

export function useOverdueTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<DbTask[]>([]);

  const fetchOverdue = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", user.id)
      .eq("completed", false)
      .lt("start_time", `${today}T00:00:00`)
      .order("start_time", { ascending: false });
    if (data) setTasks(data as unknown as DbTask[]);
  }, [user]);

  useEffect(() => { fetchOverdue(); }, [fetchOverdue]);

  const toggleComplete = async (taskId: string) => {
    // Optimistic: remove from list immediately
    setTasks(prev => prev.filter(t => t.id !== taskId));
    await supabase
      .from("tasks")
      .update({ completed: true, updated_at: new Date().toISOString() } as any)
      .eq("id", taskId);
  };

  return { tasks, toggleComplete, refetch: fetchOverdue };
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

export function useCustomCategories() {
  const { user } = useAuth();
  const [categories, setCategories] = useState<CustomCategory[]>([]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("custom_categories")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (data) setCategories(data as unknown as CustomCategory[]);
  }, [user]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);

  const addCategory = async (name: string, color: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("custom_categories")
      .insert({ user_id: user.id, name, color } as any)
      .select()
      .single();
    if (!error && data) {
      await fetchCategories();
      return data as unknown as CustomCategory;
    }
    return null;
  };

  return { categories, addCategory, refetch: fetchCategories };
}

export function useStudyGenerations() {
  const { user } = useAuth();
  const [generations, setGenerations] = useState<StudyGeneration[]>([]);

  const fetchGenerations = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("study_generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setGenerations(data as unknown as StudyGeneration[]);
  }, [user]);

  useEffect(() => { fetchGenerations(); }, [fetchGenerations]);

  const addGeneration = async (batchId: string, label: string, taskCount: number) => {
    if (!user) return;
    await supabase.from("study_generations").insert({
      user_id: user.id,
      batch_id: batchId,
      label,
      task_count: taskCount,
    } as any);
    await fetchGenerations();
  };

  const deleteGeneration = async (id: string, batchId: string) => {
    // Delete all tasks with this batch_id
    await supabase.from("tasks").delete().eq("batch_id", batchId).eq("user_id", user!.id);
    // Delete the generation record
    await supabase.from("study_generations").delete().eq("id", id);
    setGenerations(prev => prev.filter(g => g.id !== id));
  };

  return { generations, addGeneration, deleteGeneration, refetch: fetchGenerations };
}
