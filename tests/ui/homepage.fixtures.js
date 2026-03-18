// Kevin Liu, A0265144H
export const categories = [
  { _id: "cat-electronics", name: "Electronics" },
  { _id: "cat-books", name: "Books" },
];

export const pageOneProducts = [
  {
    _id: "p-phone",
    name: "Alpha Phone",
    price: 99,
    description: "Smart phone for daily use with strong battery life.",
    slug: "alpha-phone",
  },
  {
    _id: "p-novel",
    name: "Novel 45",
    price: 45,
    description: "A mid-priced novel that matches the book filter scenario.",
    slug: "novel-45",
  },
];

export const pageTwoProducts = [
  {
    _id: "p-speaker",
    name: "Gamma Speaker",
    price: 55,
    description: "Portable speaker that only appears after loading more.",
    slug: "gamma-speaker",
  },
  {
    _id: "p-notebook",
    name: "Notebook 25",
    price: 25,
    description: "Budget notebook that helps verify price filtering flows.",
    slug: "notebook-25",
  },
];

export const electronicsOnlyProducts = [pageOneProducts[0], pageTwoProducts[0]];
export const booksOnlyProducts = [pageOneProducts[1], pageTwoProducts[1]];
export const midPriceProducts = [pageOneProducts[1], pageTwoProducts[0]];

export async function mockCommonHomePageRoutes(page) {
  await page.route("**/api/v1/product/product-photo/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "image/svg+xml",
      body: "<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'></svg>",
    });
  });

  await page.route("**/api/v1/category/get-category", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true, category: categories }),
    });
  });

  await page.route("**/api/v1/auth/**", async (route) => {
    await route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ success: false, ok: false }),
    });
  });
}

export async function gotoHomePage(page) {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
}
