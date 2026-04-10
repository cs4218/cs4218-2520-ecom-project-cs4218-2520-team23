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

const buildRegisterData = () => {
  const uniqueId = Date.now();
  return {
    name: `Test User ${uniqueId}`,
    email: `testuser${uniqueId}@example.com`,
    password: "Password123!",
    phone: "12345678",
    address: `123 Test Street ${uniqueId}`,
    dob: "1990-01-01",
    securityAnswer: "Soccer",
  };
};

const fillRegisterForm = async (page, data) => {
  if (data.name !== undefined) {
    await page.getByRole("textbox", { name: "Enter Your Name" }).fill(data.name);
  }
  if (data.email !== undefined) {
    await page.getByRole("textbox", { name: "Enter Your Email" }).fill(data.email);
  }
  if (data.password !== undefined) {
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill(data.password);
  }
  if (data.phone !== undefined) {
    await page.getByRole("textbox", { name: "Enter Your Phone" }).fill(data.phone);
  }
  if (data.address !== undefined) {
    await page
      .getByRole("textbox", { name: "Enter Your Address" })
      .fill(data.address);
  }
  if (data.dob !== undefined) {
    await page.getByTestId("dob-input").fill(data.dob);
  }
  if (data.securityAnswer !== undefined) {
    await page
      .getByRole("textbox", { name: "What is Your Favorite sports" })
      .fill(data.securityAnswer);
  }
};

const defaultUser = {
  _id: "user-id",
  name: "Test User",
  email: "testuser@example.com",
  phone: "12345678",
  address: "123 Test Street",
  role: 0,
};

const mockRegisterSuccess = async (page) => {
  await page.route("**/api/v1/auth/register", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        message: "User Register Successfully",
        user: defaultUser,
      }),
    })
  );
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

const mockUserAuthOk = async (page) => {
  await page.route("**/api/v1/auth/user-auth", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  );
};

test.describe("register-login-dashboard pipeline", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("user registers, logs in, dashboard shows details", async ({ page }) => {
    const { name, email, password, phone, address, dob, securityAnswer } =
      buildRegisterData();

    await mockRegisterSuccess(page);
    await mockLoginSuccess(page, { name, email, address });
    await mockUserAuthOk(page);

    await page.goto("/register");
    await fillRegisterForm(page, {
      name,
      email,
      password,
      phone,
      address,
      dob,
      securityAnswer,
    });

    await page.getByRole("button", { name: "REGISTER" }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("status")).toContainText(
      "Register Successfully, please login"
    );

    await page.getByRole("textbox", { name: "Enter Your Email" }).fill(email);
    await page
      .getByRole("textbox", { name: "Enter Your Password" })
      .fill(password);
    await page.getByRole("button", { name: "LOGIN" }).click();

    const loginToast = page.locator('[role="status"]', {
      hasText: /login successfully/i,
    });
    await expect(loginToast).toBeVisible();

    await page.getByRole("button", { name }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();

    await expect(page).toHaveURL(/\/dashboard\/user$/);
    await expect(page.getByRole("heading", { name })).toBeVisible();
    await expect(page.getByRole("heading", { name: email })).toBeVisible();
    await expect(page.getByRole("heading", { name: address })).toBeVisible();
  });
});
