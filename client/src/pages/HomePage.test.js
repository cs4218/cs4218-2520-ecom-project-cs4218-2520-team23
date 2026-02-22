/**
 * Test written by Pan Xinping, A0228445B
 * I am using comprehensive tests for the HomePage component, which handles product listing, filtering, pagination, and cart interactions.
 * The component involves multiple API calls, state management, and user interactions, so tests cover rendering, data fetching, filtering logic, pagination, cart operations, and error handling.
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning
 * - Products: Present vs Absent
 * - Categories: Present vs Absent
 * - Filters: Applied vs Not Applied
 * - Cart: Empty vs Non-empty
 *
 * 2. Boundary Value Analysis
 * - Product count: 0 vs 1 vs many
 * - Page number: 1 vs multiple pages
 * - Filter combinations: None vs category only vs price only vs both
 *
 * 3. Bug Detection Tests
 * - API error handling for categories, product count, and product list
 * - State updates on filtering and pagination
 * - LocalStorage and cart context updates on add to cart
 *
 * 4. State & Behaviour Testing
 * - Filtering: Category checkboxes and price radios trigger correct API calls
 * - Pagination: Load more button loads additional products and hides when all loaded
 * - Cart addition: Updates context and localStorage, shows toast
 * - Navigation: Clicking details navigates to product page
 *
 * 5. Side-Effect / Interaction Testing
 * - API calls: Mocked axios for get/post requests, verifying parameters and responses
 * - Context updates: useCart hook updates on add to cart
 * - Navigation: useNavigate called with correct paths
 * - Toast notifications: react-hot-toast success called
 **/

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom";
import HomePage from "./HomePage";
import axios from "axios";
import { BrowserRouter } from "react-router-dom";
import { useCart } from "../context/cart";

// --- Mocks ---
jest.mock("axios");
jest.mock("../context/cart", () => ({
	useCart: jest.fn(),
}));
jest.mock("react-hot-toast", () => ({
	success: jest.fn(),
}));
jest.mock("react-icons/ai", () => ({
	AiOutlineReload: () => <span>Reload Icon</span>,
}));

// Mocking Layout to avoid nesting issues
jest.mock("./../components/Layout", () => ({ children }) => <div>{children}</div>);

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

// Mock localStorage to avoid side effects
const localStorageMock = {
	getItem: jest.fn(),
	setItem: jest.fn(),
	removeItem: jest.fn(),
	clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
	writable: true,
});

