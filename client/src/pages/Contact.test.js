import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import axios from "axios";
import Contact from "./Contact";

jest.mock("axios");

jest.mock("../context/auth", () => ({
	useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/cart", () => ({
	useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/search", () => ({
	useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

Object.defineProperty(window, "localStorage", {
	value: {
		setItem: jest.fn(),
		getItem: jest.fn(),
		removeItem: jest.fn(),
	},
	writable: true,
});

describe("Contact Component", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		axios.get.mockResolvedValue({ data: { category: [] } });
	});
	it("renders page title correctly", async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			expect(getByText(/Contact us/i)).toBeInTheDocument();
		});
	});

	it("renders contact information correctly", async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			expect(getByText(/www.help@ecommerceapp.com/)).toBeInTheDocument();
		});
	});

	it("renders contact image correctly", async () => {
		const { getByAltText } = render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			expect(getByAltText("contactus")).toBeInTheDocument();
		});
	});

	it("renders phone contact correctly", async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			expect(getByText(/012-3456789/)).toBeInTheDocument();
		});
	});

	it("renders toll free contact correctly", async () => {
		const { getByText } = render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			expect(getByText(/1800-0000-0000 \(toll free\)/)).toBeInTheDocument();
		});
	});

	// Use regex + only check for the key part of the text, to improve resistance to refactoring.
	it("should inform the user about 24/7 availability", async () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		await waitFor(() => {
			const message = screen.getByText(/24X7/i); // 'i' makes it case-insensitive
			expect(message).toBeInTheDocument();
		});
	});
});
