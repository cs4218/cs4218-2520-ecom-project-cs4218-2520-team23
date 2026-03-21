// Liu Yiyang, A0258121M
import { test, expect } from "@playwright/test";

const clearAuthStorage = async (page) => {
  await page.goto("/");
  await page.evaluate(() => {
    localStorage.removeItem("auth");
    localStorage.removeItem("cart");
  });
  await page.reload();
};

const mockLoginFailure = async (page, message = "Invalid Password", status = 401) => {
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message,
      }),
    })
  );
};

test.describe("login errors", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("invalid credentials show error and stay logged out", async ({ page }) => {
    await mockLoginFailure(page, "Invalid Password", 401);

    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("login.user@example.com");
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("WrongPassword");
    await page.getByRole("button", { name: "LOGIN" }).click();

    const errorToast = page.locator('[role="status"]', {
      hasText: /invalid password/i,
    });
    await expect(errorToast).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("link", { name: "Login" })).toBeVisible();
  });
});
