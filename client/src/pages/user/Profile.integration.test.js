// Dong Cheng-Yu, A0262348B
//
// Bottom-up integration tests for Profile.
// AuthProvider (unit-tested in MS1) is the base layer and is used real.
// Profile and UserMenu are integrated on top, with no context mocking.
// Profile's form submission exercises the real setAuth path in AuthProvider,
// verifying that AuthContext and localStorage are updated together.
// External boundaries stubbed: axios (no real server), react-hot-toast.

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";

import Profile from "./Profile";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
	__esModule: true,
	default: { success: jest.fn(), error: jest.fn() },
	Toaster: () => null,
}));

jest.mock("react-router-dom", () => {
	const actual = jest.requireActual("react-router-dom");
	return { ...actual, useNavigate: () => jest.fn() };
});

function seedLocalStorage({ auth = null } = {}) {
	if (auth) localStorage.setItem("auth", JSON.stringify(auth));
}

function mockAxios({ putResponse = null, putSuccess = true } = {}) {
	axios.get.mockImplementation((url) => {
		if (url === "/api/v1/category/get-category") {
			return Promise.resolve({ data: { category: [] } });
		}
		return Promise.reject(new Error(`Unhandled GET: ${url}`));
	});

	if (putSuccess) {
		axios.put.mockResolvedValue({ data: putResponse });
	} else {
		axios.put.mockRejectedValue(new Error("Network Error"));
	}
}

function renderProfile() {
	return render(
		<MemoryRouter initialEntries={["/dashboard/user/profile"]}>
			<AuthProvider>
				<SearchProvider>
					<CartProvider>
						<Routes>
							<Route path="/dashboard/user/profile" element={<Profile />} />
							<Route
								path="/dashboard/user/orders"
								element={<div data-testid="orders-page">Orders Page</div>}
							/>
							<Route path="*" element={<div />} />
						</Routes>
					</CartProvider>
				</SearchProvider>
			</AuthProvider>
		</MemoryRouter>,
	);
}

const baseUser = {
	name: "ProfileUser",
	email: "profile@test.com",
	phone: "91234567",
	address: "10 Test Street",
};

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
});

describe("Integration – Profile: form pre-population from AuthContext", () => {
	test("pre-populates all form fields from real AuthContext on load", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios();

		renderProfile();

		// AuthProvider hydrates from localStorage; Profile useEffect reads auth.user.
		await waitFor(() => {
			expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser");
		});
		expect(screen.getByPlaceholderText(/(enter\s+your\s+)?phone/i)).toHaveValue("91234567");
		expect(screen.getByPlaceholderText(/(enter\s+your\s+)?address/i)).toHaveValue("10 Test Street");
	});

	test("email field is pre-populated and disabled", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios();

		renderProfile();

		const emailInput = screen.getByPlaceholderText(/(enter\s+your\s+)?email/i);
		await waitFor(() => expect(emailInput).toHaveValue("profile@test.com"));
		expect(emailInput).toBeDisabled();
	});
});

describe("Integration – Profile: successful update", () => {
	test("calls PUT /api/v1/auth/profile with current form values on submit", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios({
			putResponse: { updatedUser: { ...baseUser, name: "Updated Name" } },
		});

		renderProfile();

		// Wait for form to be pre-populated.
		await waitFor(() => expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser"));

		// Change the name field.
		fireEvent.change(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i), {
			target: { value: "Updated Name" },
		});

		fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

		await waitFor(() =>
			expect(axios.put).toHaveBeenCalledWith("/api/v1/auth/profile", {
				name: "Updated Name",
				email: "profile@test.com",
				password: "",
				phone: "91234567",
				address: "10 Test Street",
			}),
		);
	});

	test("updates AuthContext with returned user and shows success toast", async () => {
		const updatedUser = {
			...baseUser,
			name: "New Name",
			address: "99 New Road",
		};
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios({ putResponse: { updatedUser } });

		renderProfile();

		await waitFor(() => expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser"));

		fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

		await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Profile Updated Successfully"));
	});

	test("syncs updated user to localStorage after successful update", async () => {
		const updatedUser = { ...baseUser, name: "Synced Name" };
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios({ putResponse: { updatedUser } });

		renderProfile();

		await waitFor(() => expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser"));

		fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

		await waitFor(() => expect(toast.success).toHaveBeenCalled());

		const stored = JSON.parse(localStorage.getItem("auth"));
		expect(stored.user.name).toBe("Synced Name");
	});
});

describe("Integration – Profile: error handling", () => {
	test("shows error toast from server validation error, AuthContext unchanged", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		// Server returns a validation error message in data.error.
		mockAxios({ putResponse: { error: "Password must be at least 6 characters" } });

		renderProfile();

		await waitFor(() => expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser"));

		fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Password must be at least 6 characters"));

		// Success toast must NOT have been called.
		expect(toast.success).not.toHaveBeenCalled();

		// localStorage auth should remain unchanged.
		const stored = JSON.parse(localStorage.getItem("auth"));
		expect(stored.user.name).toBe("ProfileUser");
	});

	test("shows generic error toast on network failure", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios({ putSuccess: false });

		renderProfile();

		await waitFor(() => expect(screen.getByPlaceholderText(/(enter\s+your\s+)?name/i)).toHaveValue("ProfileUser"));

		fireEvent.click(screen.getByRole("button", { name: /UPDATE/i }));

		await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Something went wrong"));

		expect(toast.success).not.toHaveBeenCalled();
	});
});

describe("Integration – Profile: UserMenu navigation links", () => {
	test("renders Profile and Orders links via real UserMenu", async () => {
		seedLocalStorage({
			auth: { user: baseUser, token: "valid-token" },
		});
		mockAxios();

		renderProfile();

		const profileLink = await screen.findByRole("link", { name: /Profile/i });
		const ordersLink = screen.getByRole("link", { name: /Orders/i });

		expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
		expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
	});
});
