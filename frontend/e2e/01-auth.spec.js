import { test, expect } from "@playwright/test";
import { SEEDED_USERS, deleteUser } from "./helpers.js";

test("login with valid credentials reaches dashboard", async ({ page }) => {
  const user = SEEDED_USERS.memberA;
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
});

test("login with wrong password shows error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_USERS.memberA.email);
  await page.getByLabel("Password").fill("wrongpassword");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("logout clears session and redirects to login", async ({ page }) => {
  const user = SEEDED_USERS.memberA;
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL("**/dashboard");

  // Sidebar button is labeled "Sign out"
  await page.getByRole("button", { name: /sign out/i }).first().click();
  await page.waitForURL("**/login");
  await expect(page).toHaveURL(/\/login/);
});

test("register new account navigates to dashboard", async ({ page }) => {
  let userId = null;
  try {
    const email = `e2e_tmp_${Date.now()}@commonground.dev`;
    const password = "E2ePass1!";

    await page.goto("/register");
    await page.getByLabel("Full name").fill("E2E Temp User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL("**/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);

    userId = await page.evaluate(() => {
      const user = sessionStorage.getItem("cg_user");
      return user ? JSON.parse(user).id : null;
    });
  } finally {
    if (userId) await deleteUser(userId);
  }
});
