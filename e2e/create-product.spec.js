/*
 * Pan Xinping, A0228445B
 * -----------------------------------------------------------------------------
 * CREATE PRODUCT (NEGATIVE PATHS) - TEST DESIGN OVERVIEW
 * -----------------------------------------------------------------------------
 *
 * Why this file exists:
 * This suite validates that the Create Product screen protects data quality and
 * gives users actionable feedback for invalid submissions and backend failures.
 * The goal is to verify user-visible behavior, not internal implementation.
 *
 * What test cases are covered:
 * 1) Missing required fields: name, description, price, quantity, photo, shipping option.
 * 2) Invalid numeric inputs: zero/negative price, negative quantity.
 * 3) File constraint: uploaded photo exceeds size limit.
 * 4) Backend/API error classes: duplicate name, generic server error, network
 *    timeout/failure.
 *
 * Testing decisions made:
 * - Use deterministic route mocking for auth/category/create endpoints so tests
 *   remain stable and isolate UI behavior from backend availability.
 * - Keep selectors role-based and text-based where possible to reduce coupling
 *   with DOM structure changes.
 * - Assert both feedback and state: verify error toast content and ensure user
 *   remains on the create page after failed submission.
 * - For scenarios that require all other fields valid (for example duplicate/
 *   server/network), explicitly fill every prerequisite field (including
 *   shipping) so the intended error source is the only variable.
 *
 * Testing principles applied:
 * - Equivalence Partitioning:
 *   * Valid partition: complete, well-formed payload.
 *   * Invalid partitions: missing required field, invalid number domain,
 *     oversized file, missing shipping choice, backend rejection.
 * - Boundary Value Analysis was applied to find negative cases around numeric fields:
 *   * Price at 0 and below 0.
 *   * Quantity below 0.
 *   * Photo just over allowed limit (> 1MB).
 * - Negative Testing / Robustness:
 *   * Network abort and 5xx backend errors.
 * - Single-Fault Isolation:
 *   * Each test manipulates one primary failure condition at a time.
 * - User-Oriented Oracle:
 *   * Assertions check visible messages and navigation outcome, matching real
 *     user expectations instead of implementation internals.
 *
 * Why this is a well-designed set:
 * The suite combines input validation, boundary checks, and operational failure
 * handling while maintaining deterministic execution. Together these tests give
 * high confidence that product creation fails safely, explains why, and avoids
 * unintended navigation on invalid submissions.
 */

import { expect, test } from "@playwright/test";

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

	photInput() {
		return this.page.locator('input[type="file"][name="photo"]');
	}

	createButton() {
		return this.page.locator('button:has-text("CREATE PRODUCT")');
	}

	async fillForm(data) {
		if (data.name !== undefined) await this.nameInput().fill(data.name);
		if (data.description !== undefined) await this.descriptionInput().fill(data.description);
		if (data.price !== undefined) await this.priceInput().fill(data.price);
		if (data.quantity !== undefined) await this.quantityInput().fill(data.quantity);
	}

	async expectErrorToast(errorPattern) {
		await expect(this.page.locator("div").filter({ hasText: errorPattern }).first()).toBeVisible({
			timeout: 5000,
		});
	}

	async expectStillOnCreatePage() {
		await expect(this.page).toHaveURL(/\/dashboard\/admin\/create-product$/);
	}
}

