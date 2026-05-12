ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'member'
CHECK (role IN ('member', 'survey_creator'));
