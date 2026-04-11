import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import axios from "axios";

import ProductDetails from "./ProductDetails";
import CategoryProduct from "./CategoryProduct";

const { maliciousTextPayloads } = require("../../../helpers/xssPayloadMatrix.js");

jest.mock("axios");

jest.mock("../components/Layout", () => {
	return function MockLayout({ children }) {
		return <div>{children}</div>;
	};
});

jest.mock("../context/auth", () => ({
	useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../context/cart", () => ({
	useCart: jest.fn(() => [[], jest.fn()]),
}));

jest.mock("../context/search", () => ({
	useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

describe("Payload rendering safety", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	test("ProductDetails renders malicious name/description as text and no script node", async () => {
		axios.get.mockImplementation((url) => {
			if (url.includes("/get-product/")) {
				return Promise.resolve({
					data: {
						product: {
							_id: "p1",
							slug: "payload-product",
							name: maliciousTextPayloads.scriptTag,
							description: maliciousTextPayloads.imgOnError,
							price: 9,
							category: { _id: "c1", name: "Cat" },
						},
					},
				});
			}
			return Promise.resolve({ data: { products: [] } });
		});

		const { container } = render(
			<MemoryRouter initialEntries={["/product/payload-product"]}>
				<Routes>
					<Route path="/product/:slug" element={<ProductDetails />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(
			await screen.findByText((content) => content.includes(maliciousTextPayloads.scriptTag)),
		).toBeInTheDocument();
		expect(screen.getByText((content) => content.includes(maliciousTextPayloads.imgOnError))).toBeInTheDocument();
		expect(container.querySelector("script")).toBeNull();
		expect(container.querySelector("iframe")).toBeNull();
	});

	test("CategoryProduct renders payload in heading without creating executable nodes", async () => {
		axios.get.mockResolvedValue({
			data: {
				category: { _id: "c1", name: maliciousTextPayloads.svgOnLoad, slug: "payload-cat" },
				products: [],
			},
		});

		const { container } = render(
			<MemoryRouter initialEntries={["/category/payload-cat"]}>
				<Routes>
					<Route path="/category/:slug" element={<CategoryProduct />} />
				</Routes>
			</MemoryRouter>,
		);

		expect(await screen.findByText(`Category - ${maliciousTextPayloads.svgOnLoad}`)).toBeInTheDocument();
		expect(container.querySelector("script")).toBeNull();
		expect(container.querySelector("svg")).toBeNull();
	});
});
