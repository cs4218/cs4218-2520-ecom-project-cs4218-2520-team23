// Ng Hong Ray A0253509A
const { test, expect } = require("@playwright/test");

test.describe("Category Editing and Deleting", () => {
  test("Edit category", async ({ page }) => {
    const editedCategoryName = `Bookedit ${Date.now()}`;

    const categories = [
      { _id: "cat-1", name: "Clothing", slug: "clothing" },
      { _id: "cat-2", name: "Book", slug: "book" },
      { _id: "cat-3", name: "Electronics", slug: "electronics" },
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

    await page.route("**/api/v1/category/update-category/*", async (route) => {
      const body = route.request().postDataJSON();
      const id = route.request().url().split("/").pop();

      const target = categories.find((c) => c._id === id);
      if (target) {
        target.name = body.name;
        target.slug = body.name.toLowerCase().replace(/\s+/g, "-");
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: `${body.name} is updated`,
          category: target,
        }),
      });
    });

    await page.route("**/api/v1/category/delete-category/*", async (route) => {
      const id = route.request().url().split("/").pop();
      const index = categories.findIndex((c) => c._id === id);

      if (index !== -1) {
        categories.splice(index, 1);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "category is deleted",
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

    // Edit "Book"
    const bookRow = page.locator("tbody tr").filter({ hasText: /book/i });
    await bookRow.getByRole("button", { name: /edit/i }).click();

    await page.getByRole("dialog").getByRole("textbox", { name: /enter new category/i }).fill(editedCategoryName);
    await page.getByRole("dialog").getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(new RegExp(`${editedCategoryName} is updated`, "i"))).toBeVisible();

    const editedRow = page.locator("tbody tr").filter({hasText: new RegExp(editedCategoryName, "i"),});
    await expect(editedRow).toBeVisible();
    await expect(page.locator("tbody tr").filter({ hasText: /^Book$/i })).toHaveCount(0);

    // Check /categories page reflects edited category
    await page.goto("http://localhost:3000/categories");
    await expect(page.getByRole("main")).toContainText(editedCategoryName);
  });
  test("Delete category", async ({ page }) => {
    const categoryToDelete = "Bookedit";

    const categories = [
      { _id: "cat-1", name: "Clothing", slug: "clothing" },
      { _id: "cat-2", name: categoryToDelete, slug: "bookedit" },
      { _id: "cat-3", name: "Electronics", slug: "electronics" },
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

    await page.route("**/api/v1/category/delete-category/*", async (route) => {
      const id = route.request().url().split("/").pop();
      const index = categories.findIndex((c) => c._id === id);

      if (index !== -1) {
        categories.splice(index, 1);
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "category is deleted",
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

    const rowToDelete = page.locator("tbody tr").filter({
      hasText: new RegExp(categoryToDelete, "i"),
    });
    await rowToDelete.getByRole("button", { name: /delete/i }).click();

    await expect(page.getByText(/category is deleted/i)).toBeVisible();
    await expect(
      page.locator("tbody tr").filter({
        hasText: new RegExp(categoryToDelete, "i"),
      })
    ).toHaveCount(0);

    await page.goto("http://localhost:3000/categories");
    await expect(page.getByRole("main")).not.toContainText(categoryToDelete);
  });
});