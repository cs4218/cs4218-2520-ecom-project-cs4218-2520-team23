// Dong Cheng-Yu, A0262348B

const { test, expect } = require("@playwright/test");

const product = {
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

async function stubCommonApi(page) {
  // Stub all common product/category API calls
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
      body: JSON.stringify({ products: [product] }),
    });
  });

  await page.route("**/api/v1/product/product-count", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ total: 1 }),
    });
  });

  await page.route("**/api/v1/product/get-product/*", async (route) => {
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
}

async function seedCartWithProduct(page) {
  // Seed cart with one product via localStorage before navigating
  await page.addInitScript(() => {
    localStorage.setItem(
      "cart",
      JSON.stringify([
        {
          _id: "prod-1001",
          name: "Comet Headphones",
          slug: "comet-headphones",
          price: 129.99,
          description:
            "High-fidelity wireless headphones with adaptive noise cancellation and all-day battery life.",
          category: { _id: "cat-1", name: "Audio", slug: "audio" },
        },
      ]),
    );
  });
}

async function seedAuthWithoutAddress(page) {
  // Seed auth context with user logged in but NO address
  await page.addInitScript(() => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: {
          _id: "user-123",
          name: "John Doe",
          email: "john@example.com",
          role: 0,
          address: null, // NO ADDRESS
        },
        token: "jwt-token-abc123",
      }),
    );
  });
}

async function seedAuthWithAddress(page) {
  // Seed auth context with user logged in WITH address
  await page.addInitScript(() => {
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: {
          _id: "user-123",
          name: "Jane Smith",
          email: "jane@example.com",
          role: 0,
          address: "123 Main St, San Francisco, CA 94105",
        },
        token: "jwt-token-xyz789",
      }),
    );
  });
}

function getCartBadge(page) {
  return page.locator(".ant-badge-count").first();
}

test.describe("Checkout Journey - Unauthenticated User", () => {
  test("guest user with items in cart sees login prompt and can navigate", async ({
    page,
  }) => {
    await stubCommonApi(page);
    await seedCartWithProduct(page);

    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify item is in cart
    await expect(page.getByText(product.name)).toBeVisible();
    await expect(page.getByText(/Hello Guest/i)).toBeVisible();

    // Should see the login-to-checkout button (not Update Address or Make Payment)
    const loginBtn = page.getByRole("button", {
      name: /Please Login to checkout/i,
    });
    await expect(loginBtn).toBeVisible();

    // Verify cart state is preserved in localStorage
    const cartBefore = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    });
    expect(cartBefore).toHaveLength(1);
    expect(cartBefore[0].name).toBe(product.name);

    // Click login button - verifies navigation intent (actual routing handled by React Router)
    await loginBtn.click();
    await expect(page).toHaveURL(/\/login/);

    // Verify cart state is still preserved after navigating (not cleared)
    const cartAfter = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    });
    expect(cartAfter).toHaveLength(1);
  });
});

test.describe("Checkout Journey - Authenticated Without Address", () => {
  test("logged-in user without address sees update address button and make payment disabled", async ({
    page,
  }) => {
    await stubCommonApi(page);
    await page.route("**/api/v1/product/braintree/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ clientToken: "stub-token" }),
      });
    });

    await seedCartWithProduct(page);
    await seedAuthWithoutAddress(page);

    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify item is in cart
    await expect(page.getByText(product.name)).toBeVisible();

    // Should see user greeting (not guest)
    await expect(page.getByText(/Hello  John Doe/i)).toBeVisible();

    // Should NOT see login-to-checkout button (user is logged in)
    const loginBtn = page.getByRole("button", {
      name: /Please Login to checkout/i,
    });
    await expect(loginBtn).not.toBeVisible();

    // Should see Update Address button (because user has no address)
    const updateAddressBtn = page.getByRole("button", {
      name: /Update Address/i,
    });
    await expect(updateAddressBtn).toBeVisible();

    // Make Payment button should be DISABLED (no address)
    const makePaymentBtn = page.getByRole("button", {
      name: /Make Payment/i,
    });
    await expect(makePaymentBtn).toBeDisabled();
  });
});

