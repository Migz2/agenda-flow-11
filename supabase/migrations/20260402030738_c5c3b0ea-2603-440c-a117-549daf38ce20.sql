
-- Create priority enum
CREATE TYPE public.study_priority AS ENUM ('low', 'medium', 'high');

-- Create learning type enum  
CREATE TYPE public.learning_type AS ENUM ('visual', 'reading', 'practice', 'mixed');

-- Create study_routines table
CREATE TABLE public.study_routines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  category_id UUID REFERENCES public.custom_categories(id) ON DELETE SET NULL,
  batch_id TEXT,
  study_blocks INTEGER NOT NULL DEFAULT 2 CHECK (study_blocks >= 1 AND study_blocks <= 4),
  revisions INTEGER NOT NULL DEFAULT 3 CHECK (revisions >= 0 AND revisions <= 5),
  preparation INTEGER NOT NULL DEFAULT 1 CHECK (preparation >= 0 AND preparation <= 2),
  block_duration_min INTEGER NOT NULL DEFAULT 50,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  priority study_priority NOT NULL DEFAULT 'medium',
  learning_type learning_type NOT NULL DEFAULT 'mixed',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.study_routines ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own routines"
  ON public.study_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own routines"
  ON public.study_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own routines"
  ON public.study_routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own routines"
  ON public.study_routines FOR DELETE
  USING (auth.uid() = user_id);
