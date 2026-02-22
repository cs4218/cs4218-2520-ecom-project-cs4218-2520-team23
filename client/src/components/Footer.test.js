// Xinping, A0228445B

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Footer from "../components/Footer";

describe("Footer Component", () => {
	// Helper function to render Footer with Router context
	// This avoids repeating the wrapper code in every single test
	const renderFooter = () => {
		return render(
			<MemoryRouter>
				<Footer />
			</MemoryRouter>,
		);
	};

	// Hardcoding this as it is unlikely to change frequently, making it
	// still resistant to refactoring.
	test("renders the copyright notice with the correct brand name", () => {
		renderFooter();
		const copyrightText = screen.getByText(/All Rights Reserved © TestingComp/i);

		expect(copyrightText).toBeInTheDocument();
	});

	test("contains a working link to the About page", () => {
		renderFooter();
		const aboutLink = screen.getByRole("link", { name: /about/i });

		expect(aboutLink).toBeInTheDocument();
		// This verifies the 'to' prop was correctly converted to an 'href'
		expect(aboutLink).toHaveAttribute("href", "/about");
	});

	test("contains a working link to the Contact page", () => {
		renderFooter();
		const contactLink = screen.getByRole("link", { name: /contact/i });

		expect(contactLink).toBeInTheDocument();
		expect(contactLink).toHaveAttribute("href", "/contact");
	});

	test("contains a working link to the Privacy Policy page", () => {
		renderFooter();
		const policyLink = screen.getByRole("link", { name: /privacy policy/i });

		expect(policyLink).toBeInTheDocument();
		expect(policyLink).toHaveAttribute("href", "/policy");
	});
});
