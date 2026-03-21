/*
 * Written by Pan Xinping, A0228445B
 *
 * This file covers two integration levels:
 *
 * Level 1 — Login <-> AuthContext (state management + localStorage persistence):
 *   Login.js and the real AuthProvider from context/auth.js both run as live code.
 *   The integration point is the contract between them: when the login form is submitted
 *   and the API responds successfully, Login calls setAuth() from the live context, which
 *   propagates the new user/token into React state and persists it to localStorage.
 *   On failure paths the context and localStorage must remain untouched.
 *   This validates: cross-component state management, localStorage sync, API response
 *   handling, and the navigation trigger produced by the login flow.
 *
 * Level 4 — Login <-> AuthContext <-> Header (login-direction propagation only):
 *   Login.js internally renders <Layout>, which renders the real <Header>.  Both Login
 *   and Header consume the same live AuthContext.  The integration point is the forward
 *   propagation chain: a user action in the Login form → setAuth() updates the shared
 *   context → Header re-renders to show the logged-in username and hide guest nav links.
 *   Standalone Header↔AuthContext behaviour (initial guest state, role-based links, and
 *   the logout direction) is owned by Header.integration.test.js to avoid duplication.
 *
 * External boundaries mocked: axios (HTTP), react-hot-toast (side-effect only).
 * useNavigate is replaced with a jest.fn() so that a successful login does NOT
 * navigate away from the tree, allowing assertions on the updated Header state.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

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

// Intercept useNavigate so that a successful login does not actually navigate away.
// This keeps the Login + Header tree mounted so we can assert on Header state changes.
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderLogin() {
	// Mock the categories GET that Header's useCategory hook fires on mount.
	axios.get.mockResolvedValue({ data: { category: [] } });

	return render(
		<MemoryRouter initialEntries={["/login"]}>
			<AuthProvider>
				<SearchProvider>
					<CartProvider>
						<Login />
					</CartProvider>
				</SearchProvider>
			</AuthProvider>
		</MemoryRouter>,
	);
}

async function fillAndSubmitLoginForm(email = "test@example.com", password = "password123") {
	fireEvent.change(screen.getByPlaceholderText(/(enter\s+your\s+)?email/i), {
		target: { value: email },
	});
	fireEvent.change(screen.getByPlaceholderText(/(enter\s+your\s+)?password/i), {
		target: { value: password },
	});
	fireEvent.click(screen.getByRole("button", { name: /^Log in$/i }));
}

// ---------------------------------------------------------------------------
// Before/after hooks
// ---------------------------------------------------------------------------

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
	mockNavigate.mockReset();
});

// ---------------------------------------------------------------------------
// Level 1 — Login + AuthContext
// ---------------------------------------------------------------------------

describe("Level 1 — Login + AuthContext integration", () => {
	test("successful login writes auth data to localStorage via AuthContext", async () => {
		axios.post.mockResolvedValueOnce({
			data: {
				success: true,
				user: { name: "Alice", role: 0 },
				token: "jwt-token-abc",
			},
		});

		renderLogin();
		await fillAndSubmitLoginForm();

		await waitFor(() => {
			const stored = JSON.parse(localStorage.getItem("auth"));
			expect(stored.user.name).toBe("Alice");
			expect(stored.token).toBe("jwt-token-abc");
		});
	});

	// When the API signals failure (success: false), Login must not call setAuth and must
	// not touch localStorage — the shared context state is preserved.
	test("failed login (API success: false) leaves localStorage unchanged", async () => {
		axios.post.mockResolvedValueOnce({
			data: { success: false, message: "Invalid credentials" },
		});

		renderLogin();
		await fillAndSubmitLoginForm();

		await waitFor(() => expect(axios.post).toHaveBeenCalled());
		expect(localStorage.getItem("auth")).toBeNull();
	});

	// A network error must also leave the AuthContext and localStorage untouched.
	test("network error leaves localStorage unchanged", async () => {
		axios.post.mockRejectedValueOnce(new Error("Network Error"));

		renderLogin();
		await fillAndSubmitLoginForm();

		await waitFor(() => expect(axios.post).toHaveBeenCalled());
		expect(localStorage.getItem("auth")).toBeNull();
	});

	// After a successful login, Login must navigate the user (via the real navigate call)
	// to the return URL, or "/" if none is set.
	test("successful login triggers navigation to the return URL", async () => {
		axios.post.mockResolvedValueOnce({
			data: {
				success: true,
				user: { name: "Bob", role: 0 },
				token: "jwt-token-xyz",
			},
		});

		renderLogin();
		await fillAndSubmitLoginForm();

		await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
		expect(mockNavigate).toHaveBeenCalledWith("/");
	});

	// Failed login must produce no navigation — the user stays on the login page.
	test("failed login does not trigger navigation", async () => {
		axios.post.mockResolvedValueOnce({
			data: { success: false, message: "Wrong password" },
		});

		renderLogin();
		await fillAndSubmitLoginForm();

		await waitFor(() => expect(axios.post).toHaveBeenCalled());
		expect(mockNavigate).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Level 4 — Login + AuthContext + Header
// ---------------------------------------------------------------------------

describe("Level 4 — Login + AuthContext + Header integration", () => {
	// After a successful login, Login calls setAuth() on the shared AuthContext.
	// Header reads from the same context and must re-render to show the username
	// and hide the guest Login/Register links.  This is the unique forward-propagation
	// scenario owned by this file; standalone Header states (initial guest links, role
	// links, logout) are tested in Header.integration.test.js.
	test("successful login propagates through AuthContext to update Header", async () => {
		axios.post.mockResolvedValueOnce({
			data: {
				success: true,
				user: { name: "Carol", role: 0 },
				token: "jwt-carol",
			},
		});

		renderLogin();

		// Confirm guest state is visible before login.
		expect(screen.getByRole("link", { name: /^Login$/i })).toBeInTheDocument();
		expect(screen.queryByText("Carol")).not.toBeInTheDocument();

		await fillAndSubmitLoginForm();

		// After login the Header must show the username from the shared context.
		await waitFor(() => expect(screen.getByText("Carol")).toBeInTheDocument());
		// Guest links must no longer be rendered.
		expect(screen.queryByRole("link", { name: /^Login$/i })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /^Register$/i })).not.toBeInTheDocument();
	});
});
