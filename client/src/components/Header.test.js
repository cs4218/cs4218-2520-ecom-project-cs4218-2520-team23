/**
 * Test written by Pan Xinping, A0228445B
 * I am using UI-focused component tests for Header because it is a state-driven navigation shell
 * whose output changes based on authentication, user role, cart size, and category data.
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning
 * - Auth state: Guest vs Authenticated user
 * - Role state: Admin (role=1) vs Non-admin (role=0 or others)
 * - Category state: Empty category list vs Populated category list
 * - Cart state: Empty cart vs Non-empty cart
 *
 * 2. Boundary Value Analysis
 * - Cart count boundary: 0 vs 2 items vs 99+ items (to check overflow logic)
 * - Category list size boundary: 0 vs 1 vs 2 items
 * - Role boundary: expected admin value (1) vs out-of-range value (e.g., 2)
 *
 * Testing Approaches Applied:
 * 1. Dependency Mocking (Isolation)
 * - Mocked useAuth, useCart, and useCategory to simulate application states.
 * - Assert that navigation links contain the correct to or href attributes based on the data provided.
 * - Instead of checking the real browser state, we verify that the logout function from our hook was called and that the toast service was invoked.
 *
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

	test("user is not authenticated -> renders Login and Register links", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const loginLink = screen.getByRole("link", { name: /Login/i });
		const registerLink = screen.getByRole("link", { name: /Register/i });

		// Assert
		expect(loginLink).toBeInTheDocument();
		expect(registerLink).toBeInTheDocument();
		expect(loginLink).toHaveAttribute("href", "/login");
		expect(registerLink).toHaveAttribute("href", "/register");
		expect(screen.queryByText(/Logout/i)).not.toBeInTheDocument();
		expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
	});

	test("user is authenticated -> renders User Name and Logout", () => {
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
		expect(screen.queryByText(/Register/i)).not.toBeInTheDocument();
	});

	test("user role is 1 -> navigates to Admin Dashboard", () => {
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

	test("user role is 0 -> navigates to User Dashboard", () => {
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

	test("user role is neither 0 nor 1 -> navigates to User Dashboard", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: { name: "Other Role", role: 2 }, token: "123" }, setAuthMock]);

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

	test("1 category -> renders exactly one dynamic category link", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
		useCategory.mockReturnValue([{ _id: "c1", name: "Electronics", slug: "electronics" }]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const allLinks = screen.getAllByRole("link");
		const categoryLinks = allLinks.filter((link) => link.getAttribute("href")?.startsWith("/category/"));

		// Assert
		expect(categoryLinks).toHaveLength(1);
		expect(screen.getByRole("link", { name: /Electronics/i })).toHaveAttribute("href", "/category/electronics");
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

	test("always includes 'All Categories' link with correct route", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const allCategoriesLink = screen.getByRole("link", { name: /All Categories/i });

		// Assert
		expect(allCategoriesLink).toHaveAttribute("href", "/categories");
	});

	test("0 items in cart -> displays zero in cart badge", () => {
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

	test("2 items in cart -> displays 2 in the cart badge", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null }, setAuthMock]);
		useCart.mockReturnValue([[{ id: 1 }, { id: 2 }]]); // 2 items in cart

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText("2")).toBeInTheDocument();
	});

	test("99+ items in cart -> displays 99+ in cart badge", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
		const largeCart = Array.from({ length: 120 }, (_, index) => ({ id: index + 1 }));
		useCart.mockReturnValue([largeCart]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Assert
		expect(screen.getByText("99+")).toBeInTheDocument();
	});

	test("renders Cart nav link with correct route", () => {
		// Arrange
		useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);

		render(
			<MemoryRouter>
				<Header />
			</MemoryRouter>,
		);

		// Act
		const cartLink = screen.getByRole("link", { name: /Cart/i });

		// Assert
		expect(cartLink).toHaveAttribute("href", "/cart");
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
		expect(logoutLink.closest("a")).toHaveAttribute("href", "/login");
		fireEvent.click(logoutLink);

		// Assert
		expect(setAuthMock).toHaveBeenCalledTimes(1);
		expect(setAuthMock).toHaveBeenCalledWith({
			user: null,
			token: "",
		});
		expect(localStorage.removeItem).toHaveBeenCalledTimes(1);
		expect(localStorage.removeItem).toHaveBeenCalledWith("auth");
		expect(toast.success).toHaveBeenCalledTimes(1);
		expect(toast.success).toHaveBeenCalledWith("Logout Successfully");
	});
});
