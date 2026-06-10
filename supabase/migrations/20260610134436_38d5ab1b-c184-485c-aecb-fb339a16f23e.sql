ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_focus_seconds bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS study_days date[] NOT NULL DEFAULT '{}';