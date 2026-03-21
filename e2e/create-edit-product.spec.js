/*
 * Pan Xinping, A0228445B
 * -----------------------------------------------------------------------------
 * CREATE -> EDIT PRODUCT (HAPPY PATH INTEGRATION) - TEST DESIGN OVERVIEW
 * -----------------------------------------------------------------------------
 *
 * Why this file exists:
 * This spec validates the critical admin lifecycle path: create a product,
 * verify it is discoverable, edit it from products list, and verify updated
 * data is visible to storefront users. It provides confidence that core admin
 * workflows remain functional end-to-end.
 *
 * What test cases are covered:
 * 1) Admin authentication and route access to creation screen.
 * 2) Successful product creation with required inputs (including photo and
 *    shipping selection).
 * 3) Post-create navigation contract (redirect to admin products list).
 * 4) Storefront visibility of newly created product.
 * 5) Admin navigation from products list into product edit page.
 * 6) Successful product update (name/description/price changes).
 * 7) Post-update navigation contract and storefront visibility of edits.
 *
 * Testing decisions made:
 * - Use route mocking to emulate backend resources (auth, categories, product
 *   list, create, update, product-photo) so the test remains fast and stable.
 * - Keep a mutable in-memory products collection in the mock layer to model
 *   realistic create/update state transitions inside one scenario.
 * - Use dynamic product names (timestamp suffix) to avoid accidental collisions.
 * - Explicitly provide all required create fields (including shipping + photo)
 *   so this scenario remains a true happy path under current validation rules.
 * - Verify via two perspectives (admin and storefront) to ensure backend/UI
 *   data propagation is reflected in user-facing screens.
 *
 * Testing principles applied:
 * - Workflow/Scenario Testing:
 *   * Covers the complete business-critical sequence instead of isolated steps.
 * - End-to-End Contract Testing (with mocked dependencies):
 *   * Validates API contracts and page transitions together.
 * - State Transition Testing:
 *   * Product state transitions from not-existing -> created -> updated.
 * - Deterministic Testing:
 *   * Network behavior is controlled, reducing flaky outcomes.
 * - Assertion Triangulation:
 *   * Checks redirects, list navigation, and storefront rendering to strengthen
 *     confidence that change effects are real and observable.
 *
 * Why this is a well-designed test:
 * The spec focuses on the highest-value admin flow with strong end-user
 * observability and stable execution characteristics, making it an effective
 * regression guard for product management functionality.
 */

import { expect, test } from "@playwright/test";
import fs from "fs";
import path from "path";
import os from "os";

function getAdminCredentials() {
	return {
		email: process.env.E2E_ADMIN_EMAIL || `admin-${Date.now()}@example.com`,
		password: process.env.E2E_ADMIN_PASSWORD || "e2e-admin-password",
	};
}

class LoginPage {
	constructor(page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/login");
	}

	async loginAsAdmin(email, password) {
		await this.page.getByRole("textbox", { name: /enter your email/i }).fill(email);
		await this.page.getByRole("textbox", { name: /enter your password/i }).fill(password);
		await this.page.getByRole("button", { name: /login/i }).click();
	}
}

class CreateProductPage {
	constructor(page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/dashboard/admin/create-product");
	}

	nameInput() {
		return this.page.getByRole("textbox", { name: /write a name/i });
	}

	descriptionInput() {
		return this.page.getByRole("textbox", { name: /write a description/i });
	}

	priceInput() {
		return this.page.getByRole("spinbutton").first();
	}

	quantityInput() {
		return this.page.getByRole("spinbutton").nth(1);
	}

	photoInput() {
		return this.page.locator('input[type="file"][name="photo"]');
	}

	shippingSelect() {
		return this.page.locator(".form-select").nth(1);
	}

	async chooseShipping(option = "Yes") {
		await this.shippingSelect().click();
		await this.page
			.locator(".ant-select-dropdown .ant-select-item-option-content")
			.filter({ hasText: new RegExp(`^${option}$`, "i") })
			.first()
			.click();
	}

	createButton() {
		return this.page.locator('button:has-text("CREATE PRODUCT")');
	}

	async createProduct(data) {
		await this.nameInput().fill(data.name);
		await this.descriptionInput().fill(data.description);
		await this.priceInput().fill(data.price);
		await this.quantityInput().fill(data.quantity);
		const photoPath = createTempImageFile();
		await this.photoInput().setInputFiles(photoPath);
		await this.chooseShipping("Yes");
		await this.createButton().click();
		if (fs.existsSync(photoPath)) {
			fs.unlinkSync(photoPath);
		}
	}
}

class AdminProductsPage {
	constructor(page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/dashboard/admin/products");
	}

	async openProductForEdit(productName) {
		await this.page
			.getByRole("link", { name: new RegExp(productName, "i") })
			.first()
			.click();
		await this.page.waitForFunction(() => window.location.pathname.startsWith("/dashboard/admin/product/"));
	}
}

class UpdateProductPage {
	constructor(page) {
		this.page = page;
	}

	nameInput() {
		return this.page.getByRole("textbox", { name: /write a name/i });
	}

	descriptionInput() {
		return this.page.getByRole("textbox", { name: /write a description/i });
	}

	priceInput() {
		return this.page.getByRole("spinbutton").first();
	}

	updateButton() {
		return this.page.locator('button:has-text("UPDATE PRODUCT")');
	}

	async updateProduct(data) {
		await this.nameInput().fill(data.name);
		await this.descriptionInput().fill(data.description);
		await this.priceInput().fill(data.price);
		await this.updateButton().click();
	}
}

class HomePage {
	constructor(page) {
		this.page = page;
	}

	async goto() {
		await this.page.goto("/");
		await this.page.waitForLoadState("networkidle");
	}

	async expectProductVisible(productName) {
		await expect(this.page.getByRole("heading", { name: productName })).toBeVisible();
	}
}

function createTempImageFile() {
	const filePath = path.join(os.tmpdir(), `create-edit-${Date.now()}.png`);
	const buffer = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		"base64",
	);
	fs.writeFileSync(filePath, buffer);
	return filePath;
}

async function mockCreateEditProductApi(page) {
	const categories = [
		{ _id: "cat-electronics", name: "Electronics" },
		{ _id: "cat-books", name: "Book" },
	];

	const products = [
		{
			_id: "seed-1",
			name: "Novel",
			slug: "novel",
			description: "A bestselling novel...",
			price: 14.99,
			quantity: 10,
			shipping: true,
			category: categories[1],
		},
	];

	const extractFromMultipart = (rawBody, field) => {
		const match = rawBody.match(new RegExp(`name="${field}"\\r\\n\\r\\n([^\\r]+)`));
		return match ? match[1] : "";
	};

	await page.route("**/api/v1/auth/login", async (route) => {
		let requestBody = {};
		try {
			requestBody = route.request().postDataJSON?.() || {};
		} catch {
			requestBody = {};
		}
		const requestEmail = requestBody?.email || "admin@example.com";

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "login successfully",
				user: {
					name: "Admin",
					email: requestEmail,
					phone: "x",
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

	await page.route("**/api/v1/product/product-count", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ total: products.length }),
		});
	});

	await page.route("**/api/v1/product/product-list/1", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ products }),
		});
	});

	await page.route("**/api/v1/product/get-product", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ products }),
		});
	});

	await page.route("**/api/v1/product/get-product/*", async (route) => {
		const slug = route.request().url().split("/").pop();
		const product = products.find((item) => item.slug === slug);

		await route.fulfill({
			status: product ? 200 : 404,
			contentType: "application/json",
			body: JSON.stringify(product ? { success: true, product } : { success: false }),
		});
	});

	await page.route("**/api/v1/product/create-product", async (route) => {
		const rawBody = (await route.request().postDataBuffer())?.toString("utf8") || "";
		const name = extractFromMultipart(rawBody, "name") || `Created Product ${Date.now()}`;
		const description = extractFromMultipart(rawBody, "description") || "Created from UI";
		const price = Number(extractFromMultipart(rawBody, "price") || "50");
		const quantity = Number(extractFromMultipart(rawBody, "quantity") || "5");
		const createdProduct = {
			_id: `prod-${Date.now()}`,
			name,
			slug: name.toLowerCase().trim().replace(/\s+/g, "-"),
			description,
			price,
			quantity,
			shipping: true,
			category: categories[0],
		};

		products.push(createdProduct);

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "Product Created Successfully",
				product: createdProduct,
			}),
		});
	});

	await page.route("**/api/v1/product/update-product/*", async (route) => {
		const id = route.request().url().split("/").pop();
		const productIndex = products.findIndex((item) => item._id === id);

		if (productIndex === -1) {
			await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ success: false, message: "Product not found" }),
			});
			return;
		}

		const rawBody = (await route.request().postDataBuffer())?.toString("utf8") || "";
		const updatedName = extractFromMultipart(rawBody, "name") || products[productIndex].name;
		const updatedDescription =
			extractFromMultipart(rawBody, "description") || products[productIndex].description;
		const updatedPrice = Number(extractFromMultipart(rawBody, "price") || products[productIndex].price);
		products[productIndex] = {
			...products[productIndex],
			name: updatedName,
			slug: updatedName.toLowerCase().trim().replace(/\s+/g, "-"),
			description: updatedDescription,
			price: updatedPrice,
		};

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "Product Updated Successfully",
				product: products[productIndex],
			}),
		});
	});

	await page.route("**/api/v1/product/product-photo/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "image/svg+xml",
			body: "<svg xmlns='http://www.w3.org/2000/svg' width='2' height='2'></svg>",
		});
	});
}

test.describe("Create and edit product flow", () => {
	test("admin can create a product and edit it from products list", async ({ page }) => {
		await mockCreateEditProductApi(page);

		const loginPage = new LoginPage(page);
		const createProductPage = new CreateProductPage(page);
		const productsPage = new AdminProductsPage(page);
		const updateProductPage = new UpdateProductPage(page);
		const homePage = new HomePage(page);

		const createdProductName = `MCP Product ${Date.now()}`;
		const updatedProductName = `${createdProductName} Updated`;
		const adminCredentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(adminCredentials.email, adminCredentials.password);
		await createProductPage.goto();
		await createProductPage.createProduct({
			name: createdProductName,
			description: "MCP create-edit flow description",
			price: "88",
			quantity: "7",
		});

		await page.waitForFunction(() => window.location.pathname === "/dashboard/admin/products");
		await homePage.goto();
		await homePage.expectProductVisible(createdProductName);

		await productsPage.goto();
		await productsPage.openProductForEdit(createdProductName);

		await updateProductPage.updateProduct({
			name: updatedProductName,
			description: "Updated description from MCP flow",
			price: "99",
		});

		await page.waitForFunction(() => window.location.pathname === "/dashboard/admin/products");
		await homePage.goto();
		await homePage.expectProductVisible(updatedProductName);
	});
});
