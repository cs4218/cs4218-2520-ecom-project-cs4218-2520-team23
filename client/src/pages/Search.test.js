// client/src/pages/Search.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import { jest } from "@jest/globals";

const mockUseSearch = jest.fn();
jest.mock("../context/search", () => ({
  __esModule: true,
  useSearch: mockUseSearch,
}));

jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ title, children }) => (
    <div>
      <div data-testid="layout-title">{title}</div>
      {children}
    </div>
  ),
}));

const Search = require("./Search").default;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("client/src/pages/Search.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("empty results: shows 'No Products Found' and renders no product cards", () => {
    // Arrange
    const values = { results: [] };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    // Act
    render(<Search />);

    // Assert
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "Search results"
    );
    expect(screen.getByText("Search Resuts")).toBeInTheDocument();
    expect(screen.getByText("No Products Found")).toBeInTheDocument();

    // No product cards -> no "More Details" buttons
    expect(screen.queryByRole("button", { name: "More Details" })).toBeNull();
  });

  // Liu Shixin, A0265144H
  test("non-empty results: shows 'Found N' and renders cards with correct image/fields", () => {
    // Arrange
    const products = [
      {
        _id: "p1",
        name: "Phone",
        description: "123456789012345678901234567890ABCDEFG", // > 30
        price: 999,
      },
      {
        _id: "p2",
        name: "Laptop",
        description: "short desc",
        price: 1999,
      },
    ];
    const values = { results: products };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    // Act
    render(<Search />);

    // Assert
    expect(screen.getByText("Found 2")).toBeInTheDocument();

    // Card content: names
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Laptop")).toBeInTheDocument();

    // Description truncation for first item
    expect(
      screen.getByText("123456789012345678901234567890...")
    ).toBeInTheDocument();

    // Price lines (they include "$")
    expect(screen.getByText("$ 999")).toBeInTheDocument();
    expect(screen.getByText("$ 1999")).toBeInTheDocument();

    // Images: src + alt
    const img1 = screen.getByAltText("Phone");
    expect(img1).toHaveAttribute("src", "/api/v1/product/product-photo/p1");

    const img2 = screen.getByAltText("Laptop");
    expect(img2).toHaveAttribute("src", "/api/v1/product/product-photo/p2");

    // Buttons: 2 per product
    expect(
      screen.getAllByRole("button", { name: "More Details" })
    ).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "ADD TO CART" })).toHaveLength(
      2
    );
  });
});
