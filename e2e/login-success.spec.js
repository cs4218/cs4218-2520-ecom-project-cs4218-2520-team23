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

const defaultUser = {
  _id: "user-id",
  name: "Test User",
  email: "testuser@example.com",
  phone: "12345678",
  address: "123 Test Street",
  role: 0,
};

const mockLoginSuccess = async (page, overrides = {}) => {
  const user = { ...defaultUser, ...overrides };
  await page.route("**/api/v1/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "login successfully",
        user,
        token: "fake-jwt-token",
      }),
    })
  );
};

test.describe("login success", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("valid credentials redirect to home", async ({ page }) => {
    await mockLoginSuccess(page, {
      name: "Login User",
      email: "login.user@example.com",
      address: "321 Login Street",
    });

    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("login.user@example.com");
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("Password123!");
    await page.getByRole("button", { name: "LOGIN" }).click();

    const loginToast = page.locator('[role="status"]', {
      hasText: /login successfully/i,
    });
    await expect(loginToast).toBeVisible();
    await expect(page).toHaveURL("/");
  });

  test("login from cart returns to cart page", async ({ page }) => {
    await mockLoginSuccess(page, {
      name: "Cart User",
      email: "cart.user@example.com",
      address: "987 Cart Street",
    });

    await page.goto("/cart");
    await page
      .getByRole("button", { name: /please login to checkout/i })
      .click();

    await expect(page).toHaveURL(/\/login$/);
    await page
      .getByRole("textbox", { name: "Enter Your Email" })
      .fill("cart.user@example.com");
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill("Password123!");
    await page.getByRole("button", { name: "LOGIN" }).click();

    await expect(page).toHaveURL(/\/cart$/);
  });
});
