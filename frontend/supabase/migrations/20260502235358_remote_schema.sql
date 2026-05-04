


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."answer_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "question_id" "uuid" NOT NULL,
    "option_text" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL
);


ALTER TABLE "public"."answer_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."merge_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "requesting_team_id" "uuid" NOT NULL,
    "target_team_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "merge_requests_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."merge_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "full_name" "text",
    "school" "text",
    "major" "text",
    "grad_year" integer,
    "bio" "text",
    "contact_info" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "prompt" "text" NOT NULL,
    "question_type" "text" NOT NULL,
    "order_index" integer DEFAULT 0 NOT NULL,
    CONSTRAINT "questions_question_type_check" CHECK (("question_type" = ANY (ARRAY['multiple_choice'::"text", 'short_answer'::"text"])))
);


ALTER TABLE "public"."questions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_members" (
    "survey_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."survey_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."survey_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "question_id" "uuid" NOT NULL,
    "answer_option_id" "uuid",
    "answer_text" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."survey_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."surveys" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "created_by" "uuid" NOT NULL,
    "join_code" "text" DEFAULT "upper"("substring"(("gen_random_uuid"())::"text", 1, 8)) NOT NULL,
    "deadline" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."surveys" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."team_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "team_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'approved'::"text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "team_members_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'approved'::"text", 'rejected'::"text"])))
);


ALTER TABLE "public"."team_members" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."team_sizes" AS
SELECT
    NULL::"uuid" AS "team_id",
    NULL::"uuid" AS "survey_id",
    NULL::"text" AS "name",
    NULL::integer AS "max_size",
    NULL::"uuid" AS "created_by",
    NULL::bigint AS "approved_count";


ALTER VIEW "public"."team_sizes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teams" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "survey_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "max_size" integer DEFAULT 4 NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "merged_into" "uuid"
);


ALTER TABLE "public"."teams" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_active_teams" AS
 SELECT "tm"."user_id",
    "t"."survey_id",
    "t"."id" AS "team_id",
    "t"."name" AS "team_name"
   FROM ("public"."team_members" "tm"
     JOIN "public"."teams" "t" ON (("t"."id" = "tm"."team_id")))
  WHERE (("tm"."status" = 'approved'::"text") AND ("t"."merged_into" IS NULL));


ALTER VIEW "public"."user_active_teams" OWNER TO "postgres";


ALTER TABLE ONLY "public"."answer_options"
    ADD CONSTRAINT "answer_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."merge_requests"
    ADD CONSTRAINT "merge_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_members"
    ADD CONSTRAINT "survey_members_pkey" PRIMARY KEY ("survey_id", "user_id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_question_id_key" UNIQUE ("user_id", "question_id");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_join_code_key" UNIQUE ("join_code");



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_user_id_key" UNIQUE ("team_id", "user_id");



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_pkey" PRIMARY KEY ("id");



CREATE OR REPLACE VIEW "public"."team_sizes" AS
 SELECT "t"."id" AS "team_id",
    "t"."survey_id",
    "t"."name",
    "t"."max_size",
    "t"."created_by",
    "count"("tm"."id") AS "approved_count"
   FROM ("public"."teams" "t"
     LEFT JOIN "public"."team_members" "tm" ON ((("tm"."team_id" = "t"."id") AND ("tm"."status" = 'approved'::"text"))))
  WHERE ("t"."merged_into" IS NULL)
  GROUP BY "t"."id";



ALTER TABLE ONLY "public"."answer_options"
    ADD CONSTRAINT "answer_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."merge_requests"
    ADD CONSTRAINT "merge_requests_requesting_team_id_fkey" FOREIGN KEY ("requesting_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."merge_requests"
    ADD CONSTRAINT "merge_requests_target_team_id_fkey" FOREIGN KEY ("target_team_id") REFERENCES "public"."teams"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questions"
    ADD CONSTRAINT "questions_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_members"
    ADD CONSTRAINT "survey_members_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_members"
    ADD CONSTRAINT "survey_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_answer_option_id_fkey" FOREIGN KEY ("answer_option_id") REFERENCES "public"."answer_options"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."survey_responses"
    ADD CONSTRAINT "survey_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."surveys"
    ADD CONSTRAINT "surveys_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."team_members"
    ADD CONSTRAINT "team_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_merged_into_fkey" FOREIGN KEY ("merged_into") REFERENCES "public"."teams"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."teams"
    ADD CONSTRAINT "teams_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE CASCADE;



ALTER TABLE "public"."answer_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "answer_options: read if member" ON "public"."answer_options" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."questions" "q"
     JOIN "public"."survey_members" "sm" ON (("sm"."survey_id" = "q"."survey_id")))
  WHERE (("q"."id" = "answer_options"."question_id") AND ("sm"."user_id" = "auth"."uid"())))));



CREATE POLICY "answer_options: write if creator" ON "public"."answer_options" USING ((EXISTS ( SELECT 1
   FROM ("public"."questions" "q"
     JOIN "public"."surveys" "s" ON (("s"."id" = "q"."survey_id")))
  WHERE (("q"."id" = "answer_options"."question_id") AND ("s"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."merge_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "merge_requests: delete if requesting team creator" ON "public"."merge_requests" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "merge_requests"."requesting_team_id") AND ("t"."created_by" = "auth"."uid"())))));



CREATE POLICY "merge_requests: insert if on requesting team" ON "public"."merge_requests" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."team_members" "tm"
  WHERE (("tm"."team_id" = "merge_requests"."requesting_team_id") AND ("tm"."user_id" = "auth"."uid"()) AND ("tm"."status" = 'approved'::"text")))));



CREATE POLICY "merge_requests: read if survey member" ON "public"."merge_requests" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."survey_members" "sm" ON (("sm"."survey_id" = "t"."survey_id")))
  WHERE (("t"."id" = "merge_requests"."target_team_id") AND ("sm"."user_id" = "auth"."uid"())))));



