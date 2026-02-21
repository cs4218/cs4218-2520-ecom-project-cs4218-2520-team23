/**
 * Test written by Pan Xinping, A0228445B
 * I am using UI-focused component tests for the Header,
 * because Header behavior is driven by auth/cart/category state and user interactions (e.g., logout).
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning
 * - Auth state: Guest vs Logged-in user
 * - User role: Normal user vs Admin
 * - Cart state: Empty vs Non-empty
 *
 * 2. Boundary Value Analysis
 * - Cart size: 0 vs 2 (badge rendering and count visibility)
 * - Auth token presence: empty token vs valid token
 *
 * 3. State & Behaviour Testing
 * - Conditional UI rendering based on auth state and user role
 * - Route target validation for dashboard links
 * - Logout flow side effects on auth state, localStorage, and toast
 *
 * 4. Side-Effect / Interaction Testing
 * - Hook-driven state mocking (`useAuth`, `useCart`, `useCategory`)
 * - Event handling for logout click
 * - External interaction validation (`localStorage.removeItem`, toast calls)
 **/

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
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText(/Login/i)).toBeInTheDocument();
		expect(screen.getByText(/Register/i)).toBeInTheDocument();
		expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
	});

	test("renders User Name and Logout when authenticated", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: { name: "John Doe", role: 0 }, token: "123" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText("John Doe")).toBeInTheDocument();
		expect(screen.queryByText(/Login/i)).not.toBeInTheDocument();
	});

	test("navigates to Admin Dashboard when user role is 1", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: { name: "Admin", role: 1 }, token: "123" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const dashboardLink = screen.getByText(/Dashboard/i);

		// Assert
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard/admin");
	});

	test("navigates to User Dashboard when user role is 0", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: { name: "John Doe", role: 0 }, token: "123" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const dashboardLink = screen.getByText(/Dashboard/i);

		// Assert
		expect(dashboardLink.closest("a")).toHaveAttribute("href", "/dashboard/user");
	});

	test("renders SearchInput in the header", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByTestId("search-input")).toBeInTheDocument();
	});

	test("0 categories -> shows only 'All Categories'", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
		useCategory.mockReturnValue([]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const allCategoriesLink = screen.getByRole("link", { name: /All Categories/i });

		// Assert
		expect(allCategoriesLink).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Electronics/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /Books/i })).not.toBeInTheDocument();
	});

	test("2 categories -> renders links with correct routes", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
		useCategory.mockReturnValue([
			{ _id: "c1", name: "Electronics", slug: "electronics" },
			{ _id: "c2", name: "Books", slug: "books" },
		]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const electronicsLink = screen.getByRole("link", { name: /Electronics/i });
		const booksLink = screen.getByRole("link", { name: /Books/i });

		// Assert
		expect(electronicsLink).toHaveAttribute("href", "/category/electronics");
		expect(booksLink).toHaveAttribute("href", "/category/books");
	});

	test("displays the correct number of items in the cart badge", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null }, setAuthMock]);
		useCart.mockReturnValue([[{ id: 1 }, { id: 2 }]]); // 2 items in cart

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

    // Assert
		// Ant Design Badge renders the count as text
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	test("displays zero in cart badge when cart is empty", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
		useCart.mockReturnValue([[]]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	test("calls logout functions correctly", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: { name: "John", role: 0 } }, setAuthMock]);

		// Mocking localStorage
		Storage.prototype.removeItem = jest.fn();

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const logoutLink = screen.getByText(/Logout/i);
		fireEvent.click(logoutLink);

		// Assert
		expect(setAuthMock).toHaveBeenCalledWith({
			user: null,
			token: "",
		});
		expect(localStorage.removeItem).toHaveBeenCalledWith("auth");
		expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
	});
});
