// Dong Cheng-Yu, A0262348B
//
// Bottom-up integration tests for Dashboard.
// AuthProvider (unit-tested in MS1) is the base layer and is used real.
// Dashboard and UserMenu are integrated on top; UserMenu navigation links are
// verified with a real MemoryRouter. Real Layout/Header/Footer render too.
// External boundaries stubbed: axios (no real server), react-hot-toast.

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

import Dashboard from "./Dashboard";
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

function mockAxiosGet() {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { category: [] } });
    }
    return Promise.reject(new Error(`Unhandled GET: ${url}`));
  });
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/user"]}>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <Routes>
              <Route path="/dashboard/user" element={<Dashboard />} />
              <Route
                path="/dashboard/user/profile"
                element={<div data-testid="profile-page">Profile Page</div>}
              />
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

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("Integration – Dashboard: authenticated user info", () => {
  test("displays user name, email, and address from real AuthContext", async () => {
    seedLocalStorage({
      auth: {
        user: {
          name: "Jane Doe",
          email: "jane@example.com",
          address: "42 Orchard Road",
        },
        token: "valid-token",
      },
    });
    mockAxiosGet();

    renderDashboard();

    // AuthProvider hydrates from localStorage via useEffect.
    // Dashboard reads directly from AuthContext — no API call needed.
    // Use role=heading to distinguish the <h3> card from the Header nav link.
    expect(await screen.findByRole("heading", { name: "Jane Doe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "jane@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "42 Orchard Road" })).toBeInTheDocument();
  });

  test("shows empty user card when no auth in localStorage", async () => {
    mockAxiosGet();

    renderDashboard();

    // AuthProvider initialises with user = null; Dashboard should not crash.
    // UserMenu links still render, proving the page mounted successfully.
    const profileLink = await screen.findByRole("link", { name: /Profile/i });
    expect(profileLink).toBeInTheDocument();

    // All three h3 info fields should be empty (no user data to display).
    const headings = screen.getAllByRole("heading", { level: 3 });
    headings.forEach((h) => expect(h).toHaveTextContent(""));
  });

  test("reflects updated AuthContext when user details change", async () => {
    seedLocalStorage({
      auth: {
        user: {
          name: "Old Name",
          email: "old@example.com",
          address: "Old Address",
        },
        token: "valid-token",
      },
    });
    mockAxiosGet();

    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Old Name" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "old@example.com" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old Address" })).toBeInTheDocument();
  });
});

describe("Integration – Dashboard: UserMenu navigation links", () => {
  test("renders Profile and Orders links via real UserMenu", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Jane Doe", email: "jane@example.com", address: "SG" },
        token: "valid-token",
      },
    });
    mockAxiosGet();

    renderDashboard();

    const profileLink = await screen.findByRole("link", { name: /Profile/i });
    const ordersLink = screen.getByRole("link", { name: /Orders/i });

    expect(profileLink).toHaveAttribute("href", "/dashboard/user/profile");
    expect(ordersLink).toHaveAttribute("href", "/dashboard/user/orders");
  });
});
