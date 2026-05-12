/**
 * Shared helpers for Common Ground E2E tests.
 *
 * Prerequisites:
 *   - Local Supabase running:  npx supabase start
 *   - Backend running:         uv run uvicorn main:app --reload
 *   - Seed applied once:       psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
 *                                -f frontend/e2e/playwright_seed.sql
 */

const SUPABASE_URL = "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hj04zWl196z2-SBc0";
const API_URL = "http://localhost:8000";

/**
 * Pre-seeded stable users — applied via playwright_seed.sql.
 * Use these in tests instead of creating users dynamically.
 */
export const SEEDED_USERS = {
  creator: {
    id: "e2e00000-0000-0000-0000-000000000001",
    email: "e2e_creator@commonground.dev",
    password: "E2ePass1!",
    role: "survey_creator",
  },
  memberA: {
    id: "e2e00000-0000-0000-0000-000000000002",
    email: "e2e_member_a@commonground.dev",
    password: "E2ePass1!",
    role: "member",
  },
  memberB: {
    id: "e2e00000-0000-0000-0000-000000000003",
    email: "e2e_member_b@commonground.dev",
    password: "E2ePass1!",
    role: "member",
  },
};

/**
 * Login as a seeded user and return a JWT token (without opening a browser).
 * Use for API-only setup in beforeAll hooks.
 */
export async function getToken(user) {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${user.email}: ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

/**
 * Register a brand-new user via the backend API and return { id, email, password, token }.
 * Uses @commonground.dev which passes Pydantic's EmailStr validation.
 * Only needed for tests that specifically test the registration flow.
 */
export async function createTestUser(role = "member") {
  const email = `e2e_tmp_${Date.now()}@commonground.dev`;
  const password = "E2ePass1!";

  const res = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: "E2E Temp User", role }),
  });
  if (!res.ok) throw new Error(`Register failed: ${await res.text()}`);
  const data = await res.json();
  return { id: data.user_id, email, password, token: data.access_token, role };
}

/**
 * Delete a Supabase auth user by ID using the service-role key.
 * Only needed to clean up users created by createTestUser.
 */
export async function deleteUser(userId) {
  await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
    method: "DELETE",
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
  });
}

/**
 * Log in via the UI. Navigates to /login, fills the form, and waits for
 * the redirect to /dashboard.
 */
export async function loginAs(page, user) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
}

/**
 * Create a survey via the backend API and return { survey_id, join_code }.
 */
export async function createSurvey(token, { title, questions }) {
  const res = await fetch(`${API_URL}/surveys/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title,
      description: "E2E test survey",
      deadline: null,
      questions,
    }),
  });
  if (!res.ok) throw new Error(`Create survey failed: ${await res.text()}`);
  const data = await res.json();
  return { survey_id: data.id, join_code: data.join_code };
}

/**
 * Create a team in a survey and add the user as an approved member.
 * Uses the service-role key so it bypasses RLS.
 * Returns the created team object.
 */
export async function createTeam(surveyId, userId, name) {
  const teamBody = JSON.stringify({
    survey_id: surveyId,
    name,
    description: "",
    max_size: 4,
    created_by: userId,
  });
  const teamRes = await fetch(`${SUPABASE_URL}/rest/v1/teams`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Prefer: "return=representation",
    },
    body: teamBody,
  });
  if (!teamRes.ok) throw new Error(`Create team failed: ${await teamRes.text()}`);
  const teams = await teamRes.json();
  const team = teams[0];

  const memberRes = await fetch(`${SUPABASE_URL}/rest/v1/team_members`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({
      team_id: team.id,
      user_id: userId,
      status: "approved",
      joined_at: new Date().toISOString(),
    }),
  });
  if (!memberRes.ok) throw new Error(`Add team member failed: ${await memberRes.text()}`);
  return team;
}

/**
 * Join a survey via the backend API.
 */
export async function joinSurvey(token, userId, joinCode) {
  const res = await fetch(`${API_URL}/surveys/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ user_id: userId, join_code: joinCode }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (!text.includes("already in this survey")) {
      throw new Error(`Join survey failed: ${text}`);
    }
  }
}
