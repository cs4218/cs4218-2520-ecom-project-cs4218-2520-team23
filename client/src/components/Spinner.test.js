// Pan Xinping, A0228445B

import React from "react";
import { render, screen, act } from "@testing-library/react";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
import "@testing-library/jest-dom";
import Spinner from "../components/Spinner";

// Mock the hooks from react-router-dom
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

describe("Spinner Component", () => {
  const mockNavigate = jest.fn();
  const mockLocation = { pathname: "/current-page" };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers(); // Enable fake timers
    useNavigate.mockReturnValue(mockNavigate);
    useLocation.mockReturnValue(mockLocation);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers(); // Clean up
  });

  test("renders with initial countdown value of 3", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );
    expect(screen.getByText(/redirecting to you in 3 second/i)).toBeInTheDocument();
  });

  test("decrements the counter every second", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    // Fast-forward 1 second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 2 second/i)).toBeInTheDocument();

    // Fast-forward another second
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText(/redirecting to you in 1 second/i)).toBeInTheDocument();
  });

  test("navigates to the default path (login) when count reaches 0", () => {
    render(
      <MemoryRouter>
        <Spinner />
      </MemoryRouter>
    );

    // Fast-forward 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/login", {
      state: "/current-page",
    });
  });

  test("navigates to a custom path when provided via props", () => {
    render(
      <MemoryRouter>
        <Spinner path="forgot-password" />
      </MemoryRouter>
    );

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(mockNavigate).toHaveBeenCalledWith("/forgot-password", {
      state: "/current-page",
    });
  });
});