// Xinping, A0228445B

import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Policy from "./Policy";

// Mock the Layout component to isolate the Policy component
// Verify that it receives the correct 'title' prop.
jest.mock("./../components/Layout", () => {
	return ({ children, title }) => (
		<div data-testid="mock-layout" data-title={title}>
			{children}
		</div>
	);
});

describe("Policy Page Component", () => {
	test("renders without crashing (Smoke Test)", () => {
		render(<Policy />);
		const heading = screen.getByRole("heading", { level: 1 });
		expect(heading).toBeInTheDocument();
	});

	test("passes the correct SEO title to the Layout component", () => {
		render(<Policy />);
		const layout = screen.getByTestId("mock-layout");
		// Verify the 'title' prop was passed correctly
		expect(layout).toHaveAttribute("data-title", "Privacy Policy");
	});

	test("displays the correct site name (Virtual Vault) in the main heading", () => {
		render(<Policy />);
		const mainHeading = screen.getByRole("heading", { name: /Privacy Notice for Virtual Vault/i });
		expect(mainHeading).toBeInTheDocument();
	});

	test("displays 'Last Updated' information", () => {
		render(<Policy />);
		expect(screen.getByText(/Last Updated:/i)).toBeInTheDocument();
	});

	test("mentions critical legal compliance text (PCI DSS)", () => {
		render(<Policy />);
		const complianceText = screen.getByText(/PCI DSS/i);
		expect(complianceText).toBeInTheDocument();
	});

	test("renders the contact image with correct accessibility attributes", () => {
		render(<Policy />);
		const image = screen.getByAltText("contactus");
		expect(image).toBeInTheDocument();
		expect(image).toHaveAttribute("src", "/images/contactus.jpeg");
	});

	test("renders all four main section headers", () => {
		render(<Policy />);
		const sectionHeaders = [
			"1. Information We Collect",
			"2. How We Use Your Information",
			"3. Does Virtual Vault Share My Information?",
			"4. How Secure Is My Information?",
		];

		sectionHeaders.forEach((headerText) => {
			expect(screen.getByRole("heading", { name: headerText })).toBeInTheDocument();
		});
	});
});
