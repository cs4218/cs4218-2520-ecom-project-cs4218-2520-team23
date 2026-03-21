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

const mockRegisterDuplicate = async (page) => {
  await page.route("**/api/v1/auth/register", (route) =>
    route.fulfill({
      status: 409,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        message: "Already Register please login",
      }),
    })
  );
};

test.describe("register errors", () => {
  test.beforeEach(async ({ page }) => {
    await clearAuthStorage(page);
  });

  test("registering twice shows already-registered error", async ({ page }) => {
    const uniqueId = Date.now();
    const name = `Duplicate User ${uniqueId}`;
    const email = `duplicate${uniqueId}@example.com`;
    const password = "Password123!";
    const phone = "12345678";
    const address = `123 Duplicate Street ${uniqueId}`;
    const dob = "1990-01-01";
    const securityAnswer = "Soccer";

    await mockRegisterSuccess(page);
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

    await mockRegisterDuplicate(page);
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

    const duplicateToast = page.locator('[role="status"]', {
      hasText: /already register please login/i,
    });
    await expect(duplicateToast).toBeVisible();
  });

  test("missing required fields shows error", async ({ page }) => {
    const baseData = buildRegisterData();
    const requiredFields = [
      "name",
      "email",
      "password",
      "phone",
      "address",
      "dob",
      "securityAnswer",
    ];

    for (const field of requiredFields) {
      await page.goto("/register");
      const data = { ...baseData, [field]: undefined };
      await fillRegisterForm(page, data);
      await page.getByRole("button", { name: "REGISTER" }).click();

      const missingToast = page.locator('[role="status"]', {
        hasText: /please fill all required fields/i,
      });
      await expect(missingToast).toBeVisible();
    }
  });

  test("basic register field validation", async ({ page }) => {
    const baseData = buildRegisterData();
    await mockRegisterSuccess(page);
    const cases = [
      {
        field: "email",
        value: "not-an-email",
        message: /please enter a valid email address/i,
      },
      {
        field: "phone",
        value: "123abc",
        message: /phone must be numbers only/i,
      },
    ];

    for (const testCase of cases) {
      await page.goto("/register");
      const data = { ...baseData, [testCase.field]: testCase.value };
      await fillRegisterForm(page, data);
      await page.getByRole("button", { name: "REGISTER" }).click();

      const validationToast = page.locator('[role="status"]', {
        hasText: testCase.message,
      });
      await expect(validationToast).toBeVisible();
    }

    await page.goto("/register");
    const dobInput = page.getByTestId("dob-input");
    await expect(dobInput).toHaveAttribute("type", "date");
    await dobInput.evaluate((input) => {
      input.value = "not-a-date";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await expect(dobInput).toHaveValue("");
  });
});
