import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  chronotype: string | null;
  conscientiousness: string | null;
  neuroticism: string | null;
  puppy_name: string | null;
  has_hatched: boolean;
  study_coins: number;
  puppy_hunger: number;
  puppy_thirst: number;
  puppy_hygiene: number;
  last_decay_update: string | null;
  total_focus_seconds: number;
  study_days: string[];
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) setProfile(data as unknown as UserProfile);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  useEffect(() => {
    const handler = () => fetchProfile();
    window.addEventListener("profile:refresh", handler);
    return () => window.removeEventListener("profile:refresh", handler);
  }, [fetchProfile]);

  const updateProfile = async (updates: Partial<Omit<UserProfile, "id">>) => {
    if (!user) return;
    await supabase.from("profiles").update(updates as any).eq("id", user.id);
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  };

  const needsOnboarding = profile && !profile.chronotype;

  return { profile, loading, updateProfile, needsOnboarding, refetch: fetchProfile };
}
