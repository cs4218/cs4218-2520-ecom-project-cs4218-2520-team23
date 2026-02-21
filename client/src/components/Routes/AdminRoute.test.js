// Dong Cheng-Yu, A0262348B
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import AdminRoute from "./AdminRoute";
import { useAuth } from "../../context/auth";

jest.mock("axios");

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../Spinner", () => {
  return function Spinner() {
    return <div data-testid="spinner">Loading...</div>;
  };
});

describe("AdminRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render Spinner initially when auth token exists", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should call admin-auth API when token exists", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });
  });

  it("should render Outlet when admin auth check succeeds", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Admin Content")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("spinner")).not.toBeInTheDocument();
  });

  it("should render Spinner when admin auth check fails", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: false } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();
  });

  it("should not call API when no auth token exists", async () => {
    useAuth.mockReturnValue([{}, jest.fn()]);

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should not call API when auth is null", async () => {
    useAuth.mockReturnValue([null, jest.fn()]);

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(axios.get).not.toHaveBeenCalled();
    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should handle API errors gracefully", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockRejectedValue(new Error("Network error"));

    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<AdminRoute />}>
            <Route index element={<div>Admin Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/admin-auth");
    });

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
    expect(screen.queryByText("Admin Content")).not.toBeInTheDocument();

    consoleSpy.mockRestore();
  });
});
