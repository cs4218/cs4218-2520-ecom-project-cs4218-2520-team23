import { jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockAxiosPut = jest.fn();
jest.mock("axios", () => ({
	__esModule: true,
	default: { put: mockAxiosPut },
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("react-hot-toast", () => ({
	__esModule: true,
	default: { success: mockToastSuccess, error: mockToastError },
}));

const mockUseAuth = jest.fn();
jest.mock("../../context/auth", () => ({
	__esModule: true,
	useAuth: mockUseAuth,
}));

jest.mock("../../components/UserMenu", () => ({
	__esModule: true,
	default: () => <div data-testid="user-menu" />,
}));

jest.mock("./../../components/Layout", () => ({
	__esModule: true,
	default: ({ title, children }) => (
		<div>
			<div data-testid="layout-title">{title}</div>
			{children}
		</div>
	),
}));

const Profile = require("./Profile").default;

beforeEach(() => {
	jest.clearAllMocks();
	localStorage.clear();
});

describe("Profile security coverage", () => {
	test("submits malicious profile fields as plain data", async () => {
		const auth = {
			user: {
				name: "Alice",
				email: "alice@example.com",
				phone: "123",
				address: "Street 1",
			},
		};
		mockUseAuth.mockReturnValue([auth, jest.fn()]);
		localStorage.setItem("auth", JSON.stringify({ token: "t", user: auth.user }));

		mockAxiosPut.mockResolvedValue({
			data: {
				updatedUser: {
					name: "<script>alert('profile')</script>",
					email: "alice@example.com",
					phone: "<svg onload=alert(1)>",
					address: '<img src=x onerror="alert(1)">',
				},
			},
		});

		render(<Profile />);

		await waitFor(() => expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue("Alice"));

		fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
			target: { value: "<script>alert('profile')</script>" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
			target: { value: "<svg onload=alert(1)>" },
		});
		fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
			target: { value: '<img src=x onerror="alert(1)">' },
		});

		fireEvent.submit(screen.getByText("UPDATE").closest("form"));

		await waitFor(() => {
			expect(mockAxiosPut).toHaveBeenCalledWith("/api/v1/auth/profile", {
				name: "<script>alert('profile')</script>",
				email: "alice@example.com",
				password: "",
				phone: "<svg onload=alert(1)>",
				address: '<img src=x onerror="alert(1)">',
			});
		});

		expect(mockToastSuccess).toHaveBeenCalledWith("Profile Updated Successfully");
	});
});
