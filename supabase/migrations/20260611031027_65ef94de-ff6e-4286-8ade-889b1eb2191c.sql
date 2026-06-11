
-- Add notes + notebook link to exams
ALTER TABLE public.espcex_exams
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS notebook_id UUID REFERENCES public.notebooks(id) ON DELETE SET NULL;

-- Add hierarchical parent for sub-contents
ALTER TABLE public.espcex_contents
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.espcex_contents(id) ON DELETE CASCADE;

-- Quiz sessions: store each quiz run, optionally linked to an exam
CREATE TABLE IF NOT EXISTS public.quiz_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notebook_id UUID NOT NULL REFERENCES public.notebooks(id) ON DELETE CASCADE,
  exam_id UUID REFERENCES public.espcex_exams(id) ON DELETE SET NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quiz_sessions TO authenticated;
GRANT ALL ON public.quiz_sessions TO service_role;

ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their quiz sessions"
  ON public.quiz_sessions FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS quiz_sessions_notebook_idx ON public.quiz_sessions(notebook_id);
CREATE INDEX IF NOT EXISTS quiz_sessions_exam_idx ON public.quiz_sessions(exam_id);
CREATE INDEX IF NOT EXISTS espcex_contents_parent_idx ON public.espcex_contents(parent_id);
