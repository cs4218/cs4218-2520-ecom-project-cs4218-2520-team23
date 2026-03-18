// Dong Cheng-Yu, A0262348B

const { test, expect } = require("@playwright/test");

const productA = {
  _id: "prod-1001",
  name: "Comet Headphones",
  slug: "comet-headphones",
  price: 129.99,
  description:
    "High-fidelity wireless headphones with adaptive noise cancellation and all-day battery life.",
  category: {
    _id: "cat-1",
    name: "Audio",
    slug: "audio",
  },
};

const productB = {
  _id: "prod-1002",
  name: "Nimbus Keyboard",
  slug: "nimbus-keyboard",
  price: 89.5,
  description:
    "Compact mechanical keyboard with tactile switches, hot-swap sockets, and low-latency wireless mode.",
  category: {
    _id: "cat-2",
    name: "Accessories",
    slug: "accessories",
  },
};

const categoryResponse = {
  success: true,
  category: [
    {
      _id: "cat-1",
      name: "Audio",
      slug: "audio",
    },
  ],
};

async function stubApi(page, options = {}) {
  const products = options.products ?? [productA];
  const productBySlug = Object.fromEntries(products.map((p) => [p.slug, p]));

  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(categoryResponse),
    });
  });

  await page.route("**/api/v1/product/product-list/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products }),
    });
  });

  await page.route("**/api/v1/product/product-count", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: products.length }),
    });
  });

  await page.route("**/api/v1/product/get-product/*", async (route) => {
    const slug = route.request().url().split("/").pop();
    const product = productBySlug[slug] ?? productA;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ product }),
    });
  });

  await page.route("**/api/v1/product/related-product/*/*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ products: [] }),
    });
  });

  await page.route("**/api/v1/product/braintree/token", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ clientToken: "stub-client-token" }),
    });
  });
}

async function gotoHome(page) {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "All Products" }),
  ).toBeVisible();
}

function getCartBadge(page) {
  return page.locator(".ant-badge-count").first();
}

async function assertCartHasProductDetails(page, product) {
  await expect(page.getByText(product.name, { exact: true })).toBeVisible();
  await expect(
    page.locator(`img[alt="${product.name}"]`).first(),
  ).toHaveAttribute(
    "src",
    new RegExp(`/api/v1/product/product-photo/${product._id}`),
  );
  await expect(
    page.getByText(product.description.substring(0, 30), { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(`Price : ${product.price}`)).toBeVisible();
}

async function checkCartCountInLocalStorage(page, expected) {
  await expect
    .poll(async () => {
      return page.evaluate(
        () => JSON.parse(localStorage.getItem("cart") || "[]").length,
      );
    })
    .toBe(expected);
}

test.describe("Cart Journey - Add", () => {
  test("add from product details updates header badge and cart page", async ({
    page,
  }) => {
    await stubApi(page, { products: [productA] });
    await gotoHome(page);

    const cartBadge = getCartBadge(page);

    await page.getByRole("button", { name: "More Details" }).click();
    await expect(page).toHaveURL(/\/product\/comet-headphones$/);

    await page.getByRole("button", { name: "ADD TO CART" }).click();
    await expect(cartBadge).toHaveText("1");
    await checkCartCountInLocalStorage(page, 1);

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await assertCartHasProductDetails(page, productA);
  });

  test("add same item twice from home page shows 2 cart entries and persists after refresh", async ({
    page,
  }) => {
    await stubApi(page, { products: [productA] });
    await gotoHome(page);

    const cartBadge = getCartBadge(page);
    const productCard = page
      .locator(".card")
      .filter({ hasText: productA.name })
      .first();
    const addToCartButton = productCard.getByRole("button", {
      name: "ADD TO CART",
    });

    await addToCartButton.click();
    await addToCartButton.click();

    await expect(cartBadge).toHaveText("2");
    await checkCartCountInLocalStorage(page, 2);

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(productA.name, { exact: true })).toHaveCount(2);

    await page.reload();
    await expect(page.getByText(productA.name, { exact: true })).toHaveCount(2);
    await expect(cartBadge).toHaveText("2");
    await checkCartCountInLocalStorage(page, 2);
  });
});

test.describe("Cart Journey - Remove", () => {
  test("remove one item from a 2-item cart keeps remaining item and decrements badge", async ({
    page,
  }) => {
    await stubApi(page, { products: [productA, productB] });
    await gotoHome(page);

    const cartBadge = getCartBadge(page);

    await page
      .locator(".card")
      .filter({ hasText: productA.name })
      .first()
      .getByRole("button", { name: "ADD TO CART" })
      .click();
    await page
      .locator(".card")
      .filter({ hasText: productB.name })
      .first()
      .getByRole("button", { name: "ADD TO CART" })
      .click();

    await expect(cartBadge).toHaveText("2");
    await checkCartCountInLocalStorage(page, 2);

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);

    const productARow = page
      .locator(".row.card.flex-row")
      .filter({ hasText: productA.name });
    await productARow.getByRole("button", { name: "Remove" }).click();

    await expect(page.getByText(productA.name, { exact: true })).toHaveCount(0);
    await expect(page.getByText(productB.name, { exact: true })).toBeVisible();
    await expect(cartBadge).toHaveText("1");
    await checkCartCountInLocalStorage(page, 1);
  });

  test("removing the last cart item shows empty-cart state and badge zero", async ({
    page,
  }) => {
    await stubApi(page, { products: [productA] });
    await gotoHome(page);

    const cartBadge = getCartBadge(page);
    await page.getByRole("button", { name: "ADD TO CART" }).first().click();
    await expect(cartBadge).toHaveText("1");

    await page.getByRole("link", { name: "Cart" }).click();
    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByText(productA.name, { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Remove" }).click();
    await expect(page.getByText(/Your Cart Is Empty/i)).toBeVisible();
    await expect(cartBadge).toHaveText("0");
    await checkCartCountInLocalStorage(page, 0);
  });
});
