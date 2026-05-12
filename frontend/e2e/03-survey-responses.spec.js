import { test, expect } from "@playwright/test";
import { SEEDED_USERS, getToken, loginAs, createSurvey, joinSurvey } from "./helpers.js";

let surveyId = null;

test.beforeAll(async () => {
  const creatorToken = await getToken(SEEDED_USERS.creator);

  const survey = await createSurvey(creatorToken, {
    title: "E2E Response Persistence Survey",
    questions: [
      {
        prompt: "Which time works best for you?",
        question_type: "multiple_choice",
        order_index: 0,
        answer_options: [
          { option_text: "Morning", order_index: 0 },
          { option_text: "Afternoon", order_index: 1 },
          { option_text: "Evening", order_index: 2 },
        ],
      },
      {
        prompt: "Describe your ideal team",
        question_type: "short_answer",
        order_index: 1,
        answer_options: [],
      },
    ],
  });

  surveyId = survey.survey_id;
  const memberToken = await getToken(SEEDED_USERS.memberA);
  await joinSurvey(memberToken, SEEDED_USERS.memberA.id, survey.join_code);
});

test("answers are saved and pre-populated on reload", async ({ page }) => {
  await loginAs(page, SEEDED_USERS.memberA);
  await page.goto(`/surveydetail/${surveyId}`);
  await expect(page.getByText("E2E Response Persistence Survey")).toBeVisible({ timeout: 8000 });

  // Select "Afternoon" for the multiple choice question
  await page.getByText("Afternoon").click();

  // Fill the short answer
  await page.getByPlaceholder(/type your answer/i).fill("Collaborative and focused");

  await expect(page.getByText("2 / 2 answered")).toBeVisible();

  // Start listening for the save request before clicking, then wait for it to complete
  const saveResponsePromise = page.waitForResponse(resp => resp.url().includes("/surveys/save_answers"));
  await page.getByRole("button", { name: /save responses/i }).click();
  await saveResponsePromise;
  await expect(page.getByText(/responses have been saved/i)).toBeVisible({ timeout: 8000 });

  await page.reload();
  await expect(page.getByText("E2E Response Persistence Survey")).toBeVisible({ timeout: 8000 });

  // "Afternoon" option box should have the selected border styling (primary color)
  // Check via the hidden radio input inside the MUI Radio component
  const afternoonOption = page.locator("[class*='MuiPaper']").filter({ hasText: "Afternoon" }).first();
  const radio = afternoonOption.locator('input[type="radio"]').first();

  await expect(page.getByPlaceholder(/type your answer/i)).toHaveValue("Collaborative and focused");
});
