-- ============================================================
-- AASTMT Room Booking System — Complete Test Data Seed
-- Run AFTER schema_complete.sql · Safe to re-run
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── 1. CLEAN UP (by email — catches any prior UUID) ──────────
DO $$
DECLARE
  existing_ids UUID[];
BEGIN
  SELECT ARRAY(SELECT id FROM auth.users
               WHERE email IN (
                 'admin01@aastmt.edu','bm001@aastmt.edu',
                 'emp001@aastmt.edu','emp002@aastmt.edu','sec001@aastmt.edu'
               ))
  INTO existing_ids;

  IF array_length(existing_ids, 1) > 0 THEN
    DELETE FROM public.bookings    WHERE user_id           = ANY(existing_ids);
    DELETE FROM public.delegations WHERE primary_user_id   = ANY(existing_ids)
                                      OR substitute_user_id = ANY(existing_ids);
    DELETE FROM public.users       WHERE id                = ANY(existing_ids);
    DELETE FROM auth.identities    WHERE user_id           = ANY(existing_ids);
    DELETE FROM auth.users         WHERE id                = ANY(existing_ids);
  END IF;
END $$;

-- ── 2. AUTH USERS (fixed UUIDs) ──────────────────────────────
INSERT INTO auth.users (
  id, instance_id, aud, role,
  email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token,
  email_change_token_new, email_change
) VALUES
  ('a0000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'admin01@aastmt.edu', crypt('Password123!', gen_salt('bf')),
   NOW(),NOW(),NOW(),
   '{"provider":"email","providers":["email"]}','{}','','','',''),

  ('a0000000-0000-0000-0000-000000000002',
   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'bm001@aastmt.edu', crypt('Password123!', gen_salt('bf')),
   NOW(),NOW(),NOW(),
   '{"provider":"email","providers":["email"]}','{}','','','',''),

  ('a0000000-0000-0000-0000-000000000003',
   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'emp001@aastmt.edu', crypt('Password123!', gen_salt('bf')),
   NOW(),NOW(),NOW(),
   '{"provider":"email","providers":["email"]}','{}','','','',''),

  ('a0000000-0000-0000-0000-000000000004',
   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'emp002@aastmt.edu', crypt('Password123!', gen_salt('bf')),
   NOW(),NOW(),NOW(),
   '{"provider":"email","providers":["email"]}','{}','','','',''),

  ('a0000000-0000-0000-0000-000000000005',
   '00000000-0000-0000-0000-000000000000','authenticated','authenticated',
   'sec001@aastmt.edu', crypt('Password123!', gen_salt('bf')),
   NOW(),NOW(),NOW(),
   '{"provider":"email","providers":["email"]}','{}','','','','');

-- ── 3. AUTH IDENTITIES (id must be UUID) ─────────────────────
INSERT INTO auth.identities (id, user_id, provider_id, identity_data, provider, created_at, updated_at)
VALUES
  (gen_random_uuid(),
   'a0000000-0000-0000-0000-000000000001', 'admin01@aastmt.edu',
   '{"sub":"a0000000-0000-0000-0000-000000000001","email":"admin01@aastmt.edu"}',
   'email', NOW(), NOW()),

  (gen_random_uuid(),
   'a0000000-0000-0000-0000-000000000002', 'bm001@aastmt.edu',
   '{"sub":"a0000000-0000-0000-0000-000000000002","email":"bm001@aastmt.edu"}',
   'email', NOW(), NOW()),

  (gen_random_uuid(),
   'a0000000-0000-0000-0000-000000000003', 'emp001@aastmt.edu',
   '{"sub":"a0000000-0000-0000-0000-000000000003","email":"emp001@aastmt.edu"}',
   'email', NOW(), NOW()),

  (gen_random_uuid(),
   'a0000000-0000-0000-0000-000000000004', 'emp002@aastmt.edu',
   '{"sub":"a0000000-0000-0000-0000-000000000004","email":"emp002@aastmt.edu"}',
   'email', NOW(), NOW()),

  (gen_random_uuid(),
   'a0000000-0000-0000-0000-000000000005', 'sec001@aastmt.edu',
   '{"sub":"a0000000-0000-0000-0000-000000000005","email":"sec001@aastmt.edu"}',
   'email', NOW(), NOW());

