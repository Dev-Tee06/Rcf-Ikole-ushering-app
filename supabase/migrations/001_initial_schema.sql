-- =============================================
-- 001_initial_schema.sql
-- RCF Ikole Ushering Unit Management Platform
-- Initial database schema for Supabase/PostgreSQL
-- =============================================

-- =============================================
-- EXTENSIONS
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================
-- UPDATED_AT TRIGGER FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- =============================================
-- ENUM TYPES
-- =============================================

-- app_roles enum
CREATE TYPE app_role AS ENUM ('member', 'team_leader', 'admin');

-- account_status enum
CREATE TYPE account_status AS ENUM ('active', 'suspended', 'deactivated');

-- service_type enum
CREATE TYPE service_type AS ENUM ('tuesday', 'thursday', 'friday', 'sunday');

-- attendance_status enum
CREATE TYPE attendance_status AS ENUM ('not_marked', 'present', 'absent', 'excused');

-- accountability_task_type enum
CREATE TYPE accountability_task_type AS ENUM ('prayer', 'bible_study');

-- accountability_status enum
CREATE TYPE accountability_status AS ENUM ('upcoming', 'in_progress', 'ready', 'completed', 'missed');

-- content_publication_status enum
CREATE TYPE content_publication_status AS ENUM ('draft', 'published', 'archived');

-- =============================================
-- TABLES
-- =============================================

-- 1. profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'member',
  status account_status NOT NULL DEFAULT 'active',
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);
CREATE INDEX idx_profiles_email ON profiles(email);

-- 2. standing_roles table
CREATE TABLE standing_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_single_occupancy BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_standing_roles_updated_at
  BEFORE UPDATE ON standing_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. standing_role_assignments table
CREATE TABLE standing_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  standing_role_id UUID NOT NULL REFERENCES standing_roles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

CREATE INDEX idx_standing_role_assignments_member ON standing_role_assignments(member_id);
CREATE INDEX idx_standing_role_assignments_role ON standing_role_assignments(standing_role_id);
CREATE INDEX idx_standing_role_assignments_active ON standing_role_assignments(is_active);
-- Duplicate active single-occupancy role assignments are enforced via trigger/application logic

-- 4. services table (recurring service definitions)
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type service_type NOT NULL UNIQUE,
  name TEXT NOT NULL,
  day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
  start_time TIME NOT NULL, -- stored as Africa/Lagos local time
  end_time TIME NOT NULL,
  absence_deadline_hours DECIMAL(4,2) NOT NULL DEFAULT 2.0, -- hours after end_time
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5. service_occurrences table
CREATE TABLE service_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_type service_type NOT NULL,
  occurrence_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  absence_deadline TIMESTAMPTZ NOT NULL, -- computed server-side
  notes TEXT,
  roster_published BOOLEAN NOT NULL DEFAULT FALSE,
  roster_published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_service_occurrences_updated_at
  BEFORE UPDATE ON service_occurrences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX idx_service_occurrences_unique ON service_occurrences(service_id, occurrence_date);
CREATE INDEX idx_service_occurrences_date ON service_occurrences(occurrence_date);
CREATE INDEX idx_service_occurrences_type ON service_occurrences(service_type);
CREATE INDEX idx_service_occurrences_deadline ON service_occurrences(absence_deadline);

-- 6. duty_posts table
CREATE TABLE duty_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type service_type NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_duty_posts_unique ON duty_posts(service_type, name);
CREATE INDEX idx_duty_posts_service_type ON duty_posts(service_type);

-- 7. duty_assignments table
CREATE TABLE duty_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_occurrence_id UUID NOT NULL REFERENCES service_occurrences(id) ON DELETE RESTRICT,
  duty_post_id UUID NOT NULL REFERENCES duty_posts(id) ON DELETE RESTRICT,
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_duty_assignments_updated_at
  BEFORE UPDATE ON duty_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- One person per post per service occurrence
CREATE UNIQUE INDEX idx_duty_assignments_post ON duty_assignments(service_occurrence_id, duty_post_id);
-- A member cannot be assigned two posts in the same service occurrence
CREATE UNIQUE INDEX idx_duty_assignments_member ON duty_assignments(service_occurrence_id, member_id);
CREATE INDEX idx_duty_assignments_member_id ON duty_assignments(member_id);
CREATE INDEX idx_duty_assignments_occurrence ON duty_assignments(service_occurrence_id);

