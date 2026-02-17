// Pan Xinping, A0228445B

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Layout from "../components/Layout";

// Mocking children components to isolate Layout
jest.mock("./Header", () => () => <div data-testid="mock-header" />);
jest.mock("./Footer", () => () => <div data-testid="mock-footer" />);
jest.mock("react-hot-toast", () => ({
	Toaster: () => <div data-testid="mock-toaster" />,
}));

// 2. Mocking react-helmet to inspect what it receives
jest.mock("react-helmet", () => ({
	Helmet: ({ children }) => <div data-testid="mock-helmet">{children}</div>,
}));

describe("Layout Component", () => {
	test("renders Header, Footer, and Toaster", () => {
		render(<Layout>Test Content</Layout>);

		expect(screen.getByTestId("mock-header")).toBeInTheDocument();
		expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
		expect(screen.getByTestId("mock-toaster")).toBeInTheDocument();
	});

	// Testing children injection
	test("renders children correctly within the main tag", () => {
		render(
			<Layout>
				<div data-testid="child-element">Hello World</div>
			</Layout>,
		);

		const mainContent = screen.getByTestId("child-element");
		expect(mainContent).toBeInTheDocument();
		expect(mainContent.textContent).toBe("Hello World");
		expect(mainContent.parentElement.tagName).toBe("MAIN");
	});

	test("applies default SEO props when no props are provided", () => {
		render(<Layout>Content</Layout>);

		// We check the 'content' of the meta tags inside our mocked Helmet
		const helmet = screen.getByTestId("mock-helmet");

		expect(screen.getByText("Ecommerce app - shop now")).toBeInTheDocument();
		// Use querySelector to find the specific meta name
		expect(helmet.querySelector('meta[name="description"]')).toHaveAttribute("content", "mern stack project");
		expect(helmet.querySelector('meta[name="author"]')).toHaveAttribute("content", "Techinfoyt");
	});

	test("overrides default props with custom values", () => {
		render(
			<Layout title="Custom Title" description="Custom Description">
				Content
			</Layout>,
		);

		const helmet = screen.getByTestId("mock-helmet");

		expect(helmet).toContainHTML("<title>Custom Title</title>");
		expect(helmet).toContainHTML('content="Custom Description"');
		expect(helmet.querySelector('meta[name="description"]')).toHaveAttribute("content", "Custom Description");
	});

	// Test structures
	test("renders Header, Footer, and Toaster", () => {
		render(<Layout>Content</Layout>);

		expect(screen.getByTestId("mock-header")).toBeInTheDocument();
		expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
		expect(screen.getByTestId("mock-toaster")).toBeInTheDocument();
	});

	test("main section has minimum height styling", () => {
		render(<Layout>Content</Layout>);
		const mainTag = screen.getByRole("main");
		expect(mainTag).toHaveStyle({ minHeight: "70vh" });
	});
});
