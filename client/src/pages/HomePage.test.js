import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

// Mocking Layout to avoid nesting issues
jest.mock("./../components/Layout", () => ({ children }) => <div>{children}</div>);

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	...jest.requireActual("react-router-dom"),
	useNavigate: () => mockNavigate,
}));

describe("HomePage Component Logic", () => {
	const mockProducts = [{ _id: "1", name: "Product 1", price: 100, description: "Desc 1", slug: "p1" }];
	const mockCategories = [{ _id: "cat1", name: "Electronics" }];
	const mockSetCart = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		useCart.mockReturnValue([[], mockSetCart]);

		// Default Axios Mocks
		axios.get.mockImplementation((url) => {
			if (url.includes("get-category"))
				return Promise.resolve({ data: { success: true, category: mockCategories } });
			if (url.includes("product-count")) return Promise.resolve({ data: { total: 1 } });
			if (url.includes("product-list")) return Promise.resolve({ data: { products: mockProducts } });
			return Promise.reject(new Error("not found"));
		});
	});

	test("fetches and displays products on mount", async () => {
		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		// Wait for the API calls to resolve and the 'Product 1' title to appear
		// findByText is the async version of getByText; it retries automatically
		const productTitle = await screen.findByText(/Product 1/i);
		expect(productTitle).toBeInTheDocument();

		// Use a function matcher for the price to ignore formatting quirks
		const productPrice = screen.getByText((content, element) => {
			return element.tagName.toLowerCase() === "h5" && content.includes("100");
		});
		expect(productPrice).toBeInTheDocument();

		// Confirm the API was called for the initial list
		expect(axios.get).toHaveBeenCalledWith(expect.stringContaining("/api/v1/product/product-list/1"));
	});

	test("adds product to cart and updates localStorage", async () => {
		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		const addToCartBtn = await screen.findByText("ADD TO CART");
		fireEvent.click(addToCartBtn);

		expect(mockSetCart).toHaveBeenCalled();
		expect(localStorage.getItem("cart")).toContain("Product 1");
	});

	test("navigates to product details on button click", async () => {
		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		const detailsBtn = await screen.findByText("More Details");
		fireEvent.click(detailsBtn);

		expect(mockNavigate).toHaveBeenCalledWith("/product/p1");
	});

	test("triggers filter API when a category is checked", async () => {
		axios.post.mockResolvedValue({ data: { products: [] } });

		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		const checkbox = await screen.findByRole("checkbox", { name: /electronics/i });
		fireEvent.click(checkbox);

		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith("/api/v1/product/product-filters", {
				checked: ["cat1"],
				radio: [],
			});
		});
	});

	test("sends correct price array to API when a price radio is selected", async () => {
		// Mock the filter response
		axios.post.mockResolvedValue({
			data: {
				products: [{ _id: "2", name: "Filtered Product", price: 25, description: "Fits range", slug: "fp" }],
			},
		});

		render(
			<BrowserRouter>
				<HomePage />
			</BrowserRouter>,
		);

		// Find a specific price radio button (e.g., $20 to 39)
		// Note: Prices are imported from an external file, so we match the name
		const priceRadio = await screen.findByLabelText(/\$20 to 39/i);
		fireEvent.click(priceRadio);

		// Verify the jurisdiction: Did the component send the right "array" to the server?
		await waitFor(() => {
			expect(axios.post).toHaveBeenCalledWith(
				"/api/v1/product/product-filters",
				expect.objectContaining({
					radio: [20, 39], // This matches the 'array' property in your Prices constant
				}),
			);
		});

		// Verify UI update: Does the screen now show the product the server sent back?
		expect(await screen.findByText("Filtered Product")).toBeInTheDocument();
	});
});
