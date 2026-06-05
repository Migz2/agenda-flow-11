
CREATE TABLE public.espcex_exams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  exam_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.espcex_exams TO authenticated;
GRANT ALL ON public.espcex_exams TO service_role;
ALTER TABLE public.espcex_exams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own exams" ON public.espcex_exams FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.espcex_contents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exam_id UUID NOT NULL REFERENCES public.espcex_exams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 0,
  correct INTEGER NOT NULL DEFAULT 0,
  wrong INTEGER NOT NULL DEFAULT 0,
  post_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.espcex_contents TO authenticated;
GRANT ALL ON public.espcex_contents TO service_role;
ALTER TABLE public.espcex_contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own contents" ON public.espcex_contents FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