async function mockCreateProductApi(page, options = {}) {
	const { failureType = null, failureMessage = null } = options;

	const categories = [
		{ _id: "cat-electronics", name: "Electronics" },
		{ _id: "cat-books", name: "Book" },
	];

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
				user: { name: "Admin", email: requestEmail, phone: "x", role: 1 },
				token: "fake-jwt-token",
			}),
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
			body: JSON.stringify({ success: true, category: categories }),
		});
	});

	await page.route("**/api/v1/product/create-product", async (route) => {
		if (failureType === "duplicate") {
			return await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: failureMessage || "A product with this name already exists",
					message: failureMessage || "A product with this name already exists",
				}),
			});
		}

		if (failureType === "server") {
			return await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: failureMessage || "Error in creating product",
					message: failureMessage || "Error in creating product",
				}),
			});
		}

		if (failureType === "network") {
			return await route.abort("timedout");
		}

		await route.fulfill({
			status: 201,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "Product Created Successfully",
				products: { _id: `prod-${Date.now()}`, name: "Test Product" },
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

test.describe("Create Product - Negative Paths", () => {
	test("should show error when name field is empty on submit", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/name is required|please enter a name/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when description field is empty on submit", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/description is required|please enter a description/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when price field is empty on submit", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/price is required|please enter a price/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when quantity field is empty on submit", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/quantity is required|please enter a quantity/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when photo is not uploaded", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/photo is required|please upload a photo/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when price is zero", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("0");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/price|greater than|must be positive/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when price is negative", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("-10");
		await createPage.quantityInput().fill("5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/price|greater than|must be positive/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when quantity is negative", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("-5");

		await createPage.createButton().click();
		await createPage.expectErrorToast(/quantity|negative|must be positive/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when photo file is too large", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");

		const largePhotoPath = await createTempLargeFile(page, 2 * 1024 * 1024);
		await createPage.photInput().setInputFiles(largePhotoPath);

		await createPage.createButton().click();
		await createPage.expectErrorToast(/photo|should be less than|too large|1mb/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when shipping option is not selected", async ({ page }) => {
		await mockCreateProductApi(page);

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");

		const fakePhotoPath = await createTempImageFile(page);
		await createPage.photInput().setInputFiles(fakePhotoPath);

		await createPage.createButton().click();
		await createPage.expectErrorToast(/select a shipping option|shipping is required/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when duplicate product name is submitted", async ({ page }) => {
		await mockCreateProductApi(page, {
			failureType: "duplicate",
			failureMessage: "A product with this name already exists",
		});

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Existing Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");
		await createPage.chooseShipping("Yes");

		const fakePhotoPath = await createTempImageFile(page);
		await createPage.photInput().setInputFiles(fakePhotoPath);

		await createPage.createButton().click();
		await createPage.expectErrorToast(/already exists|duplicate/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when server returns 500 error", async ({ page }) => {
		await mockCreateProductApi(page, {
			failureType: "server",
			failureMessage: "Error in creating product",
		});

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");
		await createPage.chooseShipping("Yes");

		const fakePhotoPath = await createTempImageFile(page);
		await createPage.photInput().setInputFiles(fakePhotoPath);

		await createPage.createButton().click();
		await createPage.expectErrorToast(/error|something went wrong|failed/i);
		await createPage.expectStillOnCreatePage();
	});

	test("should show error when network connection fails", async ({ page }) => {
		await mockCreateProductApi(page, { failureType: "network" });

		const loginPage = new LoginPage(page);
		const createPage = new CreateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await createPage.goto();
		await createPage.nameInput().fill("Valid Product Name");
		await createPage.descriptionInput().fill("Valid description");
		await createPage.priceInput().fill("50");
		await createPage.quantityInput().fill("5");
		await createPage.chooseShipping("Yes");

		const fakePhotoPath = await createTempImageFile(page);
		await createPage.photInput().setInputFiles(fakePhotoPath);

		await createPage.createButton().click();
		await createPage.expectErrorToast(/error|timeout|something went wrong/i);
		await createPage.expectStillOnCreatePage();
	});
});

async function createTempImageFile(page) {
	const buffer = Buffer.from(
		"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
		"base64",
	);
	const fs = await import("fs").then((m) => m.default);
	const path = await import("path").then((m) => m.default);
	const tmpDir = require("os").tmpdir();
	const filePath = path.join(tmpDir, `test-image-${Date.now()}.png`);
	fs.writeFileSync(filePath, buffer);
	return filePath;
}

async function createTempLargeFile(page, sizeBytes) {
	const fs = await import("fs").then((m) => m.default);
	const path = await import("path").then((m) => m.default);
	const tmpDir = require("os").tmpdir();
	const filePath = path.join(tmpDir, `test-large-${Date.now()}.png`);
	fs.writeFileSync(filePath, Buffer.alloc(sizeBytes));
	return filePath;
}