-- 8. attendance_records table
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  service_occurrence_id UUID NOT NULL REFERENCES service_occurrences(id) ON DELETE RESTRICT,
  status attendance_status NOT NULL DEFAULT 'not_marked',
  marked_present_at TIMESTAMPTZ,
  marked_by UUID REFERENCES profiles(id) ON DELETE SET NULL, -- for admin corrections
  correction_reason TEXT,
  original_status attendance_status,
  excused_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_attendance_records_updated_at
  BEFORE UPDATE ON attendance_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX idx_attendance_records_unique ON attendance_records(member_id, service_occurrence_id);
CREATE INDEX idx_attendance_records_member ON attendance_records(member_id);
CREATE INDEX idx_attendance_records_occurrence ON attendance_records(service_occurrence_id);
CREATE INDEX idx_attendance_records_status ON attendance_records(status);

-- 9. accountability_schedules table (daily recurring)
CREATE TABLE accountability_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  task_type accountability_task_type NOT NULL,
  start_time TIME NOT NULL, -- Africa/Lagos local time
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (15, 30, 45, 60, 90, 120)),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_accountability_schedules_updated_at
  BEFORE UPDATE ON accountability_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- One active schedule per task type per member
CREATE UNIQUE INDEX idx_accountability_schedules_unique
  ON accountability_schedules(member_id, task_type)
  WHERE is_active = TRUE;

CREATE INDEX idx_accountability_schedules_member ON accountability_schedules(member_id);

-- 10. accountability_completions table
CREATE TABLE accountability_completions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  schedule_id UUID NOT NULL REFERENCES accountability_schedules(id) ON DELETE RESTRICT,
  task_type accountability_task_type NOT NULL,
  accountability_date DATE NOT NULL, -- Africa/Lagos date
  scheduled_start TIME NOT NULL,
  duration_minutes INTEGER NOT NULL,
  completion_window_start TIMESTAMPTZ NOT NULL, -- when complete button becomes available
  completion_window_end TIMESTAMPTZ NOT NULL,   -- when complete button expires
  completed_at TIMESTAMPTZ,                      -- null if missed
  status accountability_status NOT NULL DEFAULT 'upcoming',
  bible_book TEXT,            -- for bible_study tasks
  bible_start_chapter INTEGER,
  bible_start_verse INTEGER,
  bible_end_chapter INTEGER,
  bible_end_verse INTEGER,
  bible_reference_text TEXT,  -- formatted string e.g. "John 3:1-16"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_accountability_completions_updated_at
  BEFORE UPDATE ON accountability_completions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE UNIQUE INDEX idx_accountability_completions_unique
  ON accountability_completions(member_id, schedule_id, accountability_date);
CREATE INDEX idx_accountability_completions_member ON accountability_completions(member_id);
CREATE INDEX idx_accountability_completions_date ON accountability_completions(accountability_date);
CREATE INDEX idx_accountability_completions_status ON accountability_completions(status);
CREATE INDEX idx_accountability_completions_window ON accountability_completions(completion_window_end);

-- 11. dress_codes table
CREATE TABLE dress_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  applicable_sunday DATE NOT NULL,
  instructions TEXT NOT NULL,
  image_url TEXT,
  status content_publication_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_dress_codes_updated_at
  BEFORE UPDATE ON dress_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_dress_codes_status ON dress_codes(status);
CREATE INDEX idx_dress_codes_sunday ON dress_codes(applicable_sunday);

-- 12. sermons table
CREATE TABLE sermons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  preacher TEXT NOT NULL,
  description TEXT,
  spotify_url TEXT NOT NULL,
  cover_image_url TEXT,
  relevant_week DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT FALSE,
  status content_publication_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_sermons_updated_at
  BEFORE UPDATE ON sermons
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_sermons_status ON sermons(status);
CREATE INDEX idx_sermons_current ON sermons(is_current) WHERE is_current = TRUE;

-- 13. announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status content_publication_status NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_announcements_status ON announcements(status);

-- 14. content_settings table (key-value for editable public content)
CREATE TABLE content_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 15. audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT,    -- denormalized for historical record
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  before_value JSONB,
  after_value JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs(target_table, target_id);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE standing_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE standing_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE accountability_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE dress_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sermons ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS HELPER FUNCTIONS
-- =============================================

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS app_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper function: is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- =============================================
-- RLS POLICIES
-- =============================================

