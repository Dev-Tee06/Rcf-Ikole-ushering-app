-- =============================================
-- 002_seed_data.sql
-- RCF Ikole Ushering Unit Management Platform
-- Seed data: services, duty posts, standing roles,
-- and content settings
-- =============================================

-- =============================================
-- 1. SERVICES
-- Tuesday  : day_of_week=2, 17:00–18:30
-- Thursday : day_of_week=4, 16:00–18:00
-- Friday   : day_of_week=5, 17:00–18:30
-- Sunday   : day_of_week=0, 07:00–12:00
-- absence_deadline_hours = 2 for all
-- =============================================
INSERT INTO services (service_type, name, day_of_week, start_time, end_time, absence_deadline_hours, description, is_active)
VALUES
  (
    'tuesday',
    'Tuesday Service',
    2,
    '17:00:00',
    '18:30:00',
    2.0,
    'Weekly Tuesday evening service.',
    TRUE
  ),
  (
    'thursday',
    'Thursday Service',
    4,
    '16:00:00',
    '18:00:00',
    2.0,
    'Weekly Thursday evening service.',
    TRUE
  ),
  (
    'friday',
    'Friday Service',
    5,
    '17:00:00',
    '18:30:00',
    2.0,
    'Weekly Friday evening service.',
    TRUE
  ),
  (
    'sunday',
    'Sunday Service',
    0,
    '07:00:00',
    '12:00:00',
    2.0,
    'Weekly Sunday morning service.',
    TRUE
  );

-- =============================================
-- 2. DUTY POSTS
-- Tuesday  : Left Hand Side, Right Hand Side, Middle, Door, Records
-- Friday   : Left Hand Side, Right Hand Side, Middle, Door, Records
-- Sunday   : Upper Left, Lower Left, Upper Middle, Lower Middle,
--            Upper Right, Lower Right, Door Post, Records
-- (Thursday has no specific posts defined in seed)
-- =============================================
INSERT INTO duty_posts (service_type, name, sort_order, is_active)
VALUES
  -- Tuesday posts
  ('tuesday', 'Left Hand Side',  1, TRUE),
  ('tuesday', 'Right Hand Side', 2, TRUE),
  ('tuesday', 'Middle',          3, TRUE),
  ('tuesday', 'Door',            4, TRUE),
  ('tuesday', 'Records',         5, TRUE),

  -- Friday posts
  ('friday', 'Left Hand Side',  1, TRUE),
  ('friday', 'Right Hand Side', 2, TRUE),
  ('friday', 'Middle',          3, TRUE),
  ('friday', 'Door',            4, TRUE),
  ('friday', 'Records',         5, TRUE),

  -- Sunday posts
  ('sunday', 'Upper Left',    1, TRUE),
  ('sunday', 'Lower Left',    2, TRUE),
  ('sunday', 'Upper Middle',  3, TRUE),
  ('sunday', 'Lower Middle',  4, TRUE),
  ('sunday', 'Upper Right',   5, TRUE),
  ('sunday', 'Lower Right',   6, TRUE),
  ('sunday', 'Door Post',     7, TRUE),
  ('sunday', 'Records',       8, TRUE);

-- =============================================
-- 3. STANDING ROLES
-- Head Usher            : single occupancy, sort_order=1
-- Assistant Head Usher  : single occupancy, sort_order=2
-- =============================================
INSERT INTO standing_roles (name, description, is_single_occupancy, is_active, sort_order)
VALUES
  (
    'Head Usher',
    'The primary leader of the ushering unit, responsible for overall coordination and direction.',
    TRUE,
    TRUE,
    1
  ),
  (
    'Assistant Head Usher',
    'Supports the Head Usher in coordinating unit activities and steps in when the Head Usher is unavailable.',
    TRUE,
    TRUE,
    2
  );

-- =============================================
-- 4. CONTENT SETTINGS
-- =============================================
INSERT INTO content_settings (key, value, description)
VALUES
  (
    'unit_name',
    'RCF Ikole Ushering Unit',
    'The official name of the ushering unit displayed across the platform.'
  ),
  (
    'unit_introduction',
    'The RCF Ikole Ushering Unit is a dedicated team of servants committed to creating an atmosphere of order, warmth, and reverence in the house of God. We are watchmen at the gates, ensuring every soul that enters encounters the presence of God without hindrance.',
    'Introductory paragraph about the ushering unit shown on the public landing page.'
  ),
  (
    'unit_purpose',
    'Our purpose is to serve with excellence, uphold the dignity of God''s house, and support every ministry with a spirit of unity and prayer.',
    'Statement of purpose for the ushering unit.'
  ),
  (
    'unit_values',
    'Service, Order, Prayer, Spiritual Growth, Excellence',
    'Core values of the ushering unit, displayed as a comma-separated list.'
  ),
  (
    'apk_download_url',
    '',
    'Direct download URL for the latest Android APK of the member app. Leave empty if no APK is available yet.'
  ),
  (
    'head_usher_name',
    'Babayode Testimony',
    'Full name of the current Head Usher, displayed on the leadership section.'
  ),
  (
    'head_usher_bio',
    'Dedicated servant leader guiding the RCF Ikole Ushering Unit with excellence and spiritual integrity.',
    'Short biography of the Head Usher shown on the leadership section.'
  ),
  (
    'assistant_head_usher_name',
    'Philip Peculiar',
    'Full name of the current Assistant Head Usher, displayed on the leadership section.'
  ),
  (
    'assistant_head_usher_bio',
    'Supporting the unit''s mission with commitment, order, and a heart for service.',
    'Short biography of the Assistant Head Usher shown on the leadership section.'
  );
