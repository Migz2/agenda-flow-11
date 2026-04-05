
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS puppy_name text DEFAULT '',
  ADD COLUMN IF NOT EXISTS has_hatched boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS study_coins integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS puppy_hunger integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS puppy_thirst integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS puppy_hygiene integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS last_decay_update timestamp with time zone DEFAULT now();
