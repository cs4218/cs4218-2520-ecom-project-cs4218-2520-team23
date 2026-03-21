// Kevin Liu, A0265144H
import { expect, test } from "@playwright/test";
import {
  booksOnlyProducts,
  categories,
  electronicsOnlyProducts,
  gotoHomePage,
  mockCommonHomePageRoutes,
  pageOneProducts,
} from "./homepage.fixtures";

test.describe("HomePage category filtering", () => {
  test("category selections update the visible product set", async ({
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

      let products = pageOneProducts;
      if (
        selectedCategories.length === 1 &&
        selectedCategories[0] === categories[0]._id
      ) {
        products = electronicsOnlyProducts;
      } else if (
        selectedCategories.length === 1 &&
        selectedCategories[0] === categories[1]._id
      ) {
        products = booksOnlyProducts;
      } else if (selectedCategories.length === 2) {
        products = [...electronicsOnlyProducts, ...booksOnlyProducts];
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products }),
      });
    });

    await gotoHomePage(page);

    const categoryFilterPanel = page.locator(".filters");

    await categoryFilterPanel
      .locator("label", { hasText: "Electronics" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gamma Speaker" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toHaveCount(
      0,
    );

    await categoryFilterPanel
      .locator("label", { hasText: "Books" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gamma Speaker" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Notebook 25" }),
    ).toBeVisible();

    await categoryFilterPanel
      .locator("label", { hasText: "Electronics" })
      .first()
      .click();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Notebook 25" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toHaveCount(0);
  });
});
