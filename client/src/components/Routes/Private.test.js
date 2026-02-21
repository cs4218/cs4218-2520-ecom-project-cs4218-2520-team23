// Dong Cheng-Yu, A0262348B
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import PrivateRoute from "./Private";
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

describe("PrivateRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should render Spinner initially when auth token exists", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should call user-auth API when token exists", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith("/api/v1/auth/user-auth");
    });
  });

  it("should render Outlet when user auth check succeeds", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: true } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("User Content")).toBeInTheDocument();
    });
  });

  it("should render Spinner when user auth check fails", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockResolvedValue({ data: { ok: false } });

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });

  it("should render Spinner when no token", async () => {
    useAuth.mockReturnValue([{}, jest.fn()]);

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId("spinner")).toBeInTheDocument();
  });

  it("should render Spinner on axios error", async () => {
    useAuth.mockReturnValue([{ token: "test-token" }, jest.fn()]);
    axios.get.mockRejectedValue(new Error("Network error"));

    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<PrivateRoute />}>
            <Route index element={<div>User Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("spinner")).toBeInTheDocument();
    });
  });
});
