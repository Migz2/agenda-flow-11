
-- ============ Folders for notebooks ============
CREATE TABLE IF NOT EXISTS public.notebook_folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebook_folders TO authenticated;
GRANT ALL ON public.notebook_folders TO service_role;

ALTER TABLE public.notebook_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their folders"
  ON public.notebook_folders FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============ Notebooks: folder + granular content link ============
ALTER TABLE public.notebooks
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES public.notebook_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS exam_content_id UUID REFERENCES public.espcex_contents(id) ON DELETE SET NULL;

-- ============ Quiz sessions: review payload ============
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS questions JSONB,
  ADD COLUMN IF NOT EXISTS answers JSONB,
  ADD COLUMN IF NOT EXISTS difficulty TEXT,
  ADD COLUMN IF NOT EXISTS content_id UUID REFERENCES public.espcex_contents(id) ON DELETE SET NULL;

-- ============ Re-scope RLS policies from public → authenticated ============
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'notebooks','notebook_sources','chat_messages','study_routines',
        'espcex_exams','espcex_contents'
      )
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;
