/*
 *Written by Pan Xinping, A0228445B
 *
 * This file tests the integration between Header.js and AuthContext (context/auth.js).
 *
 * The integration point under test is the live data contract between the two modules:
 *   - Header reads auth state via the real useAuth() hook from the real AuthProvider.
 *   - AuthProvider hydrates its state from localStorage on mount (via useEffect).
 *   - When Header's handleLogout fires, it calls the real setAuth() from the context,
 *     which clears the user/token from React state and removes the "auth" key from
 *     localStorage.
 *
 *
 * External boundaries mocked: axios (HTTP), react-hot-toast (side-effect only).
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import Header from "./Header";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
	__esModule: true,
	default: { success: jest.fn(), error: jest.fn() },
	Toaster: () => null,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedAuth(user, token = "jwt-token") {
	localStorage.setItem("auth", JSON.stringify({ user, token }));
}

function renderHeader() {
	// Mock the categories GET that useCategory fires on mount inside Header.
	axios.get.mockResolvedValue({ data: { category: [] } });

	return render(
		<MemoryRouter>
			<AuthProvider>
				<SearchProvider>
					<CartProvider>
						<Header />
					</CartProvider>
				</SearchProvider>
			</AuthProvider>
		</MemoryRouter>,
	);
}

// ---------------------------------------------------------------------------
// Before/after hooks
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
});

// ---------------------------------------------------------------------------
// Level 2 — Header + AuthContext integration
// ---------------------------------------------------------------------------

describe("Level 2 — Header + AuthContext integration", () => {
	// This describe block owns all standalone Header↔AuthContext behaviour: initial guest
	// state, localStorage hydration, role-based dashboard links, and the logout direction.
	// The forward Login→AuthContext→Header propagation chain is covered by
	// Login.integration.test.js (Layer 2) to avoid duplication.

	// When localStorage has no "auth" entry, AuthProvider starts with auth.user = null.
	// Header must render the guest navigation (Register + Login links) and must NOT
	// render any username.  This validates that Header correctly reads the initial
	// guest state from the live AuthContext.
	test("no auth in localStorage — header renders guest nav links", async () => {
		renderHeader();

		// findByRole accounts for the async useEffect hydration in AuthProvider.
		expect(await screen.findByRole("link", { name: /^Register$/i })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /^Login$/i })).toBeInTheDocument();
	});

	// When localStorage contains a valid auth object, AuthProvider's useEffect hydrates
	// auth.user.  Header must react to the context update and switch from guest links to
	// the logged-in view (username visible, guest links absent).
	test("auth seeded in localStorage — header shows username and hides guest links", async () => {
		seedAuth({ name: "Eve", role: 0 });
		renderHeader();

		// Wait for AuthProvider to hydrate from localStorage and Header to re-render.
		expect(await screen.findByText("Eve")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Register$/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Login$/i })).not.toBeInTheDocument();
	});

	// For a regular user (role 0), the Dashboard link produced by Header must point to
	// /dashboard/user.  This verifies that Header reads role correctly from AuthContext.
	test("regular user (role 0) — Dashboard link points to /dashboard/user", async () => {
		seedAuth({ name: "Frank", role: 0 });
		renderHeader();

		await screen.findByText("Frank");
		expect(screen.getByRole("link", { name: /Dashboard/i }).getAttribute("href")).toBe("/dashboard/user");
	});

	// For an admin user (role 1), the Dashboard link must point to /dashboard/admin.
	// This verifies the role-based routing logic in Header reads from the live context.
	test("admin user (role 1) — Dashboard link points to /dashboard/admin", async () => {
		seedAuth({ name: "Grace", role: 1 });
		renderHeader();

		await screen.findByText("Grace");
		expect(screen.getByRole("link", { name: /Dashboard/i }).getAttribute("href")).toBe("/dashboard/admin");
	});

	// Clicking the Logout link fires Header's handleLogout, which calls setAuth() on the
	// live AuthContext to clear user/token and calls localStorage.removeItem("auth").
	// Header must re-render back to the guest state.
	// This tests the write direction of the Header<->AuthContext integration:
	// a user action in Header propagates a state change back through the context.
	test("clicking Logout clears AuthContext and reverts header to guest state", async () => {
		seedAuth({ name: "Hank", role: 0 });
		renderHeader();

		// Wait for the logged-in state to appear.
		await screen.findByText("Hank");

		fireEvent.click(screen.getByRole("link", { name: /Logout/i }));

		// AuthContext is cleared — Header must switch back to guest links.
		await waitFor(() => expect(screen.getByRole("link", { name: /^Login$/i })).toBeInTheDocument());
		expect(screen.queryByText("Hank")).not.toBeInTheDocument();
		expect(localStorage.getItem("auth")).toBeNull();
	});
});
