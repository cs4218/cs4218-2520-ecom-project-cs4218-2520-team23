/*
 * Integration tests for Register.js
 *
 * This file tests the integration between Register.js, React Router, and Login.js.
 *
 * The integration point is navigational: Register has no knowledge of Login and
 * Login has no knowledge of Register — the only link between them is the router.
 * When registration succeeds, Register calls navigate('/login'), which causes the
 * real MemoryRouter to mount the real Login component.  The test verifies that this
 * cross-component navigation actually happens and that the Login page is visible.
 *
 * This is NOT:
 *   - A unit test of Register: the real Login page must mount for the test to pass —
 *     mocking navigate() would hide whether the correct page actually renders.
 *   - A unit test of Login: Login is only a passive receiver of the navigation event.
 *
 * How the real router is exercised:
 *   Both <Register> and <Login> routes are declared inside the same <MemoryRouter>.
 *   When Register calls navigate('/login'), the MemoryRouter transitions to the
 *   /login route and React mounts the real Login component — no useNavigate mock.
 *
 * Additional context providers (AuthProvider, CartProvider, SearchProvider) are
 * included because both Register and Login render <Layout>, which renders <Header>,
 * which consumes those contexts.
 *
 * Test scenarios:
 *   - Successful registration: real router navigates to /login → Login page mounts.
 *   - API failure (success: false): no navigation, Register page stays visible.
 *   - Network error: no navigation, Register page stays visible.
 *   - Missing required field: client-side guard fires, API never called, no navigation.
 *
 * External boundaries mocked: axios (HTTP), react-hot-toast (side-effect only).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import Register from "./Register";
import Login from "./Login";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
	__esModule: true,
	default: { success: jest.fn(), error: jest.fn() },
	Toaster: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRegisterWithLoginRoute() {
	// Mock all GET requests: Header's useCategory hook fires on every page mount.
	axios.get.mockResolvedValue({ data: { category: [] } });

	return render(
		<MemoryRouter initialEntries={["/register"]}>
			<AuthProvider>
				<SearchProvider>
					<CartProvider>
						<Routes>
							<Route path="/register" element={<Register />} />
							<Route path="/login" element={<Login />} />
						</Routes>
					</CartProvider>
				</SearchProvider>
			</AuthProvider>
		</MemoryRouter>,
	);
}

async function fillAllRegisterFields() {
	fireEvent.change(screen.getByPlaceholderText(/Enter Your Name/i), {
		target: { value: "Alice" },
	});
	fireEvent.change(screen.getByPlaceholderText(/Enter Your Email/i), {
		target: { value: "alice@example.com" },
	});
	fireEvent.change(screen.getByPlaceholderText(/Enter Your Password/i), {
		target: { value: "Password123" },
	});
	fireEvent.change(screen.getByPlaceholderText(/Enter Your Phone/i), {
		target: { value: "91234567" },
	});
	fireEvent.change(screen.getByPlaceholderText(/Enter Your Address/i), {
		target: { value: "123 Main Street" },
	});
	fireEvent.change(screen.getByTestId("dob-input"), {
		target: { value: "2000-01-01" },
	});
	fireEvent.change(screen.getByPlaceholderText(/What is Your Favorite sports/i), { target: { value: "Football" } });
}

// ---------------------------------------------------------------------------
// Before/after hooks
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
});

// ---------------------------------------------------------------------------
// Level 5 — Register + React Router + Login integration
// ---------------------------------------------------------------------------

describe("Level 5 — Register + React Router + Login integration", () => {
	test("successful registration navigates to Login page via real router", async () => {
		axios.post.mockResolvedValueOnce({
			data: { success: true, message: "Register Successfully" },
		});

		renderRegisterWithLoginRoute();

		// Confirm we start on the Register page.
		expect(screen.getByRole("heading", { name: /REGISTER FORM/i })).toBeInTheDocument();

		await fillAllRegisterFields();
		fireEvent.click(screen.getByRole("button", { name: /^REGISTER$/i }));

		// After the real router navigation, the Login page must render.
		await waitFor(() => expect(screen.getByRole("heading", { name: /LOGIN FORM/i })).toBeInTheDocument());
		// Register form must no longer be visible.
		expect(screen.queryByRole("heading", { name: /REGISTER FORM/i })).not.toBeInTheDocument();
	});

	// When the API returns { success: false }, Register must not navigate.
	// The Register page must remain visible — no Login form should appear.
	test("API failure (success: false) —> no navigation, Register page stays visible", async () => {
		axios.post.mockResolvedValueOnce({
			data: { success: false, message: "Email already registered" },
		});

		renderRegisterWithLoginRoute();

		await fillAllRegisterFields();
		fireEvent.click(screen.getByRole("button", { name: /^REGISTER$/i }));

		await waitFor(() => expect(axios.post).toHaveBeenCalled());

		// Must still be on the Register page.
		expect(screen.getByRole("heading", { name: /REGISTER FORM/i })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: /LOGIN FORM/i })).not.toBeInTheDocument();
	});

	test("network error —> no navigation, Register page stays visible", async () => {
		axios.post.mockRejectedValueOnce(new Error("Network Error"));

		renderRegisterWithLoginRoute();

		await fillAllRegisterFields();
		fireEvent.click(screen.getByRole("button", { name: /^REGISTER$/i }));

		await waitFor(() => expect(axios.post).toHaveBeenCalled());

		expect(screen.getByRole("heading", { name: /REGISTER FORM/i })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: /LOGIN FORM/i })).not.toBeInTheDocument();
	});

	// When a required field is left blank, Register's client-side guard returns early
	// without calling the API.  The router must not be involved at all — no API call
	// is made and the Login page is never mounted.
	test("missing required field —> API not called, no navigation to Login", async () => {
		renderRegisterWithLoginRoute();

		// Fill all fields except name (left blank).
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Email/i), {
			target: { value: "bob@example.com" },
		});
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Password/i), {
			target: { value: "Password123" },
		});
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Phone/i), {
			target: { value: "81234567" },
		});
		fireEvent.change(screen.getByPlaceholderText(/Enter Your Address/i), {
			target: { value: "456 Side Street" },
		});
		fireEvent.change(screen.getByTestId("dob-input"), {
			target: { value: "1995-06-15" },
		});
		fireEvent.change(screen.getByPlaceholderText(/What is Your Favorite sports/i), { target: { value: "Tennis" } });

		fireEvent.click(screen.getByRole("button", { name: /^REGISTER$/i }));

		// Client-side guard fires — no API call should have been made.
		expect(axios.post).not.toHaveBeenCalled();
		// Register form stays; Login form never mounts.
		expect(screen.getByRole("heading", { name: /REGISTER FORM/i })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: /LOGIN FORM/i })).not.toBeInTheDocument();
	});
});
