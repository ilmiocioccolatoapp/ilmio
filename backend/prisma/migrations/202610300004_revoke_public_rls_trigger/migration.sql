BEGIN;

-- Supabase's optional public.rls_auto_enable() event-trigger helper is
-- SECURITY DEFINER. Keep the event trigger installed, but remove its Data API
-- callable surface when that helper exists on this database.
DO $$
DECLARE role_name TEXT;
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    EXECUTE 'REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC';
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = role_name) THEN
        EXECUTE format('REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM %I', role_name);
      END IF;
    END LOOP;
  END IF;
END $$;

COMMIT;
