/*
 * Integration tests for Routes/AdminRoute.js
 * Written by Pan Xinping, A0228445B
 *
 * This file tests the integration of three modules:
 *   1. AdminRoute (AdminRoute.js)
 *   2. AuthContext / AuthProvider (context/auth.js)
 *   3. Spinner (components/Spinner.js)
 *
 * The integration mirrors the PrivateRoute pattern but targets the admin-auth
 * endpoint (/api/v1/auth/admin-auth) and the admin section of the route tree.
 * AdminRoute reads auth.token from the live AuthContext, calls the admin-auth API,
 * and renders either the real <Spinner> (access denied / redirecting) or the <Outlet>
 * (admin access granted).
 *
 *
 * Test scenarios:
 *   - No token in context → API never called, Spinner renders, admin content absent.
 *   - Token present + API returns { ok: true } → Outlet renders (admin content visible).
 *   - Token present + API returns { ok: false } → Spinner renders.
 *   - Token present + API throws network error → Spinner renders (catch branch).
 *
 * Fake timers are used to prevent Spinner's setInterval countdown from firing during
 * assertions, avoiding act() warnings from asynchronous state updates.
 *
 * External boundaries mocked: axios (HTTP).
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import AdminRoute from "./AdminRoute";
import { AuthProvider } from "../../context/auth";

jest.mock("axios");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedAuth(user, token) {
	localStorage.setItem("auth", JSON.stringify({ user, token }));
}

function renderAdminRoute() {
	return render(
		<MemoryRouter initialEntries={["/dashboard/admin"]}>
			<AuthProvider>
				<Routes>
					<Route path="/dashboard" element={<AdminRoute />}>
						<Route path="admin" element={<div>Admin Dashboard Content</div>} />
					</Route>
					<Route path="/login" element={<div>Login Page</div>} />
				</Routes>
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
// Level 3B — AdminRoute + AuthContext + Spinner integration
// ---------------------------------------------------------------------------

describe("Level 3B — AdminRoute + AuthContext + Spinner integration", () => {
	// When the AuthContext holds no token, AdminRoute must never call the admin-auth API.
	// The real Spinner renders as the fallback — all three modules collaborate to deny
	// access without making an unnecessary network request.
	test("no token in context — API not called, Spinner renders, admin content absent", async () => {
		renderAdminRoute();

		// Flush all pending React effects (AuthProvider reads localStorage; AdminRoute
		// checks auth.token and takes the else-branch without calling the API).
		await act(async () => {});

		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
		expect(axios.get).not.toHaveBeenCalled();
	});

	// When the AuthContext carries a valid token and the admin-auth API confirms the user
	// is an admin, AdminRoute sets ok=true and renders the <Outlet>.  The admin content
	// becomes visible — AuthContext, AdminRoute, and the route tree all collaborate.
	test("valid token + API ok:true — admin content renders", async () => {
		seedAuth({ name: "Admin User", role: 1 }, "admin-jwt");
		axios.get.mockResolvedValueOnce({ data: { ok: true } });

		renderAdminRoute();

		// findByText polls until the Outlet replaces the Spinner.  The axios mock
		// resolves as a microtask so this transitions well within the default timeout.
		expect(await screen.findByText("Admin Dashboard Content")).toBeInTheDocument();
		expect(screen.queryByText(/redirecting to you in/i)).not.toBeInTheDocument();
		expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
	});

	// When the admin-auth API returns { ok: false }, AdminRoute keeps ok=false and
	// continues to show the Spinner — the user has a token but is not an admin.
	test("valid token + API ok:false — Spinner renders, admin content absent", async () => {
		seedAuth({ name: "Regular User", role: 0 }, "user-jwt");
		axios.get.mockResolvedValueOnce({ data: { ok: false } });

		renderAdminRoute();

		// Wait for the API call to resolve; ok stays false so Spinner remains.
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
	});

	// When the admin-auth API call fails (network error), AdminRoute's catch block
	// keeps ok=false.  The Spinner renders — all three modules are exercised through
	// the error path and access is denied gracefully.
	test("valid token + API network error — Spinner renders, admin content absent", async () => {
		seedAuth({ name: "Dave", role: 1 }, "any-jwt");
		axios.get.mockRejectedValueOnce(new Error("Network Error"));

		renderAdminRoute();

		// Wait for the API call to reject; catch branch sets ok=false so Spinner remains.
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth"));
		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Admin Dashboard Content")).not.toBeInTheDocument();
	});
});
