-- =============================================
-- 003_fix_handle_new_user.sql
-- Run this in your Supabase Project -> SQL Editor
-- to fix: "Database error saving new user"
-- =============================================

-- 1. Ensure permissions on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role, postgres;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role, postgres;

-- 2. Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Create or replace the handle_new_user function with:
--    - Explicit schema qualification (public.profiles, public.app_role, public.account_status)
--    - search_path explicitly set to public, auth
--    - Safe handling for missing metadata or email
--    - ON CONFLICT clause to prevent unique key violation
--    - EXCEPTION block so user registration in auth.users is never aborted
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_full_name TEXT;
BEGIN
  -- Safe extraction of full_name
  user_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'New Member'
  );

  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    role,
    status
  )
  VALUES (
    NEW.id,
    user_full_name,
    COALESCE(NEW.email, ''),
    'member'::public.app_role,
    'active'::public.account_status
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log warning so issue is observable in Postgres logs without breaking signup
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Re-attach the trigger to auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;
