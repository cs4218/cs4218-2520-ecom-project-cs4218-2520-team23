// Liu Yiyang, A0258121M
import { test, expect } from "@playwright/test";

const pngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

const baseUser = {
  _id: "user-1",
  name: "User One",
  email: "user@example.com",
  phone: "12345678",
  address: "123 Street",
  role: 0,
};

const adminUser = {
  _id: "admin-1",
  name: "Admin One",
  email: "admin@example.com",
  phone: "88888888",
  address: "1 Admin Ave",
  role: 1,
};

const seedAuth = async (page, user) => {
  await page.addInitScript((authUser) => {
    localStorage.setItem(
      "auth",
      JSON.stringify({ user: authUser, token: "token" })
    );
  }, user);
};

const mockUserAuthOk = async (page) => {
  await page.route("**/api/v1/auth/user-auth", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    })
  );
};

const mockCategoryList = async (page) => {
  await page.route("**/api/v1/category/get-category", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: [] }),
    })
  );
};

const mockProfileUpdate = async (page, updatedUser) => {
  await page.route("**/api/v1/auth/profile", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ updatedUser }),
    })
  );
};

const mockOrders = async (page, orders) => {
  await page.route("**/api/v1/auth/orders", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(orders),
    })
  );
};

const mockProductPhoto = async (page) => {
  await page.route("**/api/v1/product/product-photo/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "image/png",
      body: Buffer.from(pngBase64, "base64"),
    })
  );
};

const mockBraintreeToken = async (page) => {
  await page.route("**/api/v1/product/braintree/token", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ clientToken: "token" }),
    })
  );
};

const seedCart = async (page) => {
  await page.addInitScript(() => {
    localStorage.setItem("cart", JSON.stringify([]));
  });
};

const setupMocks = async (page) => {
  await mockUserAuthOk(page);
  await mockCategoryList(page);
  await mockProductPhoto(page);
  await mockBraintreeToken(page);
};

const readStoredAuthUser = async (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("auth") || "{}").user || {});

test.describe("profile and orders", () => {
  test("non-admin can view and update profile via dashboard menu", async ({ page }) => {
    const updatedUser = {
      ...baseUser,
      name: "User One Updated",
      phone: "99999999",
      address: "456 Updated Street",
    };

    await seedAuth(page, baseUser);
    await seedCart(page);
    await setupMocks(page);
    await mockProfileUpdate(page, updatedUser);

    await page.goto("/");
    await page.getByRole("button", { name: baseUser.name }).click();
    await page.getByRole("link", { name: "Dashboard" }).click();
    await page.getByRole("link", { name: "Profile" }).click();

    await expect(page.getByRole("heading", { name: "USER PROFILE" })).toBeVisible();
    await expect(page.getByPlaceholder("Enter Your Name")).toHaveValue(
      baseUser.name
    );
    await expect(page.getByPlaceholder("Enter Your Email")).toHaveValue(
      baseUser.email
    );

    await page.getByPlaceholder("Enter Your Name").fill(updatedUser.name);
    await page.getByPlaceholder("Enter Your Phone").fill(updatedUser.phone);
    await page
      .getByPlaceholder("Enter Your Address")
      .fill(updatedUser.address);
    await page.getByPlaceholder("Enter Your Password").fill("newpass123");

    await page.getByRole("button", { name: "UPDATE" }).click();

    await expect
      .poll(async () => {
        const user = await readStoredAuthUser(page);
        return user.name;
      })
      .toBe(updatedUser.name);

    const storedUser = await readStoredAuthUser(page);
    expect(storedUser.phone).toBe(updatedUser.phone);
    expect(storedUser.address).toBe(updatedUser.address);
  });

  test("admin can update profile particulars", async ({ page }) => {
    const updatedAdmin = {
      ...adminUser,
      name: "Admin Updated",
      phone: "77777777",
      address: "9 Admin Way",
    };

    await seedAuth(page, adminUser);
    await seedCart(page);
    await setupMocks(page);
    await mockProfileUpdate(page, updatedAdmin);

    await page.goto("/dashboard/user/profile");
    await expect(page.getByRole("heading", { name: "USER PROFILE" })).toBeVisible();

    await page.getByPlaceholder("Enter Your Name").fill(updatedAdmin.name);
    await page.getByPlaceholder("Enter Your Phone").fill(updatedAdmin.phone);
    await page
      .getByPlaceholder("Enter Your Address")
      .fill(updatedAdmin.address);
    await page.getByRole("button", { name: "UPDATE" }).click();

    await expect
      .poll(async () => {
        const user = await readStoredAuthUser(page);
        return user.name;
      })
      .toBe(updatedAdmin.name);

    const storedUser = await readStoredAuthUser(page);
    expect(storedUser.phone).toBe(updatedAdmin.phone);
    expect(storedUser.address).toBe(updatedAdmin.address);
  });

  test("cart update address redirects to profile for user and admin", async ({ page }) => {
    await seedAuth(page, baseUser);
    await seedCart(page);
    await setupMocks(page);
    await page.goto("/cart");

    await page.getByRole("button", { name: "Update Address" }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);

    await seedAuth(page, adminUser);
    await page.goto("/cart");
    await page.getByRole("button", { name: "Update Address" }).click();
    await expect(page).toHaveURL(/\/dashboard\/user\/profile$/);
  });

  test("user and admin can view past orders", async ({ page }) => {
    const orders = [
      {
        _id: "order-1",
        status: "Delivered",
        buyer: { name: baseUser.name },
        createdAt: "2024-01-01T00:00:00.000Z",
        payment: { success: true },
        products: [
          {
            _id: "prod-1",
            name: "Sample Product",
            description: "Sample description",
            price: 19.99,
          },
        ],
      },
    ];

    await seedAuth(page, baseUser);
    await seedCart(page);
    await setupMocks(page);
    await mockOrders(page, orders);

    await page.goto("/dashboard/user/orders");
    await expect(page.getByRole("heading", { name: "All Orders" })).toBeVisible();
    await expect(page.getByText("Delivered")).toBeVisible();
    await expect(page.getByRole("cell", { name: baseUser.name })).toBeVisible();
    await expect(page.getByText("Success")).toBeVisible();

    await seedAuth(page, adminUser);
    await mockOrders(page, [
      {
        ...orders[0],
        buyer: { name: adminUser.name },
      },
    ]);
    await page.goto("/dashboard/user/orders");
    await expect(page.getByRole("cell", { name: adminUser.name })).toBeVisible();
  });
});
