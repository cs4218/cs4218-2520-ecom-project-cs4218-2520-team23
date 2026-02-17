// Pan Xinping, A0228445B

import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Header from "../components/Header";
import { useAuth } from "../context/auth";
import { useCart } from "../context/cart";
import useCategory from "../hooks/useCategory";
import toast from "react-hot-toast";

// Mocking the hooks and external libraries
jest.mock("../context/auth");
jest.mock("../context/cart");
jest.mock("../hooks/useCategory");
jest.mock("react-hot-toast");

// Mocking the SearchInput component to simplify the test
jest.mock("./Form/SearchInput", () => () => <div data-testid="search-input" />);

describe("Header Component", () => {
  const setAuthMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default Mock Returns
    useCart.mockReturnValue([[]]); // Empty cart
    useCategory.mockReturnValue([]); // No categories
  });

  test("renders Login and Register links when user is not authenticated", () => {
    useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
    expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
  });

  test("renders User Name and Logout when authenticated", () => {
    useAuth.mockReturnValue([{ user: { name: "John Doe", role: 0 }, token: "123" }, setAuthMock]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.queryByText(/Login/i)).not.toBeInTheDocument();
  });

  test("navigates to Admin Dashboard when user role is 1", () => {
    useAuth.mockReturnValue([{ user: { name: "Admin", role: 1 }, token: "123" }, setAuthMock]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const dashboardLink = screen.getByText(/Dashboard/i);
    expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard/admin");
  });

  test("displays the correct number of items in the cart badge", () => {
    useAuth.mockReturnValue([{ user: null }, setAuthMock]);
    useCart.mockReturnValue([[ { id: 1 }, { id: 2 } ]]); // 2 items in cart

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    // Ant Design Badge renders the count as text
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  test("calls logout functions correctly", () => {
    useAuth.mockReturnValue([{ user: { name: "John", role: 0 } }, setAuthMock]);
    
    // Mocking localStorage
    Storage.prototype.removeItem = jest.fn();

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    const logoutLink = screen.getByText(/Logout/i);
    fireEvent.click(logoutLink);

    // Verify side effects
    expect(setAuthMock).toHaveBeenCalledWith({
      user: null,
      token: "",
    });
    expect(localStorage.removeItem).toHaveBeenCalledWith("auth");
    expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
  });

  test("renders dynamic categories from useCategory hook", () => {
    useAuth.mockReturnValue([{ user: null }, setAuthMock]);
    useCategory.mockReturnValue([
      { name: "Electronics", slug: "electronics" },
      { name: "Books", slug: "books" }
    ]);

    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    );

    expect(screen.getByText("Electronics")).toBeInTheDocument();
    expect(screen.getByText("Books")).toBeInTheDocument();
  });
});