// Kevin Liu, A0265144H
import { expect, test } from "@playwright/test";
import {
  booksOnlyProducts,
  gotoHomePage,
  mockCommonHomePageRoutes,
  pageOneProducts,
  pageTwoProducts,
} from "./homepage.fixtures";

test.describe("HomePage filter selection journey", () => {
  test("load more results are replaced by filtered page-one results", async ({ page }) => {
    await mockCommonHomePageRoutes(page);

    await page.route("**/api/v1/product/product-count", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ total: 4 }),
      });
    });

    await page.route("**/api/v1/product/product-list/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: pageOneProducts }),
      });
    });

    await page.route("**/api/v1/product/product-list/2", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: pageTwoProducts }),
      });
    });

    await page.route("**/api/v1/product/product-filters", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: booksOnlyProducts }),
      });
    });

    await gotoHomePage(page);

    await expect(page.getByRole("heading", { name: "Alpha Phone" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(page.getByRole("button", { name: /load more/i })).toBeVisible();

    await page.getByRole("button", { name: /load more/i }).click();

    await expect(page.getByRole("heading", { name: "Gamma Speaker" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notebook 25" })).toBeVisible();

    const categoryFilterPanel = page.locator(".filters");
    await categoryFilterPanel.locator("label", { hasText: "Books" }).first().click();

    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notebook 25" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Gamma Speaker" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /load more/i })).toHaveCount(0);
  });
});
