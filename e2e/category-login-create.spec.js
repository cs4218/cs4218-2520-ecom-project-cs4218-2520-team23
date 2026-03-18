// Ng Hong Ray A0253509A
const { test, expect } = require("@playwright/test");

test.describe("Category Creation", () => {
  test("Admin Login", async ({ page }) => {
    const categories = [
      { _id: "cat-1", name: "Clothing", slug: "clothing" },
      { _id: "cat-2", name: "Book", slug: "book" },
    ];

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "login successfully",
          user: {
            name: "asd",
            email: "admin1@gmail.com",
            phone: "123",
            role: 1,
          },
          token: "fake-jwt-token",
        }),
      });
    });

    await page.route("**/api/v1/auth/user-auth", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/v1/auth/admin-auth", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.route("**/api/v1/category/get-category", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          category: categories,
        }),
      });
    });

    await page.route("**/api/v1/category/create-category", async (route) => {
      const body = route.request().postDataJSON();
      const newCategory = {
        _id: `cat-${Date.now()}`,
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, "-"),
      };

      categories.push(newCategory);

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "New category created",
          category: newCategory,
        }),
      });
    });

    await page.goto("http://localhost:3000/");

    await page.getByRole("link", { name: /login/i }).click();
    await page
      .getByRole("textbox", { name: /enter your email/i })
      .fill("admin1@gmail.com");
    await page
      .getByRole("textbox", { name: /enter your password/i })
      .fill("asd");
    await page.getByRole("button", { name: /login/i }).click();

    await expect(page.getByText(/login successfully/i)).toBeVisible();

    await page.evaluate(() => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: {
            name: "asd",
            email: "admin1@gmail.com",
            phone: "123",
            role: 1,
          },
          token: "fake-jwt-token",
        })
      );
    });

    await page.goto("http://localhost:3000/dashboard/admin");
    await expect(page.getByRole("main")).toContainText("Admin Name : asd");
    await expect(page.getByRole("main")).toContainText(
      "Admin Email : admin1@gmail.com"
    );
    await expect(page.getByRole("main")).toContainText("Admin Contact : 123");
  });

  test("Create a category", async ({ page }) => {
    const categoryName = `new category ${Date.now()}`;

    const categories = [
    { _id: "cat-1", name: "Clothing", slug: "clothing" },
    { _id: "cat-2", name: "Book", slug: "book" },
    ];

    await page.route("**/api/v1/auth/login", async (route) => {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
        success: true,
        message: "login successfully",
        user: {
            name: "asd",
            email: "admin1@gmail.com",
            phone: "123",
            role: 1,
        },
        token: "fake-jwt-token",
        }),
    });
    });

    await page.route("**/api/v1/auth/user-auth", async (route) => {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
    });
    });

    await page.route("**/api/v1/auth/admin-auth", async (route) => {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
    });
    });

    await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
        success: true,
        category: categories,
        }),
    });
    });

    await page.route("**/api/v1/category/create-category", async (route) => {
    const body = route.request().postDataJSON();
    const newCategory = {
        _id: `cat-${Date.now()}`,
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, "-"),
    };

    categories.push(newCategory);

    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
        success: true,
        message: "New category created",
        category: newCategory,
        }),
    });
    });

    await page.goto("http://localhost:3000/");

    await page.getByRole("link", { name: /login/i }).click();
    await page.getByRole("textbox", { name: /enter your email/i }).fill("admin1@gmail.com");
    await page.getByRole("textbox", { name: /enter your password/i }).fill("asd");
    await page.getByRole("button", { name: /login/i }).click();

    await page.evaluate(() => {
    localStorage.setItem(
        "auth",
        JSON.stringify({
        user: {
            name: "asd",
            email: "admin1@gmail.com",
            phone: "123",
            role: 1,
        },
        token: "fake-jwt-token",
        })
    );
    });

    await page.goto("http://localhost:3000/dashboard/admin/create-category");

    await expect(page.getByRole("heading", { name: /manage category/i })).toBeVisible();

    await page.getByRole("textbox", { name: /enter new category/i }).fill(categoryName);
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/new category created/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /enter new category/i })).toBeEmpty();

    const categoryRow = page.locator("tbody tr").filter({
    hasText: new RegExp(categoryName, "i"),
    });
    await expect(categoryRow).toBeVisible();

    // Check all categories now shown, including the new one
    for (const category of categories) {
    const row = page.locator("tbody tr").filter({
        hasText: new RegExp(category.name, "i"),
    });
    await expect(row).toBeVisible();
    }

    await page.goto("http://localhost:3000/categories");
    // check all categories, including the newly created one
    const main = page.getByRole("main");
    for (const category of categories) {
        await expect(main).toContainText(category.name);
    }
  });
});