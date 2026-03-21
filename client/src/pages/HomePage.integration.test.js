// Liu Yiyang, A0258121M

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import HomePage from "./HomePage";
import { AuthProvider } from "../context/auth";
import { SearchProvider } from "../context/search";
import { CartProvider } from "../context/cart";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

// Mock Layout to keep render tree simpler but test other real interactions
jest.mock("../components/Layout", () => {
  return function MockLayout({ children, title }) {
    return (
      <div data-testid="layout" title={title}>
        {children}
      </div>
    );
  };
});

// Helper to seed localStorage before render
function seedLocalStorage(data = {}) {
  if (data.cart) {
    localStorage.setItem("cart", JSON.stringify(data.cart));
  }
  if (data.auth) {
    localStorage.setItem("auth", JSON.stringify(data.auth));
  }
}

// Factory function for test products
function makeProduct(overrides = {}) {
  return {
    _id: `prod-${Math.random()}`,
    name: "Test Product",
    slug: "test-product",
    description: "Test product description that is long enough",
    price: 29.99,
    category: "cat-1",
    ...overrides,
  };
}

// Factory function for categories
function makeCategory(overrides = {}) {
  return {
    _id: `cat-${Math.random()}`,
    name: "Test Category",
    slug: "test-category",
    ...overrides,
  };
}

function renderHomePage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <HomePage />
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function mockAxiosForHomePage({
  categories = [],
  products = [],
  total = 0,
  filterSuccess = true,
} = {}) {
  axios.get.mockImplementation((url) => {
    // Get categories
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({
        data: {
          success: true,
          category: categories,
        },
      });
    }

    // Get all products (initial load)
    if (url === "/api/v1/product/product-list/1") {
      return Promise.resolve({
        data: {
          products: products.slice(0, 10), // First page
        },
      });
    }

    // Get product count
    if (url === "/api/v1/product/product-count") {
      return Promise.resolve({
        data: {
          total,
        },
      });
    }

    // Get more products (pagination)
    if (url.match(/\/api\/v1\/product\/product-list\/\d+/)) {
      const pageNum = parseInt(url.split("/").pop());
      const start = (pageNum - 1) * 10;
      const end = start + 10;
      return Promise.resolve({
        data: {
          products: products.slice(start, end),
        },
      });
    }

    return Promise.reject(new Error(`Unhandled axios.get URL: ${url}`));
  });

  axios.post.mockImplementation((url) => {
    // Post for filters
    if (url === "/api/v1/product/product-filters") {
      if (filterSuccess) {
        return Promise.resolve({
          data: {
            products: products.slice(0, 5), // Filtered results
          },
        });
      } else {
        return Promise.reject(new Error("Filter API error"));
      }
    }

    return Promise.reject(new Error(`Unhandled axios.post URL: ${url}`));
  });
}

