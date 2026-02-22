/**
 * Test written by Pan Xinping, A0228445B
 * I am using component-level UI and behavior tests for Layout because it is a composition wrapper
 * responsible for consistent page shell rendering (Header/Footer), child placement, and SEO metadata setup.
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning
 * - Props: Defaults used vs custom values provided
 * - Children: Present vs absent
 * - Structure: Core shell elements present vs missing
 * - Content boundary: empty Layout (no children) vs populated Layout
 *
 * 2. Boundary Value Analysis
 * - Metadata boundaries: empty string vs typical string values for title/description/keywords/author
 *
 * Testing Approaches Applied:
 * 1. Dependency Mocking (Isolation)
 * - Mocked Header, Footer, and Toaster and verified that they were called.
 * - Use a mocked react-helmet to verify that metadata is passed to the head without actually triggering browser-level mutations.
 **/

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
		expect(helmet.querySelector('meta[name="keywords"]')).toHaveAttribute("content", "mern,react,node,mongodb");
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

	test("overrides default keywords and author with custom values", () => {
		render(
			<Layout keywords="shop,cart,react" author="Pan Xinping">
				Content
			</Layout>,
		);

		const helmet = screen.getByTestId("mock-helmet");

		expect(helmet.querySelector('meta[name="keywords"]')).toHaveAttribute("content", "shop,cart,react");
		expect(helmet.querySelector('meta[name="author"]')).toHaveAttribute("content", "Pan Xinping");
	});

	test("falls back to default SEO values when title and metadata props are explicitly empty", () => {
		render(
			<Layout title="" description="" keywords="" author="">
				Content
			</Layout>,
		);

		const helmet = screen.getByTestId("mock-helmet");

		expect(helmet.querySelector("title")).toHaveTextContent("Ecommerce app - shop now");
		expect(helmet.querySelector('meta[name="description"]')).toHaveAttribute("content", "mern stack project");
		expect(helmet.querySelector('meta[name="keywords"]')).toHaveAttribute("content", "mern,react,node,mongodb");
		expect(helmet.querySelector('meta[name="author"]')).toHaveAttribute("content", "Techinfoyt");
	});

	test("falls back to default SEO values when non-string metadata props are passed", () => {
		render(
			<Layout title={null} description={123} keywords={[]} author={{}}>
				Content
			</Layout>,
		);

		const helmet = screen.getByTestId("mock-helmet");

		expect(helmet.querySelector("title")).toHaveTextContent("Ecommerce app - shop now");
		expect(helmet.querySelector('meta[name="description"]')).toHaveAttribute("content", "mern stack project");
		expect(helmet.querySelector('meta[name="keywords"]')).toHaveAttribute("content", "mern,react,node,mongodb");
		expect(helmet.querySelector('meta[name="author"]')).toHaveAttribute("content", "Techinfoyt");
	});

	test("renders UTF-8 charset meta tag", () => {
		render(<Layout>Content</Layout>);
		const helmet = screen.getByTestId("mock-helmet");

		expect(helmet.querySelector('meta[charset="utf-8"]')).toBeInTheDocument();
	});

	test("renders safely without children", () => {
		render(<Layout />);

		expect(screen.getByRole("main")).toBeInTheDocument();
		expect(screen.getByTestId("mock-header")).toBeInTheDocument();
		expect(screen.getByTestId("mock-footer")).toBeInTheDocument();
	});

	test("main section has minimum height styling", () => {
		render(<Layout>Content</Layout>);
		const mainTag = screen.getByRole("main");
		expect(mainTag).toHaveStyle({ minHeight: "70vh" });
	});

	test("renders Header before main and Footer after main", () => {
		render(<Layout>Content</Layout>);

		const header = screen.getByTestId("mock-header");
		const main = screen.getByRole("main");
		const footer = screen.getByTestId("mock-footer");

		expect(header.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(main.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
	});
});