describe("HomePage Component Logic", () => {
	const mockProducts = [{ _id: "1", name: "Product 1", price: 100, description: "Desc 1", slug: "p1" }];
	const mockCategories = [{ _id: "cat1", name: "Electronics" }];
	const mockSetCart = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		localStorageMock.clear();
		useCart.mockReturnValue([[], mockSetCart]);
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});
	});

	// --- Rendering and Initial Setup ---
	test("renders the component with all UI elements on initial load", async () => {
		// Arrange: Render the component
		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		// Act: No action needed for initial render

		// Assert: Check presence of key UI elements
		await screen.findByText(/Product 1/i);
		expect(screen.getByText("All Products")).toBeInTheDocument();
		expect(screen.getByText("Filter By Category")).toBeInTheDocument();
		expect(screen.getByText("Filter By Price")).toBeInTheDocument();
		expect(screen.getByText("RESET FILTERS")).toBeInTheDocument();
	});

	test("displays loading state while fetching products", async () => {
		// Arrange: Mock delayed response and render
		axios.get.mockImplementationOnce(
			() => new Promise((resolve) => setTimeout(() => resolve({ data: { products: mockProducts } }), 100)),
		);
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for loading to complete
		await screen.findByText(/Product 1/i);

		// Assert: Initially, products should not be there (but hard to test loading text without it)
		// Since loading is not explicitly shown, this test ensures async behavior
		expect(screen.getByText(/Product 1/i)).toBeInTheDocument();
	});

	test("categories -> API returns 0 categories -> displays 0 categories", async () => {
		// Arrange: Isolate API responses for this test only
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category")) return Promise.resolve({ data: { success: true, category: [] } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});

		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act
		await screen.findByText(/Product 1/i);

		// Assert
		expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
	});

	test("categories -> API returns 1 category -> displays 1 category", async () => {
		// Arrange: Isolate API responses for this test only
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: [{ _id: "cat1", name: "Electronics" }] } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});

		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act
		const categoryCheckbox = await screen.findByRole("checkbox", { name: /electronics/i });

		// Assert
		expect(categoryCheckbox).toBeInTheDocument();
		expect(screen.getAllByRole("checkbox")).toHaveLength(1);
	});

	test("categories -> API returns 10 categories -> displays 10 categories", async () => {
		// Arrange: Isolate API responses for this test only
		const tenCategories = Array.from({ length: 10 }, (_, index) => ({
			_id: `cat${index + 1}`,
			name: `Category ${index + 1}`,
		}));

		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: tenCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});

		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act
		await screen.findByRole("checkbox", { name: /^category 1$/i });

		// Assert
		expect(screen.getAllByRole("checkbox")).toHaveLength(10);
		expect(screen.getByRole("checkbox", { name: /category 10/i })).toBeInTheDocument();
	});

	test("displays products with correct details in the grid", async () => {
		// Arrange: Render the component
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for products
		await screen.findByText(/Product 1/i);

		// Assert: Product details are displayed
		expect(screen.getByText("Product 1")).toBeInTheDocument();
		expect(screen.getByText((content) => content.includes("$100.00"))).toBeInTheDocument();
		expect(screen.getByText("Desc 1...")).toBeInTheDocument();
		expect(screen.getByText("More Details")).toBeInTheDocument();
		expect(screen.getByText("ADD TO CART")).toBeInTheDocument();
	});

	// --- Filtering Logic ---
	test("filtering -> 1 category is checked -> triggers filter API correctly", async () => {
		// Arrange: Mock the filter API response and render the component
		axios.post.mockResolvedValue({ data: { products: [] } });
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Check the category checkbox
		const checkbox = await screen.findByRole("checkbox", { name: /electronics/i });
		fireEvent.click(checkbox);

		// Assert: Check that the filter API was called with correct parameters
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1"],
				radio: [],
			});
		});
	});

	test("filtering -> 1 checkbox checked and unchecked -> applies category filter correctly", async () => {
		// Arrange: Mock filter response
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const checkbox = await screen.findByRole("checkbox", { name: /electronics/i });
		fireEvent.click(checkbox); // Check
		await waitFor(() =>
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1"],
				radio: [],
			}),
		);

		// Reset call history so the uncheck path is isolated
		axios.post.mockClear();
		axios.get.mockClear();

		fireEvent.click(checkbox); // Uncheck
		await waitFor(() => {
			// Assert: Filter API is not used when filters are cleared
			expect(axios.post).not.toHaveBeenCalled();
		});

		await waitFor(() => {
			// Assert: Unchecking reloads the broader unfiltered results
			expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/1");
			expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-count");
		});
	});

	test("filtering -> 2 checkboxes checked -> triggers filter API with multiple categories", async () => {
		// Arrange: Mock multiple categories and filter response
		const multipleCategories = [
			{ _id: "cat1", name: "Electronics" },
			{ _id: "cat2", name: "Books" },
		];
		axios.get.mockImplementationOnce((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: multipleCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});
		axios.post.mockResolvedValue({ data: { products: [] } });
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Check multiple category checkboxes
		const checkbox1 = await screen.findByRole("checkbox", { name: /electronics/i });
		const checkbox2 = await screen.findByRole("checkbox", { name: /books/i });
		fireEvent.click(checkbox1);
		fireEvent.click(checkbox2);

		// Assert: Check that the filter API was called with multiple checked categories
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1", "cat2"],
				radio: [],
			});
		});
	});

	test("filtering -> 2 checkboxes checked, then 1 unchecked -> remains filtered by the remaining category", async () => {
		// Arrange
		const multipleCategories = [
			{ _id: "cat1", name: "Electronics" },
			{ _id: "cat2", name: "Books" },
		];
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: multipleCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 2 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});
		axios.post.mockResolvedValue({ data: { products: mockProducts } });

		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		const checkbox1 = await screen.findByRole("checkbox", { name: /electronics/i });
		const checkbox2 = await screen.findByRole("checkbox", { name: /books/i });

		// Act: Select both categories
		fireEvent.click(checkbox1);
		fireEvent.click(checkbox2);

		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1", "cat2"],
				radio: [],
			});
		});

		// Act: Uncheck one category
		fireEvent.click(checkbox1);

		// Assert: Still filtered by the remaining checked category
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat2"],
				radio: [],
			});
		});
	});

	test("filtering -> selects a price radio -> sends correct price array to API", async () => {
		// Arrange: Mock the filter API response and render the component
		axios.post.mockResolvedValue({
			data: {
				products: [{ _id: "2", name: "Filtered Product", price: 25, description: "Fits range", slug: "fp" }],
			},
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Select a price radio button
		const priceRadio = await screen.findByLabelText(/\$20 to 39/i);
		fireEvent.click(priceRadio);

		// Assert: Check that the filter API was called with correct radio array
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith(
				"/api/v1/product/product-filters",
				expect.objectContaining({
					radio: [20, 39],
				}),
			);
		});

		// Assert: Check that the filtered product is displayed
		expect(await screen.findByText("Filtered Product")).toBeInTheDocument();
	});

	test("filtering -> 2 categories + 1 price radio -> returns correctly filtered product list", async () => {
		// Arrange
		const multipleCategories = [
			{ _id: "cat1", name: "Electronics" },
			{ _id: "cat2", name: "Books" },
		];
		const unfilteredProductsWithDummies = [
			...mockProducts,
			{ _id: "4", name: "Out of Price Range Product", price: 150, description: "Too expensive", slug: "opr" },
			{ _id: "5", name: "Wrong Category Product", price: 30, description: "Wrong category", slug: "wcp" },
		];
		const combinedFilteredProducts = [
			{ _id: "3", name: "Combo Filter Product", price: 30, description: "Matches both filters", slug: "cfp" },
		];

		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: multipleCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list"))
				return Promise.resolve({ data: { products: unfilteredProductsWithDummies } });
			return Promise.reject(new Error("not found"));
		});
		axios.post.mockResolvedValue({ data: { products: combinedFilteredProducts } });

		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		const checkbox1 = await screen.findByRole("checkbox", { name: /electronics/i });
		const checkbox2 = await screen.findByRole("checkbox", { name: /books/i });
		const priceRadio = await screen.findByLabelText(/\$20 to 39/i);

		// Act
		fireEvent.click(checkbox1);
		fireEvent.click(checkbox2);
		fireEvent.click(priceRadio);

		// Assert: final combined payload is sent
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1", "cat2"],
				radio: [20, 39],
			});
		});

		// Assert: filtered product list is rendered
		expect(await screen.findByText("Combo Filter Product")).toBeInTheDocument();
		expect(screen.queryByText("Product 1")).not.toBeInTheDocument();
		expect(screen.queryByText("Out of Price Range Product")).not.toBeInTheDocument();
		expect(screen.queryByText("Wrong Category Product")).not.toBeInTheDocument();
	});

	test("filtering -> clears filters and reloads all products when RESET FILTERS is clicked", async () => {
		// Arrange: Mock window.location.reload
		delete window.location;
		window.location = { reload: jest.fn() };
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Click reset
		fireEvent.click(screen.getByText("RESET FILTERS"));

		// Assert: Reload called
		expect(window.location.reload).toHaveBeenCalled();
	});

	test("filtering -> does not fetch filtered products if no filters are applied", async () => {
		// Arrange: Render without filters
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for initial load
		await screen.findByText(/Product 1/i);

		// Assert: Only initial fetches, no post
		expect(axios.post).not.toHaveBeenCalled();
	});

	// --- Pagination and Loading More ---
	test("pagination -> loads more products when Load More button is clicked", async () => {
		// Arrange: Mock more products and higher total
		const moreProducts = [{ _id: "2", name: "Product 2", price: 200, description: "Desc 2", slug: "p2" }];
		axios.get.mockImplementation((url) => {
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 2 } });
			if (url.includes("product-list/1")) return Promise.resolve({ data: { products: mockProducts } });
			if (url.includes("product-list/2")) return Promise.resolve({ data: { products: moreProducts } });
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			return Promise.reject(new Error("not found"));
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const loadMoreBtn = await screen.findByRole("button", { name: /load more/i });
		fireEvent.click(loadMoreBtn);

		// Assert: Second page fetched
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2"));
		expect(await screen.findByText("Product 2")).toBeInTheDocument();
	});

	test("pagination -> hides Load More button when all products are loaded", async () => {
		// Arrange: Total equals loaded
		axios.get.mockImplementation((url) => {
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			return Promise.reject(new Error("not found"));
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		await screen.findByText(/Product 1/i);

		// Assert: No Load More button
		expect(screen.queryByRole("button", { name: /loadmore/i })).not.toBeInTheDocument();
	});

	test("pagination -> resets page to 1 when filters change", async () => {
		// Arrange: Load more first
		const moreProducts = [{ _id: "2", name: "Product 2", price: 200, description: "Desc 2", slug: "p2" }];
		axios.get.mockImplementation((url) => {
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 3 } });
			if (url.includes("product-list/1")) return Promise.resolve({ data: { products: mockProducts } });
			if (url.includes("product-list/2")) return Promise.resolve({ data: { products: moreProducts } });
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			return Promise.reject(new Error("not found"));
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const loadMoreBtn = await screen.findByRole("button", { name: /load more/i });
		fireEvent.click(loadMoreBtn);
		await screen.findByText("Product 2");

		// Act: Apply filter
		axios.post.mockResolvedValue({ data: { products: [] } });
		const checkbox = await screen.findByRole("checkbox", { name: /electronics/i });
		fireEvent.click(checkbox);

		// Assert: Filter called (page reset is internal, hard to assert directly)
		await waitFor(() => expect(axios.post).toHaveBeenCalled());
	});

	// --- User Interactions (Cart and Navigation) ---
	test("user interactions -> adds product to cart and updates localStorage", async () => {
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const addToCartBtn = await screen.findByText("ADD TO CART");
		fireEvent.click(addToCartBtn);

		// Assert: Check that setCart was called
		expect(mockSetCart).toHaveBeenCalled();

		// Assert: Check that localStorage was updated
		expect(localStorage.setItem).toHaveBeenCalledWith("cart", expect.stringContaining("Product 1"));
	});

	test("user interactions -> navigates to product details on button click", async () => {
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const detailsBtn = await screen.findByRole("button", { name: /more details/i });
		fireEvent.click(detailsBtn);

		// Assert: Check that navigate was called with correct path
		expect(mockNavigate).toHaveBeenCalledWith("/product/p1");
	});

	test("user interactions -> displays toast notification when adding to cart", async () => {
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		const addToCartBtn = await screen.findByText("ADD TO CART");
		fireEvent.click(addToCartBtn);

		// Assert: Toast called
		expect(require("react-hot-toast").success).toHaveBeenCalledWith("Item Added to cart");
	});

	// --- Edge Cases and Error Handling ---
	test("handles empty product list gracefully", async () => {
		// Arrange: Mock empty products
		axios.get.mockImplementation((url) => {
			if (url.includes("product-list")) return Promise.resolve({ data: { products: [] } });
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 0 } });
			return Promise.reject(new Error("not found"));
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for load
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("product-list")));

		// Assert: No products, but component renders
		expect(screen.queryByText(/Product 1/i)).not.toBeInTheDocument();
		expect(screen.getByText("All Products")).toBeInTheDocument();
	});

	test("errors -> handles API errors for category fetching gracefully", async () => {
		// Arrange: Mock error for categories and render
		axios.get.mockImplementationOnce((url) => {
			if (url.includes("get-category")) return Promise.reject(new Error("Network error"));
			return Promise.resolve({ data: { total: 1, products: mockProducts } });
		});
		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		await screen.findByText(/Product 1/i);
		expect(screen.getByText(/Product 1/i)).toBeInTheDocument();
		expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
		consoleSpy.mockRestore();
	});

	test("errors -> handles API errors for product count fetching gracefully", async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes("product-count")) return Promise.reject(new Error("Count error"));
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});
		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});
		await screen.findByText(/Product 1/i);
		expect(screen.getByText(/Product 1/i)).toBeInTheDocument();
		expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error));
		consoleSpy.mockRestore();
	});

	test("errors -> handles API errors for product list fetching gracefully", async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes("product-list")) return Promise.reject(new Error("List error"));
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			return Promise.reject(new Error("not found"));
		});
		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Attempt to find products (should not appear)
		await waitFor(() => expect(consoleSpy).toHaveBeenCalledWith(expect.any(Error)));

		// Assert: No products displayed due to error
		expect(screen.queryByText(/Product 1/i)).not.toBeInTheDocument();
		consoleSpy.mockRestore();
	});

	test("errors -> handles network errors during any API call gracefully", async () => {
		// Arrange: Mock all to reject
		axios.get.mockRejectedValue(new Error("Network error"));
		const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for errors
		await waitFor(() => expect(consoleSpy).toHaveBeenCalledTimes(3)); // categories, count, list
		// Assert: Component renders without crashing
		expect(screen.getByText("All Products")).toBeInTheDocument();
		consoleSpy.mockRestore();
	});
});
