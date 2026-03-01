/**
 * Test Written by Ng Hong Ray, A0253509A
 *
 * Testing Principles Applied:     
 * 1. Integration Testing
 * - Tests the integration of ProductDetails with real Layout, Header, Footer components (no mocks)
 * - Tests integration with Cart context and localStorage for "ADD TO CART" functionality
 * 
 * 2. Real Router Integration
 * - Uses MemoryRouter and real Routes to test that clicking "More Details" on a related product navigates correctly
 * 
 * 3. API Interaction Testing
 * - Mocks axios to test that ProductDetails makes the expected API calls to fetch product and related products
 * 
 * 4. Error Handling
 * - Tests that if the API calls fail, the component does not crash and logs the error
 * 
 * 5. UI Behavior Testing
 * - Tests that related products are rendered with truncated descriptions and formatted prices
 * - Tests that "No Similar Products found" message appears when there are no related products
 * 
 * 6. State Management Testing
 * - Tests that clicking "ADD TO CART" updates the Cart context and localStorage correctly (bug found: cart was not updating localStorage in the original code)
 * 
 * 7. Code Coverage
 * - This test file contributes to the overall code coverage of the ProductDetails component, including its API interactions and integration with other components and contexts.
 * Note: This test file is focused on integration testing of the ProductDetails page, and does not mock child components or contexts to ensure we are testing the real interactions and side effects.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";

import ProductDetails from "./ProductDetails";
import { AuthProvider } from "../context/auth";
import { SearchProvider } from "../context/search";
import { CartProvider } from "../context/cart";

jest.mock("axios");

// Small helper to assert navigation happened (real router integration)
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

function renderWithProviders(initialPath = "/product/test-product") {
  return render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              {/* Static route wins over param route in React Router v6 */}
              <Route
                path="/product/related-product-1"
                element={<div>RELATED-PRODUCT-1-PAGE</div>}
              />
              <Route path="/product/:slug" element={<ProductDetails />} />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>

            {/* Always show location so we can assert route changes */}
            <LocationDisplay />
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

describe("ProductDetails (integration)", () => {
  const mockProduct = {
    _id: "123",
    name: "Test Product",
    slug: "test-product",
    description: "This is a test product description",
    price: 99.99,
    category: { _id: "cat1", name: "Electronics" },
  };

  const mockRelatedProducts = [
    {
      _id: "456",
      name: "Related Product 1",
      slug: "related-product-1",
      description:
        "This is a related product with a long description that will be truncated",
      price: 49.99,
    },
    {
      _id: "789",
      name: "Related Product 2",
      slug: "related-product-2",
      description: "Another related product description",
      price: 79.99,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  function mockAxiosGet({ related = [], categories = [] } = {}) {
    axios.get.mockImplementation((url) => {
      // Header -> useCategory()
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({ data: { category: categories } });
      }

      // ProductDetails -> get product
      if (url === "/api/v1/product/get-product/test-product") {
        return Promise.resolve({ data: { product: mockProduct } });
      }

      // ProductDetails -> related products
      if (url === "/api/v1/product/related-product/123/cat1") {
        return Promise.resolve({ data: { products: related } });
      }

      // SearchInput (only if submitted; not used in these tests)
      if (url.startsWith("/api/v1/product/search/")) {
        return Promise.resolve({ data: { products: [] } });
      }

      return Promise.reject(new Error(`Unhandled axios.get URL: ${url}`));
    });
  }

  it("renders product details and uses real Layout/Header/Footer (no component mocks)", async () => {
    mockAxiosGet({ related: [], categories: [] });

    renderWithProviders("/product/test-product");

    // Layout includes Header brand text
    expect(await screen.findByText("🛒 Virtual Vault")).toBeInTheDocument();

    // Product heading
    expect(await screen.findByText("Product Details")).toBeInTheDocument();

    // Product fields
    await screen.findByText(/Test Product/);
    expect(screen.getByText(/Name :/)).toHaveTextContent("Name : Test Product");
    expect(screen.getByText(/Description :/)).toHaveTextContent(
      "Description : This is a test product description"
    );
    expect(screen.getByText(/Category :/)).toHaveTextContent(
      "Category : Electronics"
    );
    expect(screen.getByText(/Price :/)).toHaveTextContent("$99.99");

    // Image src
    const img = screen.getByRole("img", { name: "Test Product" });
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/123");

    // Footer text
    expect(
      screen.getByText(/All Rights Reserved/i)
    ).toBeInTheDocument();
  });

  it('shows "No Similar Products found" when related products empty', async () => {
    mockAxiosGet({ related: [], categories: [] });

    renderWithProviders("/product/test-product");

    expect(await screen.findByText("Similar Products ➡️")).toBeInTheDocument();
    expect(
      await screen.findByText("No Similar Products found")
    ).toBeInTheDocument();
  });

  it("renders related products, prices, and truncates description", async () => {
    mockAxiosGet({ related: mockRelatedProducts, categories: [] });

    renderWithProviders("/product/test-product");

    // Related products appear
    expect(await screen.findByText("Related Product 1")).toBeInTheDocument();
    expect(screen.getByText("Related Product 2")).toBeInTheDocument();

    // Prices formatted by toLocaleString
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("$79.99")).toBeInTheDocument();

    // Truncation: first 60 chars + "..."
    const truncated = screen.getByText(
      /This is a related product with a long description that will/
    );
    expect(truncated.textContent).toMatch(/\.\.\.$/);
  });

  it('navigates when "More Details" is clicked', async () => {
    mockAxiosGet({ related: mockRelatedProducts, categories: [] });

    renderWithProviders("/product/test-product");

    // Wait until cards are rendered
    await screen.findByText("Related Product 1");

    const buttons = screen.getAllByRole("button", { name: "More Details" });
    expect(buttons).toHaveLength(2);

    fireEvent.click(buttons[0]);

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent(
        "/product/related-product-1"
      );
    });

    expect(screen.getByText("RELATED-PRODUCT-1-PAGE")).toBeInTheDocument();
  });

  it("makes the expected API calls in sequence", async () => {
    mockAxiosGet({ related: mockRelatedProducts, categories: [] });

    renderWithProviders("/product/test-product");

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/get-product/test-product"
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/related-product/123/cat1"
      );
    });
  });

  it("handles API errors without crashing", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValue(new Error("boom"));

    renderWithProviders("/product/test-product");

    // Should still render layout and not crash
    expect(await screen.findByText("🛒 Virtual Vault")).toBeInTheDocument();

    await waitFor(() => {
      expect(logSpy).toHaveBeenCalled();
    });

    logSpy.mockRestore();
  });

    it('adds the product to cart and updates localStorage when "ADD TO CART" is clicked', async () => {
    mockAxiosGet({ related: [], categories: [] });

    localStorage.setItem("cart", JSON.stringify([]));

    renderWithProviders("/product/test-product");

    // Wait until product is actually loaded into the UI
    await screen.findByText(/Name\s*:\s*Test Product/i);

    const btn = screen.getByRole("button", { name: /add to cart/i });
    btn.click();

    await waitFor(() => {
        const stored = JSON.parse(localStorage.getItem("cart"));
        expect(stored).toHaveLength(1);
        expect(stored[0]._id).toBe("123");
        expect(stored[0].name).toBe("Test Product");
    });
    });
});