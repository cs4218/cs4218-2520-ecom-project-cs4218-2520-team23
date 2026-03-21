// Kevin Liu, A0265144H
import { expect, test } from "@playwright/test";
import {
  booksMidPriceProducts,
  booksOnlyProducts,
  categories,
  gotoHomePage,
  midPriceProducts,
  mockCommonHomePageRoutes,
  pageOneProducts,
} from "./homepage.fixtures";

test.describe("HomePage combined category and price filtering", () => {
  test("applying both category and price filters narrows results to the intersection", async ({
    page,
  }) => {
    await mockCommonHomePageRoutes(page);

    await page.route("**/api/v1/product/product-count", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ total: pageOneProducts.length }),
      });
    });

    await page.route("**/api/v1/product/product-list/1", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: pageOneProducts }),
      });
    });

    await page.route("**/api/v1/product/product-filters", async (route) => {
      const body = route.request().postDataJSON();
      const selectedCategories = body?.checked ?? [];
      const selectedPrice = body?.radio ?? [];

      const hasBooks =
        selectedCategories.length > 0 &&
        selectedCategories.includes(categories[1]._id);
      const hasMidPrice = selectedPrice.length === 2;

      let products;
      if (hasBooks && hasMidPrice) {
        products = booksMidPriceProducts;
      } else if (hasBooks) {
        products = booksOnlyProducts;
      } else if (hasMidPrice) {
        products = midPriceProducts;
      } else {
        products = pageOneProducts;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products }),
      });
    });

    await gotoHomePage(page);

    await expect(page.getByRole("heading", { name: "Alpha Phone" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();

    const filterPanel = page.locator(".filters");

    // Apply category filter first
    await filterPanel.locator("label", { hasText: "Books" }).first().click();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notebook 25" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alpha Phone" })).toHaveCount(0);

    // Now also apply price filter — intersection should narrow results further
    await filterPanel.locator("label", { hasText: "$40 to 59" }).first().click();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notebook 25" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Alpha Phone" })).toHaveCount(0);
  });
});
