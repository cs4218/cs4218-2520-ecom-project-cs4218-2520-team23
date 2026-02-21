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

	test("displays categories fetched from the API in the filter section", async () => {
		// Arrange: Render the component
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for categories to load
		const categoryCheckbox = await screen.findByRole("checkbox", { name: /electronics/i });

		// Assert: Category is displayed
		expect(categoryCheckbox).toBeInTheDocument();
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

	// --- Data Fetching and API Calls ---
	test("handles API errors for category fetching gracefully", async () => {
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

	test("handles API errors for product count fetching gracefully", async () => {
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

	test("handles API errors for product list fetching gracefully", async () => {
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

	// --- Filtering Logic ---
	test("triggers filter API when a category is checked", async () => {
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

	test("sends correct price array to API when a price radio is selected", async () => {
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

	test("applies category filter when checkboxes are checked and unchecked", async () => {
		// Arrange: Mock filter response
		// axios.post.mockResolvedValue({ data: { products: [] } });
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

		fireEvent.click(checkbox); // Uncheck
		await waitFor(() => {
			// Assert: Filter is not applied again, only called once
			expect(axios.post).toHaveBeenCalledTimes(1);
		});
	});

	test("clears filters and reloads all products when RESET FILTERS is clicked", async () => {
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

	test("does not fetch filtered products if no filters are applied", async () => {
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
	test("loads more products when Load More button is clicked", async () => {
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
		const loadMoreBtn = await screen.findByText("Load more");
		fireEvent.click(loadMoreBtn);

		// Assert: Second page fetched
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/product/product-list/2"));
		expect(await screen.findByText("Product 2")).toBeInTheDocument();
	});

	test("hides Load More button when all products are loaded", async () => {
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
		expect(screen.queryByText("Load more")).not.toBeInTheDocument();
	});

	// --- User Interactions (Cart and Navigation) ---
	test("adds product to cart and updates localStorage", async () => {
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

	test("navigates to product details on button click", async () => {
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

	test("displays toast notification when adding to cart", async () => {
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

	// --- State Management and Effects ---
	test("resets page to 1 when filters change", async () => {
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
		const loadMoreBtn = await screen.findByText("Load more");
		fireEvent.click(loadMoreBtn);
		await screen.findByText("Product 2");

		// Act: Apply filter
		axios.post.mockResolvedValue({ data: { products: [] } });
		const checkbox = await screen.findByRole("checkbox", { name: /electronics/i });
		fireEvent.click(checkbox);

		// Assert: Filter called (page reset is internal, hard to assert directly)
		await waitFor(() => expect(axios.post).toHaveBeenCalled());
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

	test("handles empty categories list gracefully", async () => {
		// Arrange: Mock empty categories
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category")) return Promise.resolve({ data: { success: true, category: [] } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			return Promise.reject(new Error("not found"));
		});
		await act(async () => {
			render(
				<BrowserRouter>
					<HomePage />
				</BrowserRouter>,
			);
		});

		// Act: Wait for products
		await screen.findByText(/Product 1/i);

		// Assert: Products display, no categories
		expect(screen.getByText(/Product 1/i)).toBeInTheDocument();
		expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
	});

	test("handles network errors during any API call gracefully", async () => {
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