CREATE POLICY "merge_requests: update if target team creator" ON "public"."merge_requests" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "merge_requests"."target_team_id") AND ("t"."created_by" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles: read all" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "profiles: update own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."questions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questions: read if member" ON "public"."questions" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."survey_members" "sm"
  WHERE (("sm"."survey_id" = "questions"."survey_id") AND ("sm"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."surveys" "s"
  WHERE (("s"."id" = "questions"."survey_id") AND ("s"."created_by" = "auth"."uid"()))))));



CREATE POLICY "questions: write if creator" ON "public"."questions" USING ((EXISTS ( SELECT 1
   FROM "public"."surveys" "s"
  WHERE (("s"."id" = "questions"."survey_id") AND ("s"."created_by" = "auth"."uid"())))));



CREATE POLICY "responses: insert own" ON "public"."survey_responses" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "responses: read own or creator" ON "public"."survey_responses" FOR SELECT USING ((("auth"."uid"() = "user_id") OR (EXISTS ( SELECT 1
   FROM "public"."surveys" "s"
  WHERE (("s"."id" = "survey_responses"."survey_id") AND ("s"."created_by" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."survey_members" "sm"
  WHERE (("sm"."survey_id" = "survey_responses"."survey_id") AND ("sm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "responses: update own" ON "public"."survey_responses" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."survey_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "survey_members: delete own" ON "public"."survey_members" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "survey_members: insert own" ON "public"."survey_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "survey_members: read if member" ON "public"."survey_members" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."survey_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."surveys" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "surveys: delete own" ON "public"."surveys" FOR DELETE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "surveys: insert own" ON "public"."surveys" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "surveys: read if member" ON "public"."surveys" FOR SELECT USING ((("auth"."uid"() = "created_by") OR (EXISTS ( SELECT 1
   FROM "public"."survey_members" "sm"
  WHERE (("sm"."survey_id" = "surveys"."id") AND ("sm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "surveys: update own" ON "public"."surveys" FOR UPDATE USING (("auth"."uid"() = "created_by"));



CREATE POLICY "team_members: insert own" ON "public"."team_members" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "team_members: read if in survey" ON "public"."team_members" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."teams" "t"
     JOIN "public"."survey_members" "sm" ON (("sm"."survey_id" = "t"."survey_id")))
  WHERE (("t"."id" = "team_members"."team_id") AND ("sm"."user_id" = "auth"."uid"())))));



CREATE POLICY "team_members: update if team creator" ON "public"."team_members" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."teams" "t"
  WHERE (("t"."id" = "team_members"."team_id") AND ("t"."created_by" = "auth"."uid"())))));



CREATE POLICY "teams: insert if survey member" ON "public"."teams" FOR INSERT WITH CHECK ((("auth"."uid"() = "created_by") AND (EXISTS ( SELECT 1
   FROM "public"."survey_members" "sm"
  WHERE (("sm"."survey_id" = "sm"."survey_id") AND ("sm"."user_id" = "auth"."uid"()))))));



CREATE POLICY "teams: read if survey member" ON "public"."teams" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."survey_members" "sm"
  WHERE (("sm"."survey_id" = "teams"."survey_id") AND ("sm"."user_id" = "auth"."uid"())))));



CREATE POLICY "teams: update if creator" ON "public"."teams" FOR UPDATE USING (("auth"."uid"() = "created_by"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


















GRANT ALL ON TABLE "public"."answer_options" TO "anon";
GRANT ALL ON TABLE "public"."answer_options" TO "authenticated";
GRANT ALL ON TABLE "public"."answer_options" TO "service_role";



GRANT ALL ON TABLE "public"."merge_requests" TO "anon";
GRANT ALL ON TABLE "public"."merge_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."merge_requests" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."questions" TO "anon";
GRANT ALL ON TABLE "public"."questions" TO "authenticated";
GRANT ALL ON TABLE "public"."questions" TO "service_role";



GRANT ALL ON TABLE "public"."survey_members" TO "anon";
GRANT ALL ON TABLE "public"."survey_members" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_members" TO "service_role";



GRANT ALL ON TABLE "public"."survey_responses" TO "anon";
GRANT ALL ON TABLE "public"."survey_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."survey_responses" TO "service_role";



GRANT ALL ON TABLE "public"."surveys" TO "anon";
GRANT ALL ON TABLE "public"."surveys" TO "authenticated";
GRANT ALL ON TABLE "public"."surveys" TO "service_role";



GRANT ALL ON TABLE "public"."team_members" TO "anon";
GRANT ALL ON TABLE "public"."team_members" TO "authenticated";
GRANT ALL ON TABLE "public"."team_members" TO "service_role";



GRANT ALL ON TABLE "public"."team_sizes" TO "anon";
GRANT ALL ON TABLE "public"."team_sizes" TO "authenticated";
GRANT ALL ON TABLE "public"."team_sizes" TO "service_role";



GRANT ALL ON TABLE "public"."teams" TO "anon";
GRANT ALL ON TABLE "public"."teams" TO "authenticated";
GRANT ALL ON TABLE "public"."teams" TO "service_role";



GRANT ALL ON TABLE "public"."user_active_teams" TO "anon";
GRANT ALL ON TABLE "public"."user_active_teams" TO "authenticated";
GRANT ALL ON TABLE "public"."user_active_teams" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";































drop extension if exists "pg_net";

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