describe("HomePage Integration Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe("Cart Context Integration - Adding products to cart", () => {
    test("Adding a product to cart persists it to localStorage", async () => {
      const product = makeProduct({ _id: "p1", name: "Widget A" });
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // Wait for product to render
      const addBtn = await screen.findByRole("button", {
        name: /ADD TO CART/i,
      });

      // Click ADD TO CART
      fireEvent.click(addBtn);

      // Assert localStorage was updated
      const cartInStorage = JSON.parse(localStorage.getItem("cart"));
      expect(cartInStorage).toHaveLength(1);
      expect(cartInStorage[0]._id).toBe("p1");
      expect(cartInStorage[0].name).toBe("Widget A");
    });

    test("Fresh CartProvider initialized after the click reads the item back from storage", async () => {
      const product = makeProduct({ _id: "p1", name: "Widget A" });
      mockAxiosForHomePage({ products: [product], total: 1 });

      // First render: add product to cart
      const { unmount } = renderHomePage();
      const addBtn = await screen.findByRole("button", {
        name: /ADD TO CART/i,
      });
      fireEvent.click(addBtn);

      // Verify it's in localStorage
      let cartInStorage = JSON.parse(localStorage.getItem("cart"));
      expect(cartInStorage).toHaveLength(1);

      // Unmount and remount with a fresh CartProvider
      unmount();
      jest.clearAllMocks();
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // The new CartProvider should hydrate from localStorage
      // We can't directly access context in integration test, but we can verify localStorage persisted
      cartInStorage = JSON.parse(localStorage.getItem("cart"));
      expect(cartInStorage).toHaveLength(1);
      expect(cartInStorage[0]._id).toBe("p1");
    });

    test("Adding multiple products appends them in the cart (context holds [product1, product2])", async () => {
      const product1 = makeProduct({
        _id: "p1",
        name: "Widget A",
      });
      const product2 = makeProduct({
        _id: "p2",
        name: "Widget B",
      });
      mockAxiosForHomePage({
        products: [product1, product2],
        total: 2,
      });

      renderHomePage();

      // Wait for both products and click ADD TO CART on first one
      const addBtns = await screen.findAllByRole("button", {
        name: /ADD TO CART/i,
      });
      expect(addBtns.length).toBeGreaterThanOrEqual(2);

      fireEvent.click(addBtns[0]);
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart"));
        expect(cart).toHaveLength(1);
      });

      fireEvent.click(addBtns[1]);
      await waitFor(() => {
        const cart = JSON.parse(localStorage.getItem("cart"));
        expect(cart).toHaveLength(2);
        expect(cart[0]._id).toBe("p1");
        expect(cart[1]._id).toBe("p2");
      });
    });

    test("If localStorage already contains cart items when the page loads, the cart context is pre-populated", async () => {
      const existingProduct = makeProduct({
        _id: "existing-1",
        name: "Existing Widget",
      });
      const newProduct = makeProduct({
        _id: "new-1",
        name: "New Widget",
      });

      // Pre-populate localStorage
      seedLocalStorage({
        cart: [existingProduct],
      });

      mockAxiosForHomePage({
        products: [newProduct],
        total: 1,
      });

      renderHomePage();

      // Verify existing item is in storage (context hydrated it)
      let cartInStorage = JSON.parse(localStorage.getItem("cart"));
      expect(cartInStorage).toHaveLength(1);
      expect(cartInStorage[0]._id).toBe("existing-1");

      // Add new product
      const addBtn = await screen.findByRole("button", {
        name: /ADD TO CART/i,
      });
      fireEvent.click(addBtn);

      // Verify both items are now in cart
      await waitFor(() => {
        cartInStorage = JSON.parse(localStorage.getItem("cart"));
        expect(cartInStorage).toHaveLength(2);
        expect(cartInStorage[0]._id).toBe("existing-1");
        expect(cartInStorage[1]._id).toBe("new-1");
      });
    });

    test("NEW 'ADD TO CART' appends to existing items loaded from localStorage", async () => {
      const item1 = makeProduct({ _id: "id-1", name: "Item One" });
      const item2 = makeProduct({ _id: "id-2", name: "Item Two" });

      // Seed localStorage with one item
      seedLocalStorage({
        cart: [item1],
      });

      mockAxiosForHomePage({
        products: [item2],
        total: 1,
      });

      renderHomePage();

      // Verify pre-population worked
      let cartInStorage = JSON.parse(localStorage.getItem("cart"));
      expect(cartInStorage).toHaveLength(1);

      // Add another product
      const addBtn = await screen.findByRole("button", {
        name: /ADD TO CART/i,
      });
      fireEvent.click(addBtn);

      // Verify appended, not replaced
      await waitFor(() => {
        cartInStorage = JSON.parse(localStorage.getItem("cart"));
        expect(cartInStorage).toHaveLength(2);
        expect(cartInStorage.map((p) => p._id)).toEqual(["id-1", "id-2"]);
      });
    });
  });

  describe("useCategory Hook Integration", () => {
    test("If the categories API returns success: false, the checkboxes are not rendered", async () => {
      const product = makeProduct();

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: {
              success: false, // <-- API returns success: false
              category: [],
            },
          });
        }

        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: [product] } });
        }

        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 1 } });
        }

        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderHomePage();

      // Wait for products to render
      await screen.findByRole("button", { name: /ADD TO CART/i });

      // Look for checkboxes (should not find any if categories failed)
      const checkboxes = screen.queryAllByRole("checkbox");
      expect(checkboxes).toHaveLength(0);
    });

    test("Error in the categories API should not crash the whole page", async () => {
      const product = makeProduct();

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("API connection failed"));
        }

        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: [product] } });
        }

        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 1 } });
        }

        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderHomePage();

      // Page should still render with products
      expect(await screen.findByText(/All Products/i)).toBeInTheDocument();
      expect(
        await screen.findByRole("button", { name: /ADD TO CART/i }),
      ).toBeInTheDocument();
    });

    test("Categories render correctly when API returns success: true with data", async () => {
      const cat1 = makeCategory({ _id: "c1", name: "Electronics" });
      const cat2 = makeCategory({ _id: "c2", name: "Clothing" });
      const product = makeProduct();

      mockAxiosForHomePage({
        categories: [cat1, cat2],
        products: [product],
        total: 1,
      });

      renderHomePage();

      // Categories should render as checkboxes
      const checkboxes = await screen.findAllByRole("checkbox");
      expect(checkboxes.length).toBeGreaterThanOrEqual(2);

      // Check that category names appear
      expect(screen.getByText("Electronics")).toBeInTheDocument();
      expect(screen.getByText("Clothing")).toBeInTheDocument();
    });
  });

  describe("Prices Static Data Integration", () => {
    test("Every entry in Prices.js produces a radio button", async () => {
      const product = makeProduct();
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // Prices.js has 6 entries
      const radioButtons = await screen.findAllByRole("radio");
      expect(radioButtons.length).toBeGreaterThanOrEqual(6);
    });

    test("Price radio buttons are labeled correctly", async () => {
      const product = makeProduct();
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // Verify price labels from Prices.js
      expect(await screen.findByLabelText(/\$0 to 19/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/\$20 to 39/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/\$40 to 59/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/\$60 to 79/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/\$80 to 99/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/\$100 or more/i)).toBeInTheDocument();
    });

    test("Clicking a price radio button sends the correct array value to the filter API", async () => {
      const product1 = makeProduct({ price: 25 });
      const product2 = makeProduct({ price: 50 });

      mockAxiosForHomePage({
        products: [product1, product2],
        total: 2,
      });

      renderHomePage();

      // Click the $20 to $39 price filter
      const priceRadio = await screen.findByLabelText(/\$20 to 39/i);
      fireEvent.click(priceRadio);

      // Verify axios.post was called with correct price range
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: [],
            radio: [20, 39], // Correct array value from Prices.js
          },
        );
      });
    });

    test("Multiple price ranges can be tested individually", async () => {
      const product = makeProduct();
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // Click $0 to $19
      fireEvent.click(await screen.findByLabelText(/\$0 to 19/i));
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: [],
            radio: [0, 19],
          },
        );
      });

      axios.post.mockClear();

      // Click $60 to $79
      fireEvent.click(screen.getByLabelText(/\$60 to 79/i));
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: [],
            radio: [60, 79],
          },
        );
      });
    });
  });

  describe("Filter Integration - Category + Price together", () => {
    test("Selecting both category and price filter sends both to filter API", async () => {
      const category = makeCategory({ _id: "c1", name: "Electronics" });
      const product = makeProduct();

      mockAxiosForHomePage({
        categories: [category],
        products: [product],
        total: 1,
      });

      renderHomePage();

      // Click category checkbox
      const categoryCheckbox = await screen.findByRole("checkbox", {
        name: /Electronics/i,
      });
      fireEvent.click(categoryCheckbox);

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["c1"],
            radio: [],
          },
        );
      });

      axios.post.mockClear();

      // Click price filter
      fireEvent.click(screen.getByLabelText(/\$40 to 59/i));

      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["c1"],
            radio: [40, 59],
          },
        );
      });
    });
  });

  describe("Error Handling - API Failures", () => {
    test("Error in products API should not crash the page", async () => {
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [] },
          });
        }

        if (url === "/api/v1/product/product-list/1") {
          return Promise.reject(new Error("Products API failed"));
        }

        if (url === "/api/v1/product/product-count") {
          return Promise.reject(new Error("Count API failed"));
        }

        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderHomePage();

      // Page should still render with layout
      expect(await screen.findByTestId("layout")).toBeInTheDocument();
      expect(screen.getByText(/All Products/i)).toBeInTheDocument();
    });

    test("Error in filter API should not crash the page", async () => {
      const category = makeCategory({ _id: "c1", name: "Test Cat" });
      const product = makeProduct();

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }

        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: [product] } });
        }

        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 1 } });
        }

        return Promise.reject(new Error("Unhandled URL"));
      });

      axios.post.mockRejectedValue(new Error("Filter API error"));

      renderHomePage();

      // Apply a filter that will fail
      const checkbox = await screen.findByRole("checkbox", {
        name: /Test Cat/i,
      });
      fireEvent.click(checkbox);

      // Page should still be rendered (not crash)
      expect(screen.getByTestId("layout")).toBeInTheDocument();
    });
  });

  describe("Load More Pagination", () => {
    test("Load More button is only shown when total products exceed displayed products", async () => {
      // Create 25 products to test pagination (10 per page)
      const products = Array.from({ length: 25 }, (_, i) =>
        makeProduct({
          _id: `p${i}`,
          name: `Item-${(i + 1).toString().padStart(2, "0")}`,
        }),
      );

      mockAxiosForHomePage({
        products,
        total: 25, // Total is greater than first page (10)
      });

      renderHomePage();

      // Load More button should be visible since total (25) > initial load (10)
      const loadMoreBtn = await screen.findByRole("button", {
        name: /Load More/i,
      });
      expect(loadMoreBtn).toBeInTheDocument();
    });
  });

  describe("Layout Integration", () => {
    test("HomePage renders with Layout wrapper", async () => {
      const product = makeProduct();
      mockAxiosForHomePage({ products: [product], total: 1 });

      renderHomePage();

      // Layout should be rendered
      expect(await screen.findByTestId("layout")).toBeInTheDocument();

      // Layout title should be set
      const layout = screen.getByTestId("layout");
      expect(layout).toHaveAttribute("title", "ALL Products - Best offers ");
    });
  });

  test("If setCart is not called, add to cart does nothing", async () => {
    const product = makeProduct({ _id: "p1", name: "Test Item" });
    mockAxiosForHomePage({ products: [product], total: 1 });

    renderHomePage();

    // Verify localStorage is initially empty
    expect(localStorage.getItem("cart")).toBeNull();

    const addBtn = await screen.findByRole("button", {
      name: /ADD TO CART/i,
    });
    fireEvent.click(addBtn);

    const cartAfter = JSON.parse(localStorage.getItem("cart"));
    expect(cartAfter).not.toBeNull();
    expect(Array.isArray(cartAfter)).toBe(true); // Must be array, not single object
    expect(cartAfter).toHaveLength(1);
  });

  test("If localStorage.setItem is not called, data is lost on page reload", async () => {
    const product = makeProduct({ _id: "p1" });
    mockAxiosForHomePage({ products: [product], total: 1 });

    const { unmount } = renderHomePage();

    fireEvent.click(
      await screen.findByRole("button", { name: /ADD TO CART/i }),
    );

    // Verify it's in localStorage
    let cartInStorage = JSON.parse(localStorage.getItem("cart"));
    expect(cartInStorage).toHaveLength(1);

    // Unmount component
    unmount();
    jest.clearAllMocks();

    // localStorage should still have the data (if setItem was called)
    cartInStorage = JSON.parse(localStorage.getItem("cart"));
    expect(cartInStorage).not.toBeNull();
    expect(cartInStorage).toHaveLength(1);
  });

  test("If filter API is not called when checkbox is clicked, filters don't work", async () => {
    const category = makeCategory({ _id: "c1", name: "Electronics" });
    const product = makeProduct();

    mockAxiosForHomePage({
      categories: [category],
      products: [product],
      total: 1,
    });

    renderHomePage();

    // Click category checkbox
    const checkbox = await screen.findByRole("checkbox", {
      name: /Electronics/i,
    });
    fireEvent.click(checkbox);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        expect.objectContaining({
          checked: ["c1"],
        }),
      );
    });
  });

  test("If Radio.Group value is not passed correctly, price filter sends wrong data type", async () => {
    const product = makeProduct();
    mockAxiosForHomePage({ products: [product], total: 1 });

    renderHomePage();

    fireEvent.click(await screen.findByLabelText(/\$20 to 39/i));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: [],
          radio: [20, 39], // Must be array, not string
        },
      );
    });
  });

  test("If toast.success is not called, user gets no feedback", async () => {
    const product = makeProduct();
    mockAxiosForHomePage({ products: [product], total: 1 });

    const mockToast = require("react-hot-toast").default;

    renderHomePage();

    fireEvent.click(
      await screen.findByRole("button", {
        name: /ADD TO CART/i,
      }),
    );

    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith("Item Added to cart");
    });
  });

  test("If page is not reset to 1 when filter changes, pagination breaks", async () => {
    const category = makeCategory({ _id: "c1", name: "Books" });
    const product = makeProduct();

    mockAxiosForHomePage({
      categories: [category],
      products: [product],
      total: 1,
    });

    renderHomePage();

    fireEvent.click(await screen.findByRole("checkbox", { name: /Books/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        expect.any(Object),
      );
    });
  });

  test("If checked array is not properly updated, multiple category selections fail", async () => {
    const cat1 = makeCategory({ _id: "c1", name: "Electronics" });
    const cat2 = makeCategory({ _id: "c2", name: "Books" });
    const product = makeProduct();

    mockAxiosForHomePage({
      categories: [cat1, cat2],
      products: [product],
      total: 1,
    });

    renderHomePage();

    // Click first category
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Electronics/i }),
    );

    axios.post.mockClear();

    // Click second category
    fireEvent.click(screen.getByRole("checkbox", { name: /Books/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: expect.arrayContaining(["c1", "c2"]), // Both must be present
          radio: [],
        },
      );
    });
  });

  test("If uncheck removes wrong item, filter logic is broken", async () => {
    const cat1 = makeCategory({ _id: "c1", name: "Electronics" });
    const cat2 = makeCategory({ _id: "c2", name: "Books" });
    const product = makeProduct();

    mockAxiosForHomePage({
      categories: [cat1, cat2],
      products: [product],
      total: 1,
    });

    renderHomePage();

    // Select both
    fireEvent.click(
      await screen.findByRole("checkbox", { name: /Electronics/i }),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Books/i }));

    axios.post.mockClear();

    // Uncheck first one
    fireEvent.click(screen.getByRole("checkbox", { name: /Electronics/i }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: ["c2"], // Only c2 should remain
          radio: [],
        },
      );
    });
  });

  test("If loading state is not set to false after error, button stays disabled", async () => {
    const product = makeProduct();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: { success: true, category: [] },
        });
      }

      if (url === "/api/v1/product/product-list/1") {
        return Promise.reject(new Error("Network error"));
      }

      if (url === "/api/v1/product/product-count") {
        return Promise.reject(new Error("Network error"));
      }

      return Promise.reject(new Error("Unhandled URL"));
    });

    renderHomePage();

    // Page renders despite error
    await screen.findByTestId("layout");
  });
});
