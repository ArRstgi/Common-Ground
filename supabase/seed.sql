-- Playwright E2E seed — run once after `npx supabase start`
-- Creates 3 stable test users that all E2E tests rely on.
--
-- Credentials:
--   e2e_creator@commonground.dev  / E2ePass1!  (survey_creator)
--   e2e_member_a@commonground.dev / E2ePass1!  (member)
--   e2e_member_b@commonground.dev / E2ePass1!  (member)
--
-- To apply:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres -f frontend/e2e/playwright_seed.sql

SET session_replication_role = replica;

DO $$
DECLARE
  pw          TEXT        := extensions.crypt('E2ePass1!', extensions.gen_salt('bf', 10));
  ts          TIMESTAMPTZ := now();

  creator_id  UUID := 'e2e00000-0000-0000-0000-000000000001';
  member_a_id UUID := 'e2e00000-0000-0000-0000-000000000002';
  member_b_id UUID := 'e2e00000-0000-0000-0000-000000000003';

BEGIN

-- ── Auth users ─────────────────────────────────────────────────────────────────

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, invited_at,
  confirmation_token, confirmation_sent_at,
  recovery_token, recovery_sent_at,
  email_change_token_new, email_change, email_change_sent_at,
  last_sign_in_at, raw_app_meta_data, raw_user_meta_data,
  is_super_admin, created_at, updated_at,
  phone, phone_confirmed_at,
  phone_change, phone_change_token, phone_change_sent_at,
  email_change_token_current, email_change_confirm_status,
  banned_until, reauthentication_token, reauthentication_sent_at,
  is_sso_user, deleted_at, is_anonymous
) VALUES
  ('00000000-0000-0000-0000-000000000000', creator_id,  'authenticated','authenticated','e2e_creator@commonground.dev',  pw, ts,NULL,'',NULL,'',NULL,'','',NULL,NULL,'{"provider":"email","providers":["email"]}','{"email_verified":true}',NULL,ts,ts,NULL,NULL,'','',NULL,'',0,NULL,'',NULL,false,NULL,false),
  ('00000000-0000-0000-0000-000000000000', member_a_id, 'authenticated','authenticated','e2e_member_a@commonground.dev', pw, ts,NULL,'',NULL,'',NULL,'','',NULL,NULL,'{"provider":"email","providers":["email"]}','{"email_verified":true}',NULL,ts,ts,NULL,NULL,'','',NULL,'',0,NULL,'',NULL,false,NULL,false),
  ('00000000-0000-0000-0000-000000000000', member_b_id, 'authenticated','authenticated','e2e_member_b@commonground.dev', pw, ts,NULL,'',NULL,'',NULL,'','',NULL,NULL,'{"provider":"email","providers":["email"]}','{"email_verified":true}',NULL,ts,ts,NULL,NULL,'','',NULL,'',0,NULL,'',NULL,false,NULL,false)
ON CONFLICT (id) DO NOTHING;

-- ── Auth identities ────────────────────────────────────────────────────────────

INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) VALUES
  (creator_id::text,  creator_id,  jsonb_build_object('sub',creator_id::text,  'email','e2e_creator@commonground.dev',  'email_verified',false,'phone_verified',false),'email',ts,ts,ts,gen_random_uuid()),
  (member_a_id::text, member_a_id, jsonb_build_object('sub',member_a_id::text, 'email','e2e_member_a@commonground.dev', 'email_verified',false,'phone_verified',false),'email',ts,ts,ts,gen_random_uuid()),
  (member_b_id::text, member_b_id, jsonb_build_object('sub',member_b_id::text, 'email','e2e_member_b@commonground.dev', 'email_verified',false,'phone_verified',false),'email',ts,ts,ts,gen_random_uuid())
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ── Profiles ───────────────────────────────────────────────────────────────────
-- Use UPSERT so re-running the seed is safe even if the trigger already fired.

INSERT INTO public.profiles (id, email, full_name, school, major, grad_year, role, created_at, updated_at) VALUES
  (creator_id,  'e2e_creator@commonground.dev',  'E2E Creator',  'UMass Amherst', 'Computer Science', 2026, 'survey_creator', ts, ts),
  (member_a_id, 'e2e_member_a@commonground.dev', 'E2E Member A', 'UMass Amherst', 'Computer Science', 2026, 'member',          ts, ts),
  (member_b_id, 'e2e_member_b@commonground.dev', 'E2E Member B', 'UMass Amherst', 'Computer Science', 2026, 'member',          ts, ts)
ON CONFLICT (id) DO UPDATE
  SET role = EXCLUDED.role, full_name = EXCLUDED.full_name, updated_at = now();

END $$;

SET session_replication_role = DEFAULT;
