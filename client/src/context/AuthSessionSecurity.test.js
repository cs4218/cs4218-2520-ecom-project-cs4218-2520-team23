// Written by Pan Xinping, A0228445B

import React, { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";

const localStorageMock = {
	setItem: jest.fn(),
	getItem: jest.fn(),
	removeItem: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
	writable: true,
	configurable: true,
});

function SessionProbe() {
	const [auth] = useAuth();

	useEffect(() => {
		window.__sessionProbeAuth = auth;
	}, [auth]);

	return <div>{auth?.user?.name || "signed-out"}</div>;
}

describe("Auth session security coverage", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		window.__sessionProbeAuth = null;
		localStorageMock.getItem.mockReturnValue(null);
		delete axios.defaults.headers.common.Authorization;
	});

	test("rehydrates auth from localStorage on mount", async () => {
		localStorageMock.getItem.mockReturnValue(JSON.stringify({ user: { name: "Alice" }, token: "token-1" }));

		render(
			<AuthProvider>
				<SessionProbe />
			</AuthProvider>,
		);

		expect(await screen.findByText("Alice")).toBeInTheDocument();
	});

	test("storage logout event should clear auth state for protected views", async () => {
		localStorageMock.getItem.mockReturnValue(JSON.stringify({ user: { name: "Alice" }, token: "token-1" }));

		render(
			<AuthProvider>
				<SessionProbe />
			</AuthProvider>,
		);

		expect(await screen.findByText("Alice")).toBeInTheDocument();

		window.dispatchEvent(
			new StorageEvent("storage", {
				key: "auth",
				oldValue: JSON.stringify({ user: { name: "Alice" }, token: "token-1" }),
				newValue: null,
			}),
		);

		await waitFor(() => {
			expect(screen.getByText("signed-out")).toBeInTheDocument();
		});
	});

	test("invalid auth JSON in localStorage falls back to signed-out state", async () => {
		localStorageMock.getItem.mockReturnValue("{bad-json");

		render(
			<AuthProvider>
				<SessionProbe />
			</AuthProvider>,
		);

		expect(await screen.findByText("signed-out")).toBeInTheDocument();
		expect(window.__sessionProbeAuth).toEqual({ user: null, token: "" });
	});

	test("clearing token removes axios default Authorization header", async () => {
		localStorageMock.getItem.mockReturnValue(JSON.stringify({ user: { name: "Alice" }, token: "token-1" }));

		render(
			<AuthProvider>
				<SessionProbe />
			</AuthProvider>,
		);

		await waitFor(() => {
			expect(axios.defaults.headers.common.Authorization).toBe("token-1");
		});

		window.dispatchEvent(
			new StorageEvent("storage", {
				key: "auth",
				oldValue: JSON.stringify({ user: { name: "Alice" }, token: "token-1" }),
				newValue: null,
			}),
		);

		await waitFor(() => {
			expect(axios.defaults.headers.common.Authorization).toBeUndefined();
		});
	});
});
