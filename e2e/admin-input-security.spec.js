// Written by Pan Xinping, A0228445B

import { test, expect } from "@playwright/test";

const maliciousName = "<script>alert('xss')</script>";

async function mockSecurityRenderApi(page) {
	await page.route("**/api/v1/product/product-list/1", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({
				products: [
					{
						_id: "p1",
						name: maliciousName,
						slug: "xss-product",
						description: "payload product",
						price: 20,
						category: { _id: "c1", name: "Electronics" },
						quantity: 2,
					},
				],
			}),
		});
	});

	await page.route("**/api/v1/product/product-count", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ total: 1 }),
		});
	});

	await page.route("**/api/v1/category/get-category", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify({ success: true, category: [] }),
		});
	});

	await page.route("**/api/v1/product/product-photo/**", async (route) => {
		await route.fulfill({
			status: 200,
			contentType: "image/png",
			body: Buffer.from(
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
				"base64",
			),
		});
	});
}

test("malicious admin-origin product text does not execute in storefront", async ({ page }) => {
	await mockSecurityRenderApi(page);

	let dialogSeen = false;
	page.on("dialog", async (dialog) => {
		dialogSeen = true;
		await dialog.dismiss();
	});

	await page.goto("/");
	await page.waitForLoadState("networkidle");

	await expect(page.getByRole("heading", { name: maliciousName })).toBeVisible();
	expect(dialogSeen).toBe(false);
});
