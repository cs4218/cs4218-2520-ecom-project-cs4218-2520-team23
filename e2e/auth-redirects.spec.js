// Liu Yiyang, A0258121M
import { test, expect } from "@playwright/test";

const seedAuthStorage = async (page, authData) => {
  await page.addInitScript((data) => {
    localStorage.setItem("auth", JSON.stringify(data));
  }, authData);
};

const defaultUser = {
  _id: "user-id",
  name: "Test User",
  email: "testuser@example.com",
  phone: "12345678",
  address: "123 Test Street",
  role: 0,
};

test.describe("auth redirects when already logged in", () => {
  const authData = {
    user: defaultUser,
    token: "seeded-token",
  };

  test("login page redirects to home", async ({ page }) => {
    await seedAuthStorage(page, authData);
    await page.goto("/login");
    await expect(page).toHaveURL("/");
  });

  test("register page redirects to home", async ({ page }) => {
    await seedAuthStorage(page, authData);
    await page.goto("/register");
    await expect(page).toHaveURL("/");
  });
});
