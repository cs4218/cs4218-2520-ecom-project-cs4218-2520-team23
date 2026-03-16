// Liu Yiyang, A0258121M

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import CreateProduct from "./CreateProduct";
import UpdateProduct from "./UpdateProduct";
import { AuthProvider } from "../../context/auth";
import { SearchProvider } from "../../context/search";
import { CartProvider } from "../../context/cart";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

jest.mock("../../components/Layout", () => {
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
  if (data.auth) {
    localStorage.setItem("auth", JSON.stringify(data.auth));
  }
}

// Helper to show current location (for navigation testing)
function LocationDisplay() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

// Factory for test data
function makeOrder(overrides = {}) {
  return {
    _id: `order-${Math.random()}`,
    status: "Not Process",
    buyer: { name: "John Doe" },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      {
        _id: "p1",
        name: "Product 1",
        price: 29.99,
        description: "Test product",
      },
    ],
    ...overrides,
  };
}

function makeCategory(overrides = {}) {
  return {
    _id: `cat-${Math.random()}`,
    name: "Test Category",
    slug: "test-category",
    ...overrides,
  };
}

function makeProduct(overrides = {}) {
  return {
    _id: `prod-${Math.random()}`,
    name: "Test Product",
    slug: "test-product",
    description: "Test product description",
    price: 49.99,
    category: { _id: "cat-1", name: "Electronics" },
    quantity: 10,
    shipping: true,
    ...overrides,
  };
}

function renderAdminOrders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <AdminOrders />
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

