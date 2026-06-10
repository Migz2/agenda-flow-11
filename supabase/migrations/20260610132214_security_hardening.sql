-- Lock down handle_new_user (trigger-only, should not be API-callable)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Re-target RLS policies from public to authenticated role
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname='public'
      AND tablename IN ('study_routines','notebooks','notebook_sources','chat_messages','espcex_exams','espcex_contents')
      AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated', r.policyname, r.tablename);
  END LOOP;
END $$;
