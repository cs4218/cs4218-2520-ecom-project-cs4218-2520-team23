// Improved by Dong Cheng-Yu, A0262348B
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Login from "./Login";
import { useAuth } from "../../context/auth";
import { useNavigate, useLocation } from "react-router-dom";

jest.mock("axios");
jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

jest.mock("../../components/Layout", () => {
  return function MockLayout({ children }) {
    return <div>{children}</div>;
  };
});

jest.mock("react-router-dom", () => ({
  useNavigate: jest.fn(),
  useLocation: jest.fn(),
}));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

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

describe("Login", () => {
  let setAuthMock;
  let navigateMock;
  let consoleErrorSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    setAuthMock = jest.fn();
    navigateMock = jest.fn();

    useAuth.mockReturnValue([{ user: null, token: "" }, setAuthMock]);
    useNavigate.mockReturnValue(navigateMock);
    useLocation.mockReturnValue({ state: "/cart" });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders login form with required inputs", () => {
    render(<Login />);

    expect(screen.getByText("LOGIN FORM")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter Your Password"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LOGIN" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Forgot Password" }),
    ).toBeInTheDocument();
  });

  it("renders all fields empty on initial load", () => {
    render(<Login />);

    expect(screen.getByPlaceholderText("Enter Your Email")).toHaveValue("");
    expect(screen.getByPlaceholderText("Enter Your Password")).toHaveValue("");
  });

  it("submits trimmed email and password to login endpoint", async () => {
    axios.post.mockResolvedValue({
      data: { success: false, message: "Invalid" },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "  test@example.com  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });

    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("does not trim password field", async () => {
    axios.post.mockResolvedValue({
      data: { success: false, message: "Invalid" },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "  password123  " },
    });

    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
        email: "test@example.com",
        password: "  password123  ",
      });
    });
  });

  it("shows success toast on successful login", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: "Login Successful",
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Login Successful", {
        duration: 5000,
        icon: "🙏",
        style: {
          background: "green",
          color: "white",
        },
      });
    });
  });

  it("updates auth context on successful login", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: "Login Successful",
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(setAuthMock).toHaveBeenCalledWith({
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      });
    });
  });

  it("persists auth to localStorage on successful login", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: "Login Successful",
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        "auth",
        JSON.stringify({
          user: { _id: "u1", name: "John Doe" },
          token: "mockToken",
        }),
      );
    });
  });

  it("redirects to location state on successful login", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        message: "Login Successful",
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/cart");
    });
  });

  it("uses default success message and redirects to / when location state is null", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: true,
        user: { _id: "u1", name: "John Doe" },
        token: "mockToken",
      },
    });
    useLocation.mockReturnValue({ state: null });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Login successful", {
        duration: 5000,
        icon: "🙏",
        style: {
          background: "green",
          color: "white",
        },
      });
    });
    expect(navigateMock).toHaveBeenCalledWith("/");
  });

  it("shows backend error message when success is false", async () => {
    axios.post.mockResolvedValue({
      data: {
        success: false,
        message: "Invalid credentials",
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Invalid credentials");
    });
    expect(setAuthMock).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("uses default failure message when success is false without message", async () => {
    axios.post.mockResolvedValue({ data: { success: false } });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Login failed");
    });
    expect(setAuthMock).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("uses backend error response message when request throws with response data", async () => {
    axios.post.mockRejectedValue({
      response: {
        data: { message: "Account temporarily locked" },
      },
    });
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Account temporarily locked");
    });
    expect(setAuthMock).not.toHaveBeenCalled();
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("uses fallback error message when request throws generic error", async () => {
    axios.post.mockRejectedValue(new Error("Network error"));
    render(<Login />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "LOGIN" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
    expect(setAuthMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.any(Error));
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("navigates to forgot-password when user clicks forgot password button", () => {
    render(<Login />);

    fireEvent.click(screen.getByRole("button", { name: "Forgot Password" }));

    expect(navigateMock).toHaveBeenCalledWith("/forgot-password");
  });
});
