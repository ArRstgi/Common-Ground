import { test, expect } from "@playwright/test";
import { SEEDED_USERS, getToken, loginAs, createSurvey } from "./helpers.js";

let creatorToken = null;

test.beforeAll(async () => {
  creatorToken = await getToken(SEEDED_USERS.creator);
});

test("survey_creator can create a survey and receives a join code", async ({ page }) => {
  await loginAs(page, SEEDED_USERS.creator);
  await page.goto("/surveycreate");

  await page.getByLabel("Title").fill("E2E Create Test Survey");
  await page.getByLabel("Description").fill("Created by Playwright");

  // Open the add-question panel
  await page.getByRole("button", { name: /add a question/i }).click();

  // Fill the question prompt and two answer options
  await page.getByLabel("Question prompt").fill("What is your preferred role?");
  await page.getByPlaceholder("Option 1").fill("Frontend");
  await page.getByPlaceholder("Option 2").fill("Backend");

  // Save the question to the list
  await page.getByRole("button", { name: /^add question$/i }).click();

  // Publish the survey
  await page.getByRole("button", { name: /publish survey/i }).click();

  // Success screen shows the join code
  await expect(page.getByText("Survey published!")).toBeVisible({ timeout: 8000 });
});

test("member can join survey by join code and sees it in My Surveys", async ({ page }) => {
  const { join_code } = await createSurvey(creatorToken, {
    title: "E2E Join Flow Survey",
    questions: [
      {
        prompt: "Pick one",
        question_type: "multiple_choice",
        order_index: 0,
        answer_options: [
          { option_text: "Option A", order_index: 0 },
          { option_text: "Option B", order_index: 1 },
        ],
      },
    ],
  });

  await loginAs(page, SEEDED_USERS.memberA);
  await page.goto("/surveyjoin");

  await page.getByPlaceholder(/e\.g\./i).fill(join_code);
  await page.getByRole("button", { name: /join survey/i }).click();

  await page.waitForURL("**/teams");

  await page.goto("/mysurveys");
  await expect(page.getByText("E2E Join Flow Survey")).toBeVisible({ timeout: 8000 });
});
