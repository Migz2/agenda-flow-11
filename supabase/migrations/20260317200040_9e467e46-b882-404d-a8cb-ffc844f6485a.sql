
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS batch_id TEXT;

CREATE TABLE public.study_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  batch_id TEXT NOT NULL,
  label TEXT NOT NULL,
  task_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.study_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations" ON public.study_generations FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own generations" ON public.study_generations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own generations" ON public.study_generations FOR DELETE TO authenticated USING (auth.uid() = user_id);
