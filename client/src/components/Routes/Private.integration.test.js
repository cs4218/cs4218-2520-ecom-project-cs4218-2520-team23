/*
 * Integration tests for Routes/Private.js (PrivateRoute)
 *
 * Written by Pan Xinping, A0228445B
 *
 * This file tests the integration of three real modules:
 *   1. PrivateRoute (Private.js)
 *   2. AuthContext / AuthProvider (context/auth.js)
 *   3. Spinner (components/Spinner.js)
 *
 * The integration point spans all three: PrivateRoute reads auth.token from the live
 * AuthContext, conditionally calls the /api/v1/auth/user-auth endpoint, and then
 * renders either the real <Spinner> component (access denied) or the <Outlet>
 * (access granted).  No individual component is in isolation — the test validates
 * the emergent routing behaviour produced by all three collaborating.
 *
 *
 * Test scenarios:
 *   - No token in context → API never called, Spinner renders, protected content absent.
 *   - Token present + API returns { ok: true } → Outlet renders (protected content visible).
 *   - Token present + API returns { ok: false } → Spinner renders.
 *   - Token present + API throws network error → Spinner renders (catch branch).
 *
 * Fake timers are used to prevent Spinner's setInterval countdown from firing during
 * assertions, which would produce act() warnings from asynchronous state updates.
 *
 * External boundaries mocked: axios (HTTP).
 */

import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import PrivateRoute from "./Private";
import { AuthProvider } from "../../context/auth";

jest.mock("axios");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function seedAuth(user, token) {
	localStorage.setItem("auth", JSON.stringify({ user, token }));
}

function renderPrivateRoute() {
	return render(
		<MemoryRouter initialEntries={["/dashboard/user"]}>
			<AuthProvider>
				<Routes>
					<Route path="/dashboard" element={<PrivateRoute />}>
						<Route path="user" element={<div>Protected User Content</div>} />
					</Route>
					<Route path="/" element={<div>Home Page</div>} />
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
// Level 3A — PrivateRoute + AuthContext + Spinner integration
// ---------------------------------------------------------------------------

describe("Level 3A — PrivateRoute + AuthContext + Spinner integration", () => {
	// When the AuthContext holds no token (localStorage is empty), PrivateRoute must take
	// the else-branch in its useEffect and never call the user-auth API.  The Spinner
	// component is rendered as the fallback — all three real modules interact to produce
	// this outcome.
	test("no token in context — API not called, Spinner renders, protected content absent", async () => {
		renderPrivateRoute();

		// Flush all pending React effects (AuthProvider reads localStorage; PrivateRoute
		// checks auth.token and takes the else-branch without calling the API).
		await act(async () => {});

		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Protected User Content")).not.toBeInTheDocument();
		expect(axios.get).not.toHaveBeenCalled();
	});

	// When the AuthContext carries a valid token and the API confirms the user,
	// PrivateRoute must set ok=true and render the <Outlet>, making the protected
	// content visible.  AuthContext, PrivateRoute, and the route tree all collaborate.
	test("valid token + API ok:true — protected content renders", async () => {
		seedAuth({ name: "Alice", role: 0 }, "valid-jwt");
		axios.get.mockResolvedValueOnce({ data: { ok: true } });

		renderPrivateRoute();

		// findByText polls until the Outlet replaces the Spinner.  The axios mock
		// resolves as a microtask so this transitions well within the default timeout.
		expect(await screen.findByText("Protected User Content")).toBeInTheDocument();
		expect(screen.queryByText(/redirecting to you in/i)).not.toBeInTheDocument();
		expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
	});

	// When the API returns { ok: false }, PrivateRoute must keep ok=false and continue
	// to render the Spinner — access is denied even though a token was present.
	test("valid token + API ok:false — Spinner renders, protected content absent", async () => {
		seedAuth({ name: "Bob", role: 0 }, "expired-jwt");
		axios.get.mockResolvedValueOnce({ data: { ok: false } });

		renderPrivateRoute();

		// Wait for the API call to resolve; ok stays false so Spinner remains.
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Protected User Content")).not.toBeInTheDocument();
	});

	// When the API call throws (network error), PrivateRoute's catch block sets ok=false.
	// The Spinner must render — all three modules are exercised through the error path.
	test("valid token + API network error — Spinner renders, protected content absent", async () => {
		seedAuth({ name: "Carol", role: 0 }, "any-jwt");
		axios.get.mockRejectedValueOnce(new Error("Network Error"));

		renderPrivateRoute();

		// Wait for the API call to reject; catch branch sets ok=false so Spinner remains.
		await waitFor(() => expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth"));
		expect(screen.getByText(/redirecting to you in/i)).toBeInTheDocument();
		expect(screen.queryByText("Protected User Content")).not.toBeInTheDocument();
	});
});
