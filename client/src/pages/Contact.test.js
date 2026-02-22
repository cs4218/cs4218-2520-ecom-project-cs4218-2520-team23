/**
 * Test written by Pan Xinping, A0228445B
 * Testing Principles Applied:
 *
 * 1. Key information testing: Verifying presence of critical contact details (email, phone, toll-free)
 *
 * 2. Bug Detection Tests
 *    - Email link: Should be clickable and have correct mailto
 *    - Icon rendering: Should be accessible via aria-label
 *
 * 3. State & Behaviour Testing
 *    - Static rendering: All elements render as expected
 *    - Accessibility: Screen reader support for icons
 *
 * 4. Refactoring Resistance
 *    - Use data-testid attributes to avoid brittle tests
 *    - Avoid testing implementation details (e.g., specific class names)
 *    - Focus only on key phrases rather than full sentences to allow for copy changes
 *
 * These tests ensure the Contact page is robust, accessible, and resistant to UI changes.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "./Contact";
import { MemoryRouter } from "react-router-dom";

// Mock Layout to avoid nesting issues
jest.mock("../components/Layout", () => ({ children, title }) => (
	<div data-testid="mock-layout" data-title={title}>
		{children}
	</div>
));

// Mock react-icons to avoid rendering issues
jest.mock("react-icons/bi", () => ({
	BiMailSend: ({ "aria-label": ariaLabel, title }) => (
		<span data-testid="mail-icon" aria-label={ariaLabel} title={title} />
	),
	BiPhoneCall: ({ "aria-label": ariaLabel, title }) => (
		<span data-testid="phone-icon" aria-label={ariaLabel} title={title} />
	),
	BiSupport: ({ "aria-label": ariaLabel, title }) => (
		<span data-testid="support-icon" aria-label={ariaLabel} title={title} />
	),
}));

describe("Contact Page", () => {
	test("passes the correct SEO title to the Layout component", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		const layout = screen.getByTestId("mock-layout");
		// Verify the 'title' prop was passed correctly
		expect(layout).toHaveAttribute("data-title", "Contact us");
	});

	test("renders the main heading", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByText("CONTACT US")).toBeInTheDocument();
	});

	test("renders the contact image with correct alt text", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByAltText("contactus")).toBeInTheDocument();
	});

	test("renders the info paragraph about 24/7 availability", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByText(/24\/7/i)).toBeInTheDocument();
	});

	test("renders the email contact and includes the correct mailto link", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByTestId("email-contact")).toHaveTextContent("www.help@ecommerceapp.com");
		const emailLink = screen.getByTestId("email-link");
		expect(emailLink).toHaveAttribute("href", "mailto:www.help@ecommerceapp.com");
	});

	test("renders the phone contact and includes the correct phone number", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByTestId("phone-contact")).toHaveTextContent("012-3456789");
	});

	test("renders the toll-free contact and includes the correct number", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByTestId("support-contact")).toHaveTextContent("1800-0000-0000");
	});

	test("renders all three icons with accessibility attributes", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByTestId("mail-icon")).toBeInTheDocument();
		expect(screen.getByTestId("phone-icon")).toBeInTheDocument();
		expect(screen.getByTestId("support-icon")).toBeInTheDocument();
	});
});