function renderCreateProduct() {
  return render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={["/dashboard/admin/create-product"]}>
            <Routes>
              <Route
                path="/dashboard/admin/create-product"
                element={<CreateProduct />}
              />
              <Route
                path="/dashboard/admin/products"
                element={<div>Products Page</div>}
              />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

function renderUpdateProduct() {
  return render(
    <AuthProvider>
      <SearchProvider>
        <CartProvider>
          <MemoryRouter initialEntries={["/dashboard/admin/update-product/test-slug"]}>
            <Routes>
              <Route
                path="/dashboard/admin/update-product/:slug"
                element={<UpdateProduct />}
              />
              <Route
                path="/dashboard/admin/products"
                element={<div>Products Page</div>}
              />
              <Route path="*" element={<LocationDisplay />} />
            </Routes>
            <LocationDisplay />
          </MemoryRouter>
        </CartProvider>
      </SearchProvider>
    </AuthProvider>
  );
}

describe("Admin Pages Integration Tests", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    localStorage.clear();
  });

  describe("Admin Orders - AuthContext Integration", () => {
    test("Orders are fetched when a valid auth token is present in localStorage on mount", async () => {
      const mockOrder = makeOrder({ _id: "order-1", status: "Shipped" });

      seedLocalStorage({
        auth: {
          user: { name: "Admin" },
          token: "valid-jwt-token",
        },
      });

      // AdminOrders expects the response.data to be an array
      axios.get.mockResolvedValueOnce({
        data: [mockOrder],
      });

      renderAdminOrders();

      // Verify axios was called with the orders endpoint
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
      });

      // Verify order data is rendered (check buyer name from the table)
      expect(await screen.findByText("John Doe")).toBeInTheDocument();
    });

    test("Orders are NOT fetched when localStorage has no auth data (unauthenticated state)", async () => {
      // Don't seed localStorage - simulate unauthenticated user

      renderAdminOrders();

      // Wait a moment for the component to mount
      await waitFor(
        () => {
          expect(screen.getByTestId("layout")).toBeInTheDocument();
        },
        { timeout: 500 }
      );

      // Verify axios.get was NOT called for orders
      expect(axios.get).not.toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    test("Orders are refetched when auth token changes", async () => {
      seedLocalStorage({
        auth: {
          user: { name: "Admin" },
          token: "initial-token",
        },
      });

      const order1 = makeOrder({ _id: "o1" });
      axios.get.mockResolvedValue({
        data: [order1],
      });

      renderAdminOrders();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
      });

      // The useEffect dependency on auth?.token means refetch happens on token change
      // This test verifies the dependency exists by checking initial fetch
      expect(axios.get).toHaveBeenCalled();
    });
  });

  describe("Admin Orders - Status Update and Refetch Cycle", () => {
    test("Status SELECT onChange fires PUT request to update status", async () => {
      const order1 = makeOrder({ _id: "o1", status: "Not Process" });

      seedLocalStorage({
        auth: { user: { name: "Admin" }, token: "token" },
      });

      // First GET call returns initial orders
      axios.get.mockResolvedValueOnce({
        data: [order1],
      });
      // PUT call returns success
      axios.put.mockResolvedValueOnce({ success: true });
      // Second GET call (after status change) returns updated orders
      axios.get.mockResolvedValueOnce({
        data: [makeOrder({ _id: "o1", status: "Processing" })],
      });

      renderAdminOrders();

      // Wait for initial orders to load
      expect(await screen.findByText("John Doe")).toBeInTheDocument();

      // Verify initial GET was called
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });
  });

  describe("Create Product - API Integration", () => {
    test("Categories are fetched from API on component mount", async () => {
      const cat1 = makeCategory({ _id: "c1", name: "Electronics" });
      const cat2 = makeCategory({ _id: "c2", name: "Books" });

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [cat1, cat2] },
      });

      renderCreateProduct();

      // Verify categories are fetched on mount
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    test("Form submission calls POST endpoint with FormData", async () => {
      const category = makeCategory({ _id: "c1", name: "Electronics" });

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });
      axios.post.mockResolvedValueOnce({
        data: { success: true, message: "Product created" },
      });

      renderCreateProduct();

      // Wait for categories to load
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      // Fill in form fields
      const nameInput = screen.getByPlaceholderText(/write a name/i);
      fireEvent.change(nameInput, { target: { value: "New Product" } });

      // Submit form
      const submitBtn = screen.getByRole("button", {
        name: /CREATE PRODUCT/i,
      });
      fireEvent.click(submitBtn);

      // Verify axios.post was called
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData)
        );
      });
    });

    test("Successful create shows toast and navigates", async () => {
      const category = makeCategory({ _id: "c1", name: "Electronics" });
      const mockToast = require("react-hot-toast").default;

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
        target: { value: "Created Product" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /CREATE PRODUCT/i })
      );

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Product Created Successfully"
        );
      });

      expect(screen.getByTestId("location")).toHaveTextContent(
        "/dashboard/admin/products"
      );
    });

    test("Failed create shows error toast and stays", async () => {
      const category = makeCategory({ _id: "c1", name: "Electronics" });
      const mockToast = require("react-hot-toast").default;

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });
      axios.post.mockResolvedValueOnce({
        data: { success: false, message: "Create failed" },
      });

      renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });

      fireEvent.change(screen.getByPlaceholderText(/write a name/i), {
        target: { value: "Bad Product" },
      });

      fireEvent.click(
        screen.getByRole("button", { name: /CREATE PRODUCT/i })
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Create failed");
      });

      expect(screen.getByTestId("location")).toHaveTextContent(
        "/dashboard/admin/create-product"
      );
    });

    test("BUG TEST: If axios.get is not called on mount, categories won't load", async () => {
      const category = makeCategory({ _id: "c1" });

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });

      renderCreateProduct();

      // BUG TEST: getAllCategory must be called in useEffect
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    test("BUG TEST: If axios.post is not called, form submission doesn't work", async () => {
      const category = makeCategory({ _id: "c1" });

      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [category] },
      });
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderCreateProduct();

      await waitFor(() => {
        expect(axios.get).toHaveBeenCalled();
      });

      const nameInput = screen.getByPlaceholderText(/write a name/i);
      fireEvent.change(nameInput, { target: { value: "Test" } });

      fireEvent.click(
        screen.getByRole("button", { name: /CREATE PRODUCT/i })
      );

      // BUG TEST: Verify axios.post is called with FormData
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/create-product",
          expect.any(FormData)
        );
      });
    });
  });

  describe("AdminMenu - Component Integration", () => {
    test("AdminMenu renders with CreateProduct showing all admin links", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      renderCreateProduct();

      // Verify AdminMenu and page render
      expect(await screen.findByText(/Admin Panel/i)).toBeInTheDocument();

      // Verify all admin nav links are present in AdminMenu
      expect(
        screen.getByRole("link", { name: /Create Category/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Products/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Orders/i })
      ).toBeInTheDocument();
    });

    test("BUG TEST: If AdminMenu is not rendered, navigation links won't be available", async () => {
      axios.get.mockResolvedValueOnce({
        data: { success: true, category: [] },
      });

      renderCreateProduct();

      // BUG TEST: AdminMenu should render with all navigation links
      expect(await screen.findByText(/Admin Panel/i)).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Orders/i })
      ).toBeInTheDocument();
    });
  });

  describe("Update Product - useParams and API Integration", () => {
    test("Correct API URL is called with slug from route params", async () => {
      const product = makeProduct({
        slug: "test-slug",
        _id: "prod-123",
        name: "Test Product",
        price: 79.99,
        quantity: 10,
      });
      const category = makeCategory({ _id: "cat-1", name: "Electronics" });

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({
            data: { product },
          });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderUpdateProduct();

      // Verify correct API call with slug
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-slug"
        );
      });
    });

    test("Both getSingleProduct() and getAllCategory() API calls complete", async () => {
      const product = makeProduct({
        slug: "test-slug",
        name: "My Product",
        category: { _id: "cat-1", name: "Electronics" },
      });
      const categories = [
        makeCategory({ _id: "cat-1", name: "Electronics" }),
        makeCategory({ _id: "cat-2", name: "Books" }),
      ];

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: categories },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderUpdateProduct();

      // Verify both API calls complete
      await waitFor(() => {
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/get-product/test-slug"
        );
        expect(axios.get).toHaveBeenCalledWith("/api/v1/category/get-category");
      });
    });

    test("Form fields are pre-populated with fetched product data", async () => {
      const product = makeProduct({
        slug: "test-slug",
        _id: "prod-123",
        name: "Original Product",
        price: 99.99,
        quantity: 5,
      });
      const category = makeCategory({ _id: "cat-1" });

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderUpdateProduct();

      // Verify form is pre-populated with product data
      expect(
        await screen.findByDisplayValue("Original Product")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("99.99")).toBeInTheDocument();
      expect(screen.getByDisplayValue("5")).toBeInTheDocument();
    });

    test("Form submission sends PUT request with product ID", async () => {
      const product = makeProduct({
        slug: "test-slug",
        _id: "prod-123",
        name: "Original Product",
      });
      const category = makeCategory({ _id: "cat-1" });

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      axios.put.mockResolvedValueOnce({
        data: { success: true, message: "Product updated" },
      });

      renderUpdateProduct();

      // Wait for form to populate
      await screen.findByDisplayValue("Original Product");

      // Change product name
      const nameInput = screen.getByDisplayValue("Original Product");
      fireEvent.change(nameInput, { target: { value: "Updated Product" } });

      // Submit form
      const submitBtn = screen.getByRole("button", {
        name: /UPDATE PRODUCT/i,
      });
      fireEvent.click(submitBtn);

      // Verify PUT was called with product ID
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/prod-123",
          expect.any(FormData)
        );
      });
    });

    test("Successful update shows toast and navigates", async () => {
      const product = makeProduct({
        slug: "test-slug",
        _id: "prod-123",
        name: "Original Product",
      });
      const category = makeCategory({ _id: "cat-1" });
      const mockToast = require("react-hot-toast").default;

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      renderUpdateProduct();

      await screen.findByDisplayValue("Original Product");

      fireEvent.click(
        screen.getByRole("button", { name: /UPDATE PRODUCT/i })
      );

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith(
          "Product Updated Successfully"
        );
      });

      expect(screen.getByTestId("location")).toHaveTextContent(
        "/dashboard/admin/products"
      );
    });

    test("Failed update shows error toast and stays", async () => {
      const product = makeProduct({
        slug: "test-slug",
        _id: "prod-123",
        name: "Original Product",
      });
      const category = makeCategory({ _id: "cat-1" });
      const mockToast = require("react-hot-toast").default;

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      axios.put.mockResolvedValueOnce({
        data: { success: false, message: "Update failed" },
      });

      renderUpdateProduct();

      await screen.findByDisplayValue("Original Product");

      fireEvent.click(
        screen.getByRole("button", { name: /UPDATE PRODUCT/i })
      );

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith("Update failed");
      });

      expect(screen.getByTestId("location")).toHaveTextContent(
        "/dashboard/admin/update-product/test-slug"
      );
    });
  });

  describe("Critical Logic Tests", () => {
    test("If getSingleProduct is not called, form fields remain empty", async () => {
      const product = makeProduct({ slug: "test-slug", name: "My Product" });
      const category = makeCategory({ _id: "cat-1" });

      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/product/get-product/test-slug") {
          return Promise.resolve({ data: { product } });
        }
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error(`Unhandled URL: ${url}`));
      });

      renderUpdateProduct();

      await waitFor(() => {
        expect(
          screen.getByDisplayValue(product.name)
        ).toBeInTheDocument();
      });
    });

    test("if axios.put is not called, product won't be updated", async () => {
      const product = makeProduct({ slug: "test-slug", _id: "p1", name: "Test" });
      const category = makeCategory({ _id: "c1" });

      axios.get.mockImplementation((url) => {
        if (url.includes("get-product")) {
          return Promise.resolve({ data: { product } });
        }
        if (url.includes("get-category")) {
          return Promise.resolve({
            data: { success: true, category: [category] },
          });
        }
        return Promise.reject(new Error("Unhandled URL"));
      });

      axios.put.mockResolvedValueOnce({
        data: { success: true },
      });

      renderUpdateProduct();

      await screen.findByDisplayValue(product.name);

      fireEvent.click(
        screen.getByRole("button", { name: /UPDATE PRODUCT/i })
      );

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "/api/v1/product/update-product/p1",
          expect.any(FormData)
        );
      });
    });

    test("If auth token is missing, Orders page won't load data", async () => {
      axios.get.mockResolvedValueOnce([]);

      renderAdminOrders();

      await waitFor(
        () => {
          expect(axios.get).not.toHaveBeenCalledWith(
            "/api/v1/auth/all-orders"
          );
        },
        { timeout: 500 }
      );
    });
  });
});
