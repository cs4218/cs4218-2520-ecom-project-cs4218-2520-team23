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

test.describe("logout success", () => {
  test("user logs out and is redirected to login", async ({ page }) => {
    const authData = {
      user: defaultUser,
      token: "seeded-token",
    };

    await seedAuthStorage(page, authData);
    await page.goto("/");

    await page.getByRole("button", { name: defaultUser.name }).click();
    await page.getByRole("link", { name: "Logout" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  });
});
