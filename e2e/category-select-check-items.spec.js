// Ng Hong Ray A0253509A
const { test, expect } = require("@playwright/test");

test.describe("Category navigation with mocked category creation", () => {
  test("create empty category, verify categories list, populated category, and empty category", async ({
    page,
  }) => {
    const newCategoryName = `Empty Category ${Date.now()}`;
    const newCategorySlug = newCategoryName.toLowerCase().replace(/\s+/g, "-");

    const adminUser = {
      name: "asd",
      email: "admin1@gmail.com",
      phone: "123",
      role: 1,
    };

    const categories = [
      { _id: "cat-1", name: "Electronics", slug: "electronics" },
      { _id: "cat-2", name: "Books", slug: "books" },
    ];

    const categoryProducts = {
      electronics: [
        {
          _id: "prod-1",
          name: "Laptop",
          slug: "laptop",
          price: 1499.99,
          description: "A powerful laptop for work and study.",
          category: { _id: "cat-1", name: "Electronics", slug: "electronics" },
        },
        {
          _id: "prod-2",
          name: "Smartphone",
          slug: "smartphone",
          price: 999.99,
          description: "A high-end smartphone with advanced camera features.",
          category: { _id: "cat-1", name: "Electronics", slug: "electronics" },
        },
      ],
      books: [
        {
          _id: "prod-3",
          name: "Clean Code",
          slug: "clean-code",
          price: 49.99,
          description: "A software engineering classic.",
          category: { _id: "cat-2", name: "Books", slug: "books" },
        },
      ],
    };

    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "login successfully",
          user: adminUser,
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
      const createdCategory = {
        _id: `cat-${Date.now()}`,
        name: body.name,
        slug: body.name.toLowerCase().replace(/\s+/g, "-"),
      };

      categories.push(createdCategory);
      categoryProducts[createdCategory.slug] = [];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          message: "New category created",
          category: createdCategory,
        }),
      });
    });

    // Adjust this route if your app uses a different endpoint for products by category
    await page.route("**/api/v1/product/product-category/*", async (route) => {
      const slug = route.request().url().split("/").pop();
      const products = categoryProducts[slug] || [];

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          category: categories.find((c) => c.slug === slug) || null,
          products,
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

    await page.evaluate(({ adminUser }) => {
      localStorage.setItem(
        "auth",
        JSON.stringify({
          user: adminUser,
          token: "fake-jwt-token",
        })
      );
    }, { adminUser });

    // Create a new empty category
    await page.goto("http://localhost:3000/dashboard/admin/create-category");
    await expect(
      page.getByRole("heading", { name: /manage category/i })
    ).toBeVisible();

    await page
      .getByRole("textbox", { name: /enter new category/i })
      .fill(newCategoryName);
    await page.getByRole("button", { name: /submit/i }).click();

    await expect(page.getByText(/new category created/i)).toBeVisible();

    // Go to categories page and check all categories are shown
    await page.goto("http://localhost:3000/categories");

    for (const category of categories) {
      await expect(page.getByRole("main")).toContainText(category.name);
    }

    // Click one populated category and check products exist
    await page.getByRole("link", { name: /electronics/i }).click();
    await expect(page.getByRole("main")).toContainText("Laptop");
    await expect(page.getByRole("main")).toContainText("Smartphone");

    // Go back to categories page
    await page.goto("http://localhost:3000/categories");

    // Click the newly created empty category and check no products inside
    await page.getByRole("link", { name: new RegExp(newCategoryName, "i") }).click();

    await expect(page.getByRole("main")).toContainText(newCategoryName);

    // Choose the one that matches your UI best
    await expect(page.getByRole("main")).toContainText(/0 result|0 product|no product|no products|empty/i);
  });
});