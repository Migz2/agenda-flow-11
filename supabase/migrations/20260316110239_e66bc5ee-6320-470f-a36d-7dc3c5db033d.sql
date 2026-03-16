
-- Change category column from enum to text to allow fully custom categories
ALTER TABLE public.tasks ALTER COLUMN category TYPE text USING category::text;
ALTER TABLE public.tasks ALTER COLUMN category SET DEFAULT 'general';

-- Drop the enum type since we no longer need it
DROP TYPE IF EXISTS public.task_category;
