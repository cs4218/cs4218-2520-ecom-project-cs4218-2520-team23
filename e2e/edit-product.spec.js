/*
 * Pan Xinping, A0228445B
 * -----------------------------------------------------------------------------
 * EDIT PRODUCT (NEGATIVE PATHS) - TEST DESIGN OVERVIEW
 * -----------------------------------------------------------------------------
 *
 * Why this file exists:
 * This suite ensures the Update Product screen handles invalid edits, stale
 * resources, authorization failures, and operational faults with clear feedback
 * and safe UI behavior.
 *
 * What test cases are covered:
 * 1) Resource loading failures: missing/non-existent product slug (404).
 * 2) Required-field violations during update: cleared name/description/price/
 *    quantity.
 * 3) Numeric invalidity: zero/negative price, negative quantity.
 * 4) File validation: replacement photo too large.
 * 5) Conflict scenarios: duplicate product name and concurrent update conflict.
 * 6) Infrastructure failures: server 500 and network timeout.
 * 7) Access control failures: unauthorized (401) and forbidden (403).
 *
 * Testing decisions made:
 * - Keep all API outcomes deterministic with route mocks for load/update/delete
 *   so each test targets one behavior without external nondeterminism.
 * - Validate UX contracts beyond toast text where relevant:
 *   * Not-found state should render a visible not-found message.
 *   * Update/delete actions should be disabled when item is unavailable.
 * - Use broad-but-intentful regex assertions for messages to avoid brittle
 *   coupling to exact punctuation while still enforcing semantic correctness.
 * - Preserve navigation assertions to ensure failures do not silently route the
 *   user away from the edit context.
 *
 * Testing principles applied:
 * - Equivalence Partitioning:
 *   * Valid update partition versus invalid partitions (missing fields, invalid
 *     ranges, missing resource, auth denied, conflict, infrastructure errors).
 * - Boundary Value Analysis was applied to find negative cases around numeric fields:
 *   * Price = 0, price < 0, quantity < 0, oversize file boundary (> 1MB).
 * - State Transition Testing:
 *   * Existing product -> missing product.
 *   * Authorized -> unauthorized/forbidden.
 *   * Clean update -> conflict due to concurrent changes.
 * - Negative Testing / Error Guessing:
 *   * Timeout and 5xx paths are explicitly covered.
 * - Observability-Driven Assertions:
 *   * Assertions target what end users can see and do, not private app state.
 *
 * Why this is a well-designed set:
 * The suite captures both data-validation and lifecycle hazards for edit flows,
 * including concurrency and auth edge cases that are commonly missed. It offers
 * broad defect-detection power while staying deterministic and maintainable.
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

class UpdateProductPage {
	constructor(page) {
		this.page = page;
	}

	async goto(slug) {
		await this.page.goto(`/dashboard/admin/product/${slug}`);
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

	photInput() {
		return this.page.locator('input[type="file"][name="photo"]');
	}

	updateButton() {
		return this.page.locator('button:has-text("UPDATE PRODUCT")');
	}

	deleteButton() {
		return this.page.locator('button:has-text("DELETE PRODUCT")');
	}

	async expectErrorToast(errorPattern) {
		await expect(this.page.locator("div").filter({ hasText: errorPattern }).first()).toBeVisible({
			timeout: 5000,
		});
	}

	async expectStillOnEditPage() {
		await expect(this.page).toHaveURL(/\/dashboard\/admin\/product\//);
	}

	async expectNotFoundMessage() {
		await expect(
			this.page
				.locator("div")
				.filter({ hasText: /not found|does not exist|product not available/i })
				.first(),
		).toBeVisible({ timeout: 5000 });
	}

	async expectUpdateButtonDisabled() {
		await expect(this.updateButton()).toBeDisabled();
	}

	async expectDeleteButtonDisabled() {
		await expect(this.deleteButton()).toBeDisabled();
	}

	async expectCurrentName() {
		return await this.nameInput().inputValue();
	}
}

async function mockEditProductApi(page, options = {}) {
	const { productExists = true, failureType = null, failureMessage = null, authStatus = 200 } = options;

	const categories = [
		{ _id: "cat-electronics", name: "Electronics" },
		{ _id: "cat-books", name: "Book" },
	];

	const existingProduct = {
		_id: "prod-1",
		name: "Existing Product",
		slug: "existing-product",
		description: "This is an existing product",
		price: 100,
		quantity: 50,
		shipping: true,
		category: categories[0],
		photo: { data: "", contentType: "image/png" },
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
				user: { name: "Admin", email: requestEmail, phone: "x", role: 1 },
				token: "fake-jwt-token",
			}),
		});
	});

	await page.route("**/api/v1/auth/admin-auth", async (route) => {
		if (authStatus === 401 || authStatus === 403) {
			return await route.fulfill({
				status: authStatus,
				contentType: "application/json",
				body: JSON.stringify({ ok: false }),
			});
		}

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

	await page.route("**/api/v1/product/get-product/*", async (route) => {
		if (!productExists) {
			return await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ success: false, message: "Product not found" }),
			});
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ success: true, product: existingProduct }),
		});
	});

	await page.route("**/api/v1/product/update-product/*", async (route) => {
		if (authStatus === 401 || authStatus === 403) {
			return await route.fulfill({
				status: authStatus,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: authStatus === 401 ? "Unauthorized" : "Forbidden",
					message: authStatus === 401 ? "Unauthorized" : "Forbidden",
				}),
			});
		}

		if (!productExists) {
			return await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ success: false, error: "Product not found", message: "Product not found" }),
			});
		}

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

		if (failureType === "conflict") {
			return await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: failureMessage || "Product was updated by another user",
					message: failureMessage || "Product was updated by another user",
				}),
			});
		}

		if (failureType === "server") {
			return await route.fulfill({
				status: 500,
				contentType: "application/json",
				body: JSON.stringify({
					success: false,
					error: failureMessage || "Error in updating product",
					message: failureMessage || "Error in updating product",
				}),
			});
		}

		if (failureType === "network") {
			return await route.abort("timedout");
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "Product Updated Successfully",
				products: existingProduct,
			}),
		});
	});

	await page.route("**/api/v1/product/delete-product/*", async (route) => {
		if (authStatus === 401 || authStatus === 403) {
			return await route.fulfill({
				status: authStatus,
				contentType: "application/json",
				body: JSON.stringify({ success: false, error: "Unauthorized", message: "Unauthorized" }),
			});
		}

		if (!productExists) {
			return await route.fulfill({
				status: 404,
				contentType: "application/json",
				body: JSON.stringify({ success: false, error: "Product not found", message: "Product not found" }),
			});
		}

		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				success: true,
				message: "Product Deleted Successfully",
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

test.describe("Edit Product - Negative Paths", () => {
	test("should show not-found message when product slug does not exist", async ({ page }) => {
		await mockEditProductApi(page, { productExists: false });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("nonexistent-product");
		await editPage.expectNotFoundMessage();
		await editPage.expectUpdateButtonDisabled();
		await editPage.expectDeleteButtonDisabled();
	});

	test("should show error when name field is cleared on update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		const originalName = await editPage.expectCurrentName();
		await editPage.nameInput().clear();
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/name is required|please enter a name/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when description field is cleared on update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.descriptionInput().clear();
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/description is required|please enter a description/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when price field is cleared on update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/price is required|please enter a price/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when quantity field is cleared on update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.quantityInput().clear();
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/quantity is required|please enter a quantity/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when price is set to zero during update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("0");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/price|greater than|must be positive/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when price is set to negative during update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("-25");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/price|greater than|must be positive/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when quantity is set to negative during update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.quantityInput().clear();
		await editPage.quantityInput().fill("-10");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/quantity|negative|must be positive/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when replacement photo file is too large", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		const largePhotoPath = await createTempLargeFile(page, 2 * 1024 * 1024);
		await editPage.photInput().setInputFiles(largePhotoPath);

		await editPage.updateButton().click();
		await editPage.expectErrorToast(/photo|should be less than|too large|1mb/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when product with same name already exists (conflict)", async ({ page }) => {
		await mockEditProductApi(page, {
			productExists: true,
			failureType: "duplicate",
			failureMessage: "A product with this name already exists",
		});

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.nameInput().clear();
		await editPage.nameInput().fill("Conflicting Product Name");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/already exists|duplicate|conflict/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when product was modified by another user (concurrency conflict)", async ({ page }) => {
		await mockEditProductApi(page, {
			productExists: true,
			failureType: "conflict",
			failureMessage: "Product was updated by another user",
		});

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("150");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/updated by another|conflict|refresh/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when server returns 500 error during update", async ({ page }) => {
		await mockEditProductApi(page, {
			productExists: true,
			failureType: "server",
			failureMessage: "Error in updating product",
		});

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);
		await expect
			.poll(async () => {
				const auth = await page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "{}"));
				return auth?.token || "";
			})
			.not.toBe("");

		await editPage.goto("existing-product");
		await expect(editPage.priceInput()).toBeVisible({ timeout: 15000 });

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("200");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/error|something went wrong|failed/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when network connection fails during update", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true, failureType: "network" });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("175");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/error|timeout|something went wrong/i);
		await editPage.expectStillOnEditPage();
	});

	test("should show error when user session has expired during update (401)", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true, authStatus: 401 });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("125");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/unauthorized|session expired|login required/i);
	});

	test("should show error when user lacks permission to update (403)", async ({ page }) => {
		await mockEditProductApi(page, { productExists: true, authStatus: 403 });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("existing-product");
		await page.waitForTimeout(1000);

		await editPage.priceInput().clear();
		await editPage.priceInput().fill("150");
		await editPage.updateButton().click();

		await editPage.expectErrorToast(/forbidden|permission|not allowed/i);
	});

	test("should show error when attempting to update non-existent product (404)", async ({ page }) => {
		await mockEditProductApi(page, { productExists: false });

		const loginPage = new LoginPage(page);
		const editPage = new UpdateProductPage(page);
		const credentials = getAdminCredentials();

		await loginPage.goto();
		await loginPage.loginAsAdmin(credentials.email, credentials.password);

		await editPage.goto("deleted-product");
		await editPage.expectNotFoundMessage();
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
