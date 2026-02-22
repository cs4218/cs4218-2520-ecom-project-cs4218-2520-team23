// client/src/pages/user/Orders.test.js
import { jest } from "@jest/globals";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

const mockAxiosGet = jest.fn();
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: mockAxiosGet },
}));

const mockUseAuth = jest.fn();
jest.mock("../../context/auth", () => ({
  __esModule: true,
  useAuth: mockUseAuth,
}));

const mockFromNow = jest.fn(() => "MOCK_FROM_NOW");
const mockMoment = jest.fn(() => ({ fromNow: mockFromNow }));
jest.mock("moment", () => ({
  __esModule: true,
  default: mockMoment,
}));

jest.mock("../../components/UserMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="user-menu" />,
}));

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ title, children }) => (
    <div>
      <div data-testid="layout-title">{title}</div>
      {children}
    </div>
  ),
}));

const Orders = require("./Orders").default;

let consoleLogSpy;
let consoleErrorSpy;

beforeEach(() => {
  jest.clearAllMocks();
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  // silence React key warnings etc
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe("client/src/pages/user/Orders.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("with auth token: fetches orders and renders table + product cards", async () => {
    // Arrange
    const auth = { token: "token123", user: { name: "Me" } };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    const longDesc = "123456789012345678901234567890ABCDEFG"; // >30
    const orders = [
      {
        _id: "o1",
        status: "Processing",
        buyer: { name: "Alice" },
        createAt: "2020-01-01T00:00:00.000Z",
        payment: { success: true },
        products: [
          { _id: "p1", name: "Phone", description: longDesc, price: 999 },
          { _id: "p2", name: "Cable", description: "short desc", price: 10 },
        ],
      },
    ];
    mockAxiosGet.mockResolvedValue({ data: orders });

    // Act
    render(<Orders />);

    // Assert: fetch called
    await waitFor(() => {
      expect(screen.getByText("Processing")).toBeInTheDocument();
    });
    expect(mockAxiosGet).toHaveBeenCalledWith("/api/v1/auth/orders");

    // Layout + page heading
    expect(screen.getByTestId("layout-title")).toHaveTextContent("Your Orders");
    expect(screen.getByText("All Orders")).toBeInTheDocument();
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();

    // Table fields
    expect(screen.getByText("Processing")).toBeInTheDocument();
    expect(screen.getByText("Alice")).toBeInTheDocument();

    // moment called with createAt and fromNow displayed
    expect(mockMoment).toHaveBeenCalledWith("2020-01-01T00:00:00.000Z");
    expect(screen.getByText("MOCK_FROM_NOW")).toBeInTheDocument();

    // Payment + quantity
    expect(screen.getByText("Success")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // products length

    // Product cards
    const img1 = screen.getByAltText("Phone");
    expect(img1).toHaveAttribute("src", "/api/v1/product/product-photo/p1");

    const img2 = screen.getByAltText("Cable");
    expect(img2).toHaveAttribute("src", "/api/v1/product/product-photo/p2");

    // Description substring(0, 30) for longDesc
    expect(screen.getByText(longDesc.substring(0, 30))).toBeInTheDocument();

    // Price lines
    expect(screen.getByText("Price : 999")).toBeInTheDocument();
    expect(screen.getByText("Price : 10")).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("without auth token: does not fetch orders", async () => {
    // Arrange
    const auth = { token: null, user: { name: "Me" } };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    // Act
    render(<Orders />);

    // Assert
    expect(mockAxiosGet).not.toHaveBeenCalled();
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("fetch rejects: logs error and does not crash", async () => {
    // Arrange
    const auth = { token: "token123" };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    const err = new Error("network fail");
    mockAxiosGet.mockRejectedValue(err);

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(err);
    });
    expect(screen.getByText("All Orders")).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("handles missing payment safely (should render 'Failed' and not throw)", async () => {
    // Arrange
    const auth = { token: "token123" };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    const orders = [
      {
        _id: "o1",
        status: "Shipped",
        buyer: { name: "Bob" },
        createAt: "2020-01-01T00:00:00.000Z",
        // payment missing
        products: [{ _id: "p1", name: "Item", description: "desc", price: 1 }],
      },
    ];
    mockAxiosGet.mockResolvedValue({ data: orders });

    // Act
    render(<Orders />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Shipped")).toBeInTheDocument();
    });
    expect(mockAxiosGet).toHaveBeenCalled();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });
});