-- profiles
CREATE POLICY "members_read_own_profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "admins_read_all_profiles"
  ON profiles FOR SELECT
  USING (is_admin());

CREATE POLICY "members_update_own_profile"
  ON profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "admins_update_any_profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Inserts are handled by the handle_new_user trigger via the service role
CREATE POLICY "service_role_insert"
  ON profiles FOR INSERT
  WITH CHECK (TRUE);

-- standing_roles (all authenticated users can read, only admins can write)
CREATE POLICY "authenticated_read_standing_roles"
  ON standing_roles FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_write_standing_roles"
  ON standing_roles FOR ALL
  USING (is_admin());

-- standing_role_assignments
CREATE POLICY "authenticated_read_assignments"
  ON standing_role_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_write_assignments"
  ON standing_role_assignments FOR ALL
  USING (is_admin());

-- services (public read for authenticated, admin write)
CREATE POLICY "authenticated_read_services"
  ON services FOR SELECT
  USING (TRUE);

CREATE POLICY "admin_write_services"
  ON services FOR ALL
  USING (is_admin());

-- service_occurrences
CREATE POLICY "authenticated_read_occurrences"
  ON service_occurrences FOR SELECT
  USING (TRUE);

CREATE POLICY "admin_write_occurrences"
  ON service_occurrences FOR ALL
  USING (is_admin());

-- duty_posts
CREATE POLICY "all_read_duty_posts"
  ON duty_posts FOR SELECT
  USING (TRUE);

CREATE POLICY "admin_write_duty_posts"
  ON duty_posts FOR ALL
  USING (is_admin());

-- duty_assignments (all authenticated users can read full roster, admin write)
CREATE POLICY "authenticated_read_duty_assignments"
  ON duty_assignments FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "admin_write_duty_assignments"
  ON duty_assignments FOR ALL
  USING (is_admin());

-- attendance_records
CREATE POLICY "members_read_own_attendance"
  ON attendance_records FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "admins_read_all_attendance"
  ON attendance_records FOR SELECT
  USING (is_admin());

CREATE POLICY "members_insert_own_attendance"
  ON attendance_records FOR INSERT
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "admins_update_attendance"
  ON attendance_records FOR UPDATE
  USING (is_admin());

-- accountability_schedules
CREATE POLICY "members_manage_own_schedules"
  ON accountability_schedules FOR ALL
  USING (member_id = auth.uid());

CREATE POLICY "admins_read_all_schedules"
  ON accountability_schedules FOR SELECT
  USING (is_admin());

-- accountability_completions
CREATE POLICY "members_read_own_completions"
  ON accountability_completions FOR SELECT
  USING (member_id = auth.uid());

CREATE POLICY "members_insert_own_completions"
  ON accountability_completions FOR INSERT
  WITH CHECK (member_id = auth.uid());

CREATE POLICY "members_update_own_completions"
  ON accountability_completions FOR UPDATE
  USING (member_id = auth.uid());

CREATE POLICY "admins_read_all_completions"
  ON accountability_completions FOR SELECT
  USING (is_admin());

-- dress_codes
CREATE POLICY "all_read_published_dress_codes"
  ON dress_codes FOR SELECT
  USING (status = 'published' OR is_admin());

CREATE POLICY "admin_write_dress_codes"
  ON dress_codes FOR ALL
  USING (is_admin());

-- sermons
CREATE POLICY "all_read_published_sermons"
  ON sermons FOR SELECT
  USING (status = 'published' OR is_admin());

CREATE POLICY "admin_write_sermons"
  ON sermons FOR ALL
  USING (is_admin());

-- announcements
CREATE POLICY "authenticated_read_published_announcements"
  ON announcements FOR SELECT
  USING (
    (auth.uid() IS NOT NULL AND status = 'published')
    OR is_admin()
  );

CREATE POLICY "admin_write_announcements"
  ON announcements FOR ALL
  USING (is_admin());

-- content_settings
CREATE POLICY "all_read_content_settings"
  ON content_settings FOR SELECT
  USING (TRUE);

CREATE POLICY "admin_write_content_settings"
  ON content_settings FOR ALL
  USING (is_admin());

-- audit_logs (admins read only; inserts are performed via service role from API routes)
CREATE POLICY "admins_read_audit_logs"
  ON audit_logs FOR SELECT
  USING (is_admin());

-- =============================================
-- TRIGGER: Auto-create profile on user signup
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_full_name TEXT;
BEGIN
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
    RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role, supabase_auth_admin;
