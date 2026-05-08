alter table "public"."profiles" add column "role" text not null default 'member'::text;

CREATE UNIQUE INDEX survey_responses_unique_response ON public.survey_responses USING btree (survey_id, question_id, user_id);

alter table "public"."profiles" add constraint "profiles_role_check" CHECK ((role = ANY (ARRAY['member'::text, 'survey_creator'::text]))) not valid;

alter table "public"."profiles" validate constraint "profiles_role_check";

alter table "public"."survey_responses" add constraint "survey_responses_unique_response" UNIQUE using index "survey_responses_unique_response";


