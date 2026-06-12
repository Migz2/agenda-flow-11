import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Notebook {
  id: string;
  user_id: string;
  title: string;
  category_id: string | null;
  folder_id: string | null;
  exam_content_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotebookSource {
  id: string;
  notebook_id: string;
  user_id: string;
  source_type: string;
  task_id: string | null;
  title: string;
  content: string;
  url: string;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  notebook_id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
}

export function useNotebooks() {
  const { user } = useAuth();
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNotebooks = useCallback(async () => {
    if (!user) { setNotebooks([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("notebooks")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    if (data) setNotebooks(data as unknown as Notebook[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchNotebooks(); }, [fetchNotebooks]);

  const addNotebook = async (title: string, categoryId?: string | null) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ user_id: user.id, title, category_id: categoryId || null } as any)
      .select()
      .single();
    if (!error && data) {
      await fetchNotebooks();
      return data as unknown as Notebook;
    }
    return null;
  };

  const addNotebookFull = async (payload: { title: string; category_id?: string | null; folder_id?: string | null; exam_content_id?: string | null }) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ user_id: user.id, ...payload } as any)
      .select()
      .single();
    if (!error && data) {
      await fetchNotebooks();
      return data as unknown as Notebook;
    }
    return null;
  };

  const updateNotebook = async (id: string, patch: Partial<Notebook>) => {
    setNotebooks(prev => prev.map(n => n.id === id ? { ...n, ...patch } as Notebook : n));
    await supabase.from("notebooks").update(patch as any).eq("id", id);
  };

  const deleteNotebook = async (id: string) => {
    await supabase.from("notebooks").delete().eq("id", id);
    setNotebooks(prev => prev.filter(n => n.id !== id));
  };

  return { notebooks, loading, addNotebook, addNotebookFull, updateNotebook, deleteNotebook, refetch: fetchNotebooks };
}

/* ========== Folders ========== */
export interface NotebookFolder { id: string; user_id: string; name: string; created_at: string; }

export function useNotebookFolders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<NotebookFolder[]>([]);

  const fetch = useCallback(async () => {
    if (!user) { setFolders([]); return; }
    const { data } = await (supabase as any).from("notebook_folders")
      .select("*").eq("user_id", user.id).order("created_at");
    if (data) setFolders(data as NotebookFolder[]);
  }, [user]);

  useEffect(() => { fetch(); }, [fetch]);

  const addFolder = async (name: string) => {
    if (!user) return null;
    const { data } = await (supabase as any).from("notebook_folders")
      .insert({ user_id: user.id, name }).select().single();
    if (data) { setFolders(prev => [...prev, data as NotebookFolder]); return data as NotebookFolder; }
    return null;
  };

  const renameFolder = async (id: string, name: string) => {
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
    await (supabase as any).from("notebook_folders").update({ name }).eq("id", id);
  };

  const deleteFolder = async (id: string) => {
    setFolders(prev => prev.filter(f => f.id !== id));
    await (supabase as any).from("notebook_folders").delete().eq("id", id);
  };

  return { folders, addFolder, renameFolder, deleteFolder, refetch: fetch };
}

export function useNotebookSources(notebookId: string | null) {
  const { user } = useAuth();
  const [sources, setSources] = useState<NotebookSource[]>([]);

  const fetchSources = useCallback(async () => {
    if (!user || !notebookId) { setSources([]); return; }
    const { data } = await supabase
      .from("notebook_sources")
      .select("*")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id)
      .order("created_at");
    if (data) setSources(data as unknown as NotebookSource[]);
  }, [user, notebookId]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const addSource = async (source: { title: string; content: string; source_type: string; task_id?: string | null; url?: string }) => {
    if (!user || !notebookId) return;
    await supabase.from("notebook_sources").insert({
      notebook_id: notebookId,
      user_id: user.id,
      ...source,
    } as any);
    await fetchSources();
  };

  const removeSource = async (id: string) => {
    await supabase.from("notebook_sources").delete().eq("id", id);
    setSources(prev => prev.filter(s => s.id !== id));
  };

  const syncTaskNotes = async (categoryId: string | null) => {
    if (!user || !notebookId || !categoryId) return;
    // Fetch tasks with this category that have descriptions
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, description, category")
      .eq("user_id", user.id)
      .eq("custom_category_id", categoryId);

    if (!tasks) return;

    // Get existing task_note sources
    const existingTaskIds = sources.filter(s => s.source_type === "task_note").map(s => s.task_id);

    const newSources = (tasks as any[])
      .filter(t => t.description && t.description.trim() && !existingTaskIds.includes(t.id))
      .map(t => ({
        notebook_id: notebookId,
        user_id: user.id,
        source_type: "task_note",
        task_id: t.id,
        title: t.title,
        content: t.description || "",
      }));

    if (newSources.length > 0) {
      await supabase.from("notebook_sources").insert(newSources as any);
      await fetchSources();
    }

    return newSources.length;
  };

  return { sources, addSource, removeSource, syncTaskNotes, refetch: fetchSources };
}

export function useChatMessages(notebookId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const fetchMessages = useCallback(async () => {
    if (!user || !notebookId) { setMessages([]); return; }
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("notebook_id", notebookId)
      .eq("user_id", user.id)
      .order("created_at");
    if (data) setMessages(data as unknown as ChatMessage[]);
  }, [user, notebookId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const addMessage = async (role: string, content: string) => {
    if (!user || !notebookId) return;
    const { data } = await supabase
      .from("chat_messages")
      .insert({ notebook_id: notebookId, user_id: user.id, role, content } as any)
      .select()
      .single();
    if (data) setMessages(prev => [...prev, data as unknown as ChatMessage]);
    return data as unknown as ChatMessage | null;
  };

  const updateLastAssistant = (content: string) => {
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last?.role === "assistant") {
        return prev.map((m, i) => i === prev.length - 1 ? { ...m, content } : m);
      }
      return [...prev, { id: crypto.randomUUID(), notebook_id: notebookId!, user_id: "", role: "assistant", content, created_at: new Date().toISOString() }];
    });
  };

  const clearMessages = async () => {
    if (!notebookId) return;
    await supabase.from("chat_messages").delete().eq("notebook_id", notebookId);
    setMessages([]);
  };

  return { messages, addMessage, updateLastAssistant, clearMessages, refetch: fetchMessages };
}