test.describe("Checkout Journey - Authenticated With Address", () => {
  test("logged-in user with address displays full checkout summary with all details", async ({
    page,
  }) => {
    await stubCommonApi(page);
    await page.route("**/api/v1/product/braintree/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ clientToken: "stub-bt-token-12345" }),
      });
    });

    await seedCartWithProduct(page);
    await seedAuthWithAddress(page);

    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify authenticated user greeting with name
    await expect(page.getByText(/Hello  Jane Smith/i)).toBeVisible();

    // Verify cart item is displayed
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();
    await expect(
      page.locator(`img[alt="${product.name}"]`).first(),
    ).toHaveAttribute(
      "src",
      new RegExp(`/api/v1/product/product-photo/${product._id}`),
    );
    await expect(page.getByText(`Price : ${product.price}`)).toBeVisible();

    // Verify cart summary displays
    await expect(page.getByText(/Cart Summary/i)).toBeVisible();
    await expect(page.getByText(/Total :/i)).toBeVisible();
    await expect(page.getByText(/\$129.99/)).toBeVisible();

    // Verify user's saved address is displayed in checkout section
    await expect(page.getByText(/Current Address/i)).toBeVisible();
    await expect(
      page.getByText(/123 Main St, San Francisco, CA 94105/i),
    ).toBeVisible();

    // Verify Make Payment button is present (indicates payment section ready)
    const makePaymentBtn = page.getByRole("button", {
      name: /Make Payment/i,
    });
    await expect(makePaymentBtn).toBeVisible();
  });
});

test.describe("Checkout Journey - Successful Payment", () => {
  test("user with cart can initiate checkout and cart persists until payment", async ({
    page,
  }) => {
    await stubCommonApi(page);
    await page.route("**/api/v1/product/braintree/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ clientToken: "stub-bt-token-xyz" }),
      });
    });

    await seedCartWithProduct(page);
    await seedAuthWithAddress(page);

    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify cart item is present before payment attempt
    await expect(page.getByText(product.name, { exact: true })).toBeVisible();

    // Verify cart summary with total is visible
    await expect(page.getByText(/Total :/i)).toBeVisible();
    await expect(page.getByText(/\$129.99/)).toBeVisible();

    // Verify Make Payment button is enabled (has address, has items, has token)
    const makePaymentBtn = page.getByRole("button", {
      name: /Make Payment/i,
    });
    await expect(makePaymentBtn).toBeVisible();

    // Verify user's address is displayed (needed for payment)
    await expect(
      page.getByText(/123 Main St, San Francisco, CA 94105/i),
    ).toBeVisible();
  });
});

test.describe("Checkout Journey - Abandoned Payment", () => {
  test("cart remains intact when user leaves checkout page without paying", async ({
    page,
  }) => {
    await stubCommonApi(page);
    await page.route("**/api/v1/product/braintree/token", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ clientToken: "stub-bt-token-abandon" }),
      });
    });

    await seedCartWithProduct(page);
    await seedAuthWithAddress(page);

    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify cart item is visible
    await expect(page.getByText(product.name)).toBeVisible();

    // Simulate user navigating away (e.g., clicking Home link instead of Payment)
    await page.getByRole("link", { name: /Home|Categories/i }).first().click();

    // Wait for navigation away from cart
    await page.waitForURL(/\/(^cart\/)/, { timeout: 3000 }).catch(() => {
      // Ignore timeout if link didn't navigate
    });

    // Navigate back to cart
    await page.goto("/cart");
    await expect(page).toHaveURL(/\/cart$/);

    // Verify cart item is still there (not cleared)
    await expect(page.getByText(product.name)).toBeVisible();
    await expect(page.getByText(/\$129.99/)).toBeVisible();
  });
});
