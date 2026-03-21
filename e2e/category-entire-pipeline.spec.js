// Ng Hong Ray A0253509A
const { test, expect } = require("@playwright/test");

test.describe("Full Category Pipeline", () => {
	test("admin login, create, view, edit, and delete category with mocked API", async ({ page }) => {
		const adminUser = {
			name: "asd",
			email: "admin1@gmail.com",
			phone: "123",
			role: 1,
		};

		const createdCategoryName = `Empty Category ${Date.now()}`;
		const editedCategoryName = `Bookedit ${Date.now()}`;

		const categories = [
			{ _id: "cat-1", name: "Electronics", slug: "electronics" },
			{ _id: "cat-2", name: "Book", slug: "book" },
			{ _id: "cat-3", name: "Clothing", slug: "clothing" },
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
			book: [
				{
					_id: "prod-3",
					name: "Clean Code",
					slug: "clean-code",
					price: 49.99,
					description: "A software engineering classic.",
					category: { _id: "cat-2", name: "Book", slug: "book" },
				},
			],
			clothing: [],
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
			const newCategory = {
				_id: `cat-${Date.now()}`,
				name: body.name,
				slug: body.name.toLowerCase().replace(/\s+/g, "-"),
			};

			categories.push(newCategory);
			categoryProducts[newCategory.slug] = [];

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

		await page.route("**/api/v1/category/update-category/*", async (route) => {
			const body = route.request().postDataJSON();
			const id = route.request().url().split("/").pop();

			const target = categories.find((c) => c._id === id);
			if (target) {
				delete categoryProducts[target.slug];
				target.name = body.name;
				target.slug = body.name.toLowerCase().replace(/\s+/g, "-");
				categoryProducts[target.slug] = [];
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
				const deleted = categories[index];
				delete categoryProducts[deleted.slug];
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

		// 1. Login as admin
		await page.goto("http://localhost:3000/");
		await page.getByRole("link", { name: /login/i }).click();
		await page.getByRole("textbox", { name: /(enter\s+your\s+)?email/i }).fill("admin1@gmail.com");
		await page.getByRole("textbox", { name: /(enter\s+your\s+)?password/i }).fill("asd");
		await page.getByRole("button", { name: /log\s?in/i }).click();

		await expect(page.getByText(/login successfully/i)).toBeVisible();

		await page.evaluate(
			({ adminUser }) => {
				localStorage.setItem(
					"auth",
					JSON.stringify({
						user: adminUser,
						token: "fake-jwt-token",
					}),
				);
			},
			{ adminUser },
		);

		// 2. Verify admin
		await page.goto("http://localhost:3000/dashboard/admin");
		await expect(page.getByRole("main")).toContainText("Admin Name : asd");
		await expect(page.getByRole("main")).toContainText("Admin Email : admin1@gmail.com");
		await expect(page.getByRole("main")).toContainText("Admin Contact : 123");

		// 3. Create category
		await page.goto("http://localhost:3000/dashboard/admin/create-category");
		await expect(page.getByRole("heading", { name: /manage category/i })).toBeVisible();

		await page.getByRole("textbox", { name: /enter new category/i }).fill(createdCategoryName);
		await page.getByRole("button", { name: /submit/i }).click();

		await expect(page.getByText(/new category created/i)).toBeVisible();
		await expect(page.getByRole("textbox", { name: /enter new category/i })).toBeEmpty();

		const createdRow = page.locator("tbody tr").filter({
			hasText: new RegExp(createdCategoryName, "i"),
		});
		await expect(createdRow).toBeVisible();

		// 4. Verify all categories shown in /categories
		await page.goto("http://localhost:3000/categories");
		const main = page.getByRole("main");
		for (const category of categories) {
			await expect(main).toContainText(category.name);
		}

		// 5. Click populated category and verify items
		await page.getByRole("link", { name: /electronics/i }).click();
		await expect(page.getByRole("main")).toContainText("Laptop");
		await expect(page.getByRole("main")).toContainText("Smartphone");

		// 6. Click created empty category and verify empty
		await page.goto("http://localhost:3000/categories");
		await page.getByRole("link", { name: new RegExp(createdCategoryName, "i") }).click();
		await expect(page.getByRole("main")).toContainText(createdCategoryName);
		await expect(page.getByRole("main")).toContainText(/0 result|0 product|no product|no products|empty/i);

		// 7. Edit Book category
		await page.goto("http://localhost:3000/dashboard/admin/create-category");
		const bookRow = page.locator("tbody tr").filter({ hasText: /Book/i }).first();
		await bookRow.getByRole("button", { name: /edit/i }).click();

		await page
			.getByRole("dialog")
			.getByRole("textbox", { name: /enter new category/i })
			.fill(editedCategoryName);
		await page
			.getByRole("dialog")
			.getByRole("button", { name: /submit/i })
			.click();

		await expect(page.getByText(new RegExp(`${editedCategoryName} is updated`, "i"))).toBeVisible();

		const editedRow = page.locator("tbody tr").filter({
			hasText: new RegExp(editedCategoryName, "i"),
		});
		await expect(editedRow).toBeVisible();

		await page.goto("http://localhost:3000/categories");
		await expect(page.getByRole("main")).toContainText(editedCategoryName);

		// 8. Delete edited category
		await page.goto("http://localhost:3000/dashboard/admin/create-category");
		const rowToDelete = page
			.locator("tbody tr")
			.filter({
				hasText: new RegExp(editedCategoryName, "i"),
			})
			.first();
		await rowToDelete.getByRole("button", { name: /delete/i }).click();

		await expect(page.getByText(/category is deleted/i)).toBeVisible();
		await expect(
			page.locator("tbody tr").filter({
				hasText: new RegExp(editedCategoryName, "i"),
			}),
		).toHaveCount(0);

		await page.goto("http://localhost:3000/categories");
		await expect(page.getByRole("main")).not.toContainText(editedCategoryName);
	});
});
