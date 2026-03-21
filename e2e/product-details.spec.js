// Liu Yiyang, A0258121M
import { test, expect } from "@playwright/test";

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

const category = {
  _id: "cat-1",
  name: "Category One",
  slug: "category-one",
};

const productA = {
  _id: "prod-a",
  name: "Product Alpha",
  slug: "product-alpha",
  description: "Alpha description",
  price: 12.34,
  category,
};

const productB = {
  _id: "prod-b",
  name: "Product Beta",
  slug: "product-beta",
  description: "Beta description",
  price: 45.67,
  category,
};

const currency = (value) =>
  value.toLocaleString("en-US", { style: "currency", currency: "USD" });

const mockProductApis = async (page) => {
  await page.route("**/api/v1/category/get-category", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: [category] }),
    })
  );

  await page.route("**/api/v1/product/product-count", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 2 }),
    })
  );

  await page.route("**/api/v1/product/product-list/1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: [productA] }),
    })
  );

  await page.route("**/api/v1/product/get-product/**", (route) => {
    const slug = route.request().url().split("/").pop();
    const product = slug === productB.slug ? productB : productA;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ product }),
    });
  });

  await page.route("**/api/v1/product/related-product/**", (route) => {
    const url = route.request().url();
    const products = url.includes(productA._id) ? [productB] : [productA];
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products }),
    });
  });

  await page.route("**/api/v1/product/product-photo/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(pngBase64, "base64"),
    })
  );
};

test.describe("product details", () => {
  test("details navigation, add to cart, and similar products", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("auth");
      localStorage.removeItem("cart");
    });

    await mockProductApis(page);

    await page.goto("/");

    const productCard = page.locator(".card", { hasText: productA.name });
    await productCard.getByRole("button", { name: "More Details" }).click();

    await expect(page).toHaveURL(new RegExp(`/product/${productA.slug}$`));
    await expect(page.getByText("Product Details")).toBeVisible();
    await expect(page.getByRole("img", { name: productA.name })).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${productA._id}`
    );
    await expect(page.getByText(`Price :${currency(productA.price)}`)).toBeVisible();

    await page.getByRole("button", { name: "ADD TO CART" }).click();

    const cartItems = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("cart") || "[]")
    );
    expect(cartItems).toHaveLength(1);
    expect(cartItems[0]._id).toBe(productA._id);

    const similarCard = page.locator(".card", { hasText: productB.name });
    await similarCard.getByRole("button", { name: "More Details" }).click();

    await expect(page).toHaveURL(new RegExp(`/product/${productB.slug}$`));
    await expect(page.getByRole("img", { name: productB.name })).toHaveAttribute(
      "src",
      `/api/v1/product/product-photo/${productB._id}`
    );
    await expect(page.getByText(`Price :${currency(productB.price)}`)).toBeVisible();
  });
});
