// Liu Yiyang, A0258121M

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";
import AdminOrders from "./AdminOrders";
import { AuthProvider } from "../../context/auth";
import toast from "react-hot-toast";

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

jest.mock("../../components/AdminMenu", () => {
  return function MockAdminMenu() {
    return <nav data-testid="admin-menu">AdminMenu</nav>;
  };
});

jest.mock("antd", () => {
  const Select = ({ children, onChange, defaultValue }) => (
    <select
      data-testid="status-select"
      defaultValue={defaultValue}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
  Select.Option = ({ children, value }) => (
    <option value={value}>{children}</option>
  );
  return { Select };
});

function seedLocalStorage(data = {}) {
  if (data.auth) {
    localStorage.setItem("auth", JSON.stringify(data.auth));
  }
}

function makeOrder(overrides = {}) {
  return {
    _id: "order-1",
    status: "Not Process",
    buyer: { name: "Admin User" },
    createdAt: new Date().toISOString(),
    payment: { success: true },
    products: [
      {
        _id: "prod-1",
        name: "Test Product",
        price: 19.99,
        description: "Test product description",
      },
    ],
    ...overrides,
  };
}

function renderAdminOrders() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AdminOrders />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AdminOrders integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  test("orders are fetched when admin token is present", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Admin" },
        token: "admin-token",
      },
    });

    axios.get.mockResolvedValueOnce({
      data: [makeOrder({ buyer: { name: "Admin Buyer" } })],
    });

    renderAdminOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    expect(await screen.findByText("Admin Buyer")).toBeInTheDocument();
  });

  test("status update calls API and refetches orders", async () => {
    const order = makeOrder({ _id: "order-99", status: "Not Process" });

    seedLocalStorage({
      auth: {
        user: { name: "Admin" },
        token: "admin-token",
      },
    });

    axios.get.mockResolvedValueOnce({ data: [order] });
    axios.put.mockResolvedValueOnce({ data: { success: true } });
    axios.get.mockResolvedValueOnce({
      data: [makeOrder({ _id: "order-99", status: "Processing" })],
    });

    renderAdminOrders();

    await screen.findByText(order.buyer.name);

    const statusSelect = screen.getByTestId("status-select");
    fireEvent.change(statusSelect, { target: { value: "Processing" } });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order-99",
        {
          status: "Processing",
        },
      );
    });

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2);
    });
  });

  test("handles error when fetching orders", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Admin" },
        token: "admin-token",
      },
    });

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    axios.get.mockRejectedValueOnce(new Error("Network Error"));

    renderAdminOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    expect(screen.queryByText(/order-\d+/)).not.toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith(new Error("Network Error"));
    consoleSpy.mockRestore();
  });

  test("handles error when updating status", async () => {
    const order = makeOrder({ _id: "order-101", status: "Not Process" });
    seedLocalStorage({
      auth: {
        user: { name: "Admin" },
        token: "admin-token",
      },
    });

    axios.get.mockResolvedValueOnce({ data: [order] });
    axios.put.mockRejectedValueOnce(new Error("Update Failed"));

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    renderAdminOrders();

    await screen.findByText(order.buyer.name);
    expect(axios.get).toHaveBeenCalledTimes(1);

    const statusSelect = screen.getByTestId("status-select");
    fireEvent.change(statusSelect, { target: { value: "Processing" } });

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        "/api/v1/auth/order-status/order-101",
        {
          status: "Processing",
        },
      );
    });

    expect(consoleSpy).toHaveBeenCalledWith(new Error("Update Failed"));
    expect(axios.get).toHaveBeenCalledTimes(1); // Should not refetch
    consoleSpy.mockRestore();
  });

  test("displays no orders message when API returns empty array", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Admin" },
        token: "admin-token",
      },
    });

    axios.get.mockResolvedValueOnce({ data: [] });

    renderAdminOrders();

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/all-orders");
    });

    expect(screen.queryByText(/Status/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Buyer/)).not.toBeInTheDocument();
  });

  test("does not fetch orders if no token is present", async () => {
    // No token in local storage
    renderAdminOrders();

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(axios.get).not.toHaveBeenCalled();
  });
});
