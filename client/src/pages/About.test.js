// Xinping, A0228445B
import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import About from "./About";

// Mocking the Layout component to isolate the About component
// This allows us to verify the props passed to Layout without rendering its internals
jest.mock("./../components/Layout", () => {
	return function MockLayout({ children, title }) {
		return (
			<div data-testid="mock-layout" data-title={title}>
				{children}
			</div>
		);
	};
});

describe("About Page Component", () => {
	test("passes the correct SEO title prop to the Layout component", () => {
		render(<About />);
		const layoutElement = screen.getByTestId("mock-layout");

		// Check if the 'title' passed to Layout matches our requirement
		expect(layoutElement).toHaveAttribute("data-title", "About us - Ecommerce app");
	});

	test("renders the main descriptive text about products", () => {
		render(<About />);
		const descriptionText = screen.getByText(/electronics, fashion, and books/i);

		expect(descriptionText).toBeInTheDocument();
		expect(descriptionText).toHaveClass("text-justify");
	});

	test("renders the about image with correct source and alt text", () => {
		render(<About />);
		const image = screen.getByRole("img");

		// Verify both the path and the accessibility alt tag
		expect(image).toHaveAttribute("src", "/images/about.jpeg");
		expect(image).toHaveAttribute("alt", "aboutus");
	});

	test("has the correct Bootstrap grid classes for layout", () => {
		render(<About />);

		// Testing specific UI structure for responsive design
		const imageContainer = screen.getByRole("img").closest(".col-md-6");
		const textContainer = screen.getByText(/electronics/i).closest(".col-md-4");

		expect(imageContainer).toBeInTheDocument();
		expect(textContainer).toBeInTheDocument();
	});
});
