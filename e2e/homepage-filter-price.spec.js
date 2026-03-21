// Kevin Liu, A0265144H
import { expect, test } from "@playwright/test";
import {
  gotoHomePage,
  midPriceProducts,
  mockCommonHomePageRoutes,
  pageOneProducts,
} from "./homepage.fixtures";

test.describe("HomePage price filtering", () => {
  test("selecting a price range updates the visible products", async ({
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: midPriceProducts }),
      });
    });

    await gotoHomePage(page);

    const filterPanel = page.locator(".filters");
    await filterPanel
      .locator("label", { hasText: "$40 to 59" })
      .first()
      .click();

    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Gamma Speaker" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toHaveCount(0);
    await expect(page.getByText("$45.00")).toBeVisible();
    await expect(page.getByText("$55.00")).toBeVisible();
  });

  test("reset filters returns the user to the default product view", async ({
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
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ products: midPriceProducts }),
      });
    });

    await gotoHomePage(page);

    const filterPanel = page.locator(".filters");
    await filterPanel
      .locator("label", { hasText: "$40 to 59" })
      .first()
      .click();
    await expect(
      page.getByRole("heading", { name: "Gamma Speaker" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toHaveCount(0);

    await page.getByRole("button", { name: /reset filters/i }).click();
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Alpha Phone" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Novel 45" })).toBeVisible();
  });
});
