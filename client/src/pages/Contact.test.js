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
 *    - Use flexible queries (textContent, regex) to avoid brittle tests
 *    - Avoid strict text matches for content with icons
 *
 * These tests ensure the Contact page is robust, accessible, and resistant to UI changes.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import Contact from "./Contact";
import { MemoryRouter } from "react-router-dom";

// Mock Layout to avoid nesting issues
jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("Contact Page", () => {
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
		const emailLink = screen.getByRole("link", { name: /www.help@ecommerceapp.com/i });
		expect(emailLink).toBeInTheDocument();
		expect(emailLink).toHaveAttribute("href", "mailto:www.help@ecommerceapp.com");
	});

	test("renders the phone contact and includes the correct phone number", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByText((content, node) => node.textContent.includes("012-3456789"))).toBeInTheDocument();
	});

	test("renders the toll-free contact and includes the correct number", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByText((content, node) => node.textContent.includes("1800-0000-0000"))).toBeInTheDocument();
	});

	test("renders all three icons with accessibility attributes", () => {
		render(
			<MemoryRouter>
				<Contact />
			</MemoryRouter>,
		);
		expect(screen.getByLabelText("Email")).toBeInTheDocument();
		expect(screen.getByLabelText("Phone")).toBeInTheDocument();
		expect(screen.getByLabelText("Support")).toBeInTheDocument();
	});
});
