// client/src/pages/admin/Products.test.js
import { jest } from "@jest/globals";
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";

const mockAxiosGet = jest.fn();
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: mockAxiosGet },
}));

const mockToastError = jest.fn();
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: mockToastError },
}));

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

jest.mock("../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu" />,
}));

// Mock Link so we don't need a Router (still unit-level)
jest.mock("react-router-dom", () => ({
  __esModule: true,
  Link: ({ to, children, ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLocation: jest.fn(() => ({ pathname: "/dashboard/admin/products" })),
}));

const Products = require("./Products").default;

let consoleLogSpy;

beforeEach(() => {
  jest.clearAllMocks();
  consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  consoleLogSpy.mockRestore();
});

describe("client/src/pages/admin/Products.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("success: fetches products on mount and renders product links/cards", async () => {
    // Arrange
    const products = [
      { _id: "p1", slug: "phone-1", name: "Phone", description: "Nice phone" },
      {
        _id: "p2",
        slug: "laptop-2",
        name: "Laptop",
        description: "Fast laptop",
      },
    ];
    mockAxiosGet.mockResolvedValue({ data: { products } });

    // Act
    render(<Products />);

    // Wrapper components present
    expect(screen.getByTestId("layout")).toBeInTheDocument();
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();

    // Heading
    expect(
      screen.getByRole("heading", { name: "All Products List" })
    ).toBeInTheDocument();

    // Links (hrefs)
    const links = await screen.findAllByRole("link");
    expect(mockAxiosGet).toHaveBeenCalledWith("/api/v1/product/get-product");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/phone-1"
    );
    expect(links[1]).toHaveAttribute(
      "href",
      "/dashboard/admin/product/laptop-2"
    );

    // Images
    const img1 = screen.getByAltText("Phone");
    expect(img1.getAttribute("src")).toContain(
      "/api/v1/product/product-photo/p1"
    );

    const img2 = screen.getByAltText("Laptop");
    expect(img2.getAttribute("src")).toContain(
      "/api/v1/product/product-photo/p2"
    );

    // Text fields
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Nice phone")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();
    expect(screen.getByText("Fast laptop")).toBeInTheDocument();

    // No error path calls
    expect(mockToastError).not.toHaveBeenCalled();
    expect(consoleLogSpy).not.toHaveBeenCalled();
  });

  // Liu Shixin, A0265144H
  test("failure: logs error and shows toast error; renders no product links", async () => {
    // Arrange
    const err = new Error("fetch failed");
    mockAxiosGet.mockRejectedValue(err);

    // Act
    render(<Products />);

    // Assert
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith("/api/v1/product/get-product");
    });

    await waitFor(() => {
      expect(consoleLogSpy).toHaveBeenCalledWith(err);
      expect(mockToastError).toHaveBeenCalledWith("Someething Went Wrong");
    });

    // No product links rendered
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
});