-- ── 4. PUBLIC USER PROFILES ───────────────────────────────────
INSERT INTO public.users (id, employee_id, full_name, role, is_approved, can_view_availability)
VALUES
  ('a0000000-0000-0000-0000-000000000001','ADMIN01','Ahmed Al-Admin',    'ADMIN',          TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000002','BM001',  'Bassem Manager',    'BRANCH_MANAGER', TRUE, TRUE),
  ('a0000000-0000-0000-0000-000000000003','EMP001', 'Emad Employee',     'EMPLOYEE',       TRUE, FALSE),
  ('a0000000-0000-0000-0000-000000000004','EMP002', 'Eman Khalil',       'EMPLOYEE',       TRUE, FALSE),
  ('a0000000-0000-0000-0000-000000000005','SEC001', 'Sara El-Secretary', 'SECRETARY',      TRUE, FALSE);

-- ── 5. ROOMS (skip if already exist) ─────────────────────────
INSERT INTO public.rooms (name, type, is_active)
SELECT name, type::room_type, is_active FROM (VALUES
  ('Lecture Hall A',       'LECTURE',       TRUE),
  ('Lecture Hall B',       'LECTURE',       TRUE),
  ('Section Room 101',     'LECTURE',       TRUE),
  ('Section Room 102',     'LECTURE',       TRUE),
  ('Section Room 201',     'LECTURE',       TRUE),
  ('Main Conference Hall', 'MULTI_PURPOSE', TRUE),
  ('Seminar Room 1',       'MULTI_PURPOSE', TRUE),
  ('Seminar Room 2',       'MULTI_PURPOSE', TRUE)
) AS v(name, type, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.rooms LIMIT 1);

-- ── 6. TIME SLOTS (skip if already exist) ────────────────────
INSERT INTO public.time_slots (start_time, end_time, is_active)
SELECT start_time::TIME, end_time::TIME, is_active FROM (VALUES
  ('08:00:00','09:30:00',TRUE),
  ('09:30:00','11:00:00',TRUE),
  ('11:00:00','12:30:00',TRUE),
  ('12:30:00','14:00:00',TRUE),
  ('14:00:00','15:30:00',TRUE),
  ('15:30:00','17:00:00',TRUE),
  ('17:00:00','18:30:00',TRUE)
) AS v(start_time, end_time, is_active)
WHERE NOT EXISTS (SELECT 1 FROM public.time_slots LIMIT 1);

-- ── 7. SAMPLE BOOKINGS ────────────────────────────────────────
DO $$
DECLARE
  emp1 UUID := 'a0000000-0000-0000-0000-000000000003';
  emp2 UUID := 'a0000000-0000-0000-0000-000000000004';
  sec  UUID := 'a0000000-0000-0000-0000-000000000005';

  hall_a UUID; hall_b UUID; room101 UUID; room102 UUID;
  conf   UUID; sem1   UUID;

  slot1 UUID; slot2 UUID; slot3 UUID; slot4 UUID;
  slot5 UUID; slot6 UUID; slot7 UUID;
BEGIN
  SELECT id INTO hall_a  FROM public.rooms WHERE name = 'Lecture Hall A'       LIMIT 1;
  SELECT id INTO hall_b  FROM public.rooms WHERE name = 'Lecture Hall B'       LIMIT 1;
  SELECT id INTO room101 FROM public.rooms WHERE name = 'Section Room 101'     LIMIT 1;
  SELECT id INTO room102 FROM public.rooms WHERE name = 'Section Room 102'     LIMIT 1;
  SELECT id INTO conf    FROM public.rooms WHERE name = 'Main Conference Hall' LIMIT 1;
  SELECT id INTO sem1    FROM public.rooms WHERE name = 'Seminar Room 1'       LIMIT 1;

  SELECT id INTO slot1 FROM public.time_slots WHERE start_time = '08:00' LIMIT 1;
  SELECT id INTO slot2 FROM public.time_slots WHERE start_time = '09:30' LIMIT 1;
  SELECT id INTO slot3 FROM public.time_slots WHERE start_time = '11:00' LIMIT 1;
  SELECT id INTO slot4 FROM public.time_slots WHERE start_time = '12:30' LIMIT 1;
  SELECT id INTO slot5 FROM public.time_slots WHERE start_time = '14:00' LIMIT 1;
  SELECT id INTO slot6 FROM public.time_slots WHERE start_time = '15:30' LIMIT 1;
  SELECT id INTO slot7 FROM public.time_slots WHERE start_time = '17:00' LIMIT 1;

  -- FIXED (always on calendar)
  INSERT INTO public.bookings (user_id,room_id,booking_date,start_slot_id,end_slot_id,status,type) VALUES
    (emp1,hall_a, CURRENT_DATE,   slot1,slot2,'APPROVED','FIXED'),
    (emp1,hall_a, CURRENT_DATE+1, slot1,slot2,'APPROVED','FIXED'),
    (emp1,hall_a, CURRENT_DATE+2, slot1,slot2,'APPROVED','FIXED');

  -- PENDING (admin approval queue)
  INSERT INTO public.bookings (user_id,room_id,booking_date,start_slot_id,end_slot_id,status,type) VALUES
    (emp1, room101, CURRENT_DATE+3, slot3,slot4,'PENDING','EXCEPTIONAL'),
    (emp2, room102, CURRENT_DATE+3, slot5,slot6,'PENDING','EXCEPTIONAL'),
    (sec,  hall_b,  CURRENT_DATE+4, slot2,slot3,'PENDING','EXCEPTIONAL');

  -- ADMIN_APPROVED multi-purpose (branch manager queue)
  INSERT INTO public.bookings (
    user_id,room_id,booking_date,start_slot_id,end_slot_id,
    status,type,purpose,manager_name,manager_title,manager_mobile,
    req_laptop,req_video_conf,req_mic_qty
  ) VALUES
    (emp1,conf,CURRENT_DATE+2,slot4,slot6,
     'ADMIN_APPROVED','MULTI_PURPOSE',
     'Annual Tech Conference','Dr. Khaled Hassan','Head of CS Dept','01012345678',
     TRUE,TRUE,4),
    (sec,sem1,CURRENT_DATE+3,slot1,slot3,
     'ADMIN_APPROVED','MULTI_PURPOSE',
     'Student Orientation Workshop','Eng. Mona Adel','Student Affairs','01098765432',
     FALSE,TRUE,2);

  -- APPROVED (show on calendar)
  INSERT INTO public.bookings (user_id,room_id,booking_date,start_slot_id,end_slot_id,status,type) VALUES
    (emp2,hall_b,  CURRENT_DATE,   slot3,slot4,'APPROVED','EXCEPTIONAL'),
    (sec, room101, CURRENT_DATE+1, slot5,slot6,'APPROVED','EXCEPTIONAL'),
    (emp1,room102, CURRENT_DATE+2, slot6,slot7,'APPROVED','EXCEPTIONAL');

  -- REJECTED (history)
  INSERT INTO public.bookings (user_id,room_id,booking_date,start_slot_id,end_slot_id,status,type,rejection_reason) VALUES
    (emp1,hall_a, CURRENT_DATE-1, slot2,slot3,'REJECTED','EXCEPTIONAL',
     'Room already reserved for an external event on that date.'),
    (emp2,conf,   CURRENT_DATE-7, slot4,slot6,'REJECTED','MULTI_PURPOSE',
     'Insufficient lead time for multi-purpose room allocation.');

  -- DELEGATION: SEC001 substitutes for EMP001
  INSERT INTO public.delegations (primary_user_id,substitute_user_id,start_date,end_date,is_active) VALUES
    (emp1, sec, CURRENT_DATE-1, CURRENT_DATE+5, TRUE);
END $$;

-- ── VERIFY ────────────────────────────────────────────────────
SELECT 'auth_users'   AS tbl, COUNT(*)::TEXT AS cnt FROM auth.users   WHERE email LIKE '%@aastmt.edu'
UNION ALL
SELECT 'public_users',         COUNT(*)::TEXT        FROM public.users
UNION ALL
SELECT 'rooms',                COUNT(*)::TEXT        FROM public.rooms
UNION ALL
SELECT 'time_slots',           COUNT(*)::TEXT        FROM public.time_slots
UNION ALL
SELECT 'bookings',             COUNT(*)::TEXT        FROM public.bookings
UNION ALL
SELECT 'delegations',          COUNT(*)::TEXT        FROM public.delegations;
