// Written by Pan Xinping, A0228445B

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

describe("Search security coverage", () => {
	test("renders malicious search results as inert text", () => {
		const values = {
			results: [
				{
					_id: "p1",
					name: "<script>alert('search-xss')</script>",
					description: '<img src=x onerror="alert(1)">payload',
					price: 123,
				},
			],
		};
		mockUseSearch.mockReturnValue([values, jest.fn()]);

		const { container } = render(<Search />);

		expect(screen.getByTestId("layout-title")).toHaveTextContent("Search results");
		expect(
			screen.getByText((content) => content.includes("<script>alert('search-xss')</script>")),
		).toBeInTheDocument();
		expect(container.textContent).toContain('<img src=x onerror="alert(1)">');
		expect(container.querySelector("script")).toBeNull();
		expect(container.querySelector("iframe")).toBeNull();
	});
});
