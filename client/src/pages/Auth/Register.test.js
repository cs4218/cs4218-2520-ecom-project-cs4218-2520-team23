// Improved by Dong Cheng-Yu, A0262348B
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import Register from "./Register";
import { useNavigate } from "react-router-dom";

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
}));

describe("Register", () => {
  let navigateMock;
  let consoleErrorSpy;

  const getDateInput = () => screen.getByTestId("dob-input");

  const fillRequiredFields = () => {
    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "John Doe" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getDateInput(), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: "Football" } },
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    navigateMock = jest.fn();
    useNavigate.mockReturnValue(navigateMock);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("renders register form with required fields", () => {
    render(<Register />);

    expect(screen.getByText("REGISTER FORM")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Your Name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter Your Email")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Enter Your Password"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "REGISTER" }),
    ).toBeInTheDocument();
  });

  it("submits normalized payload to register endpoint", async () => {
    axios.post.mockResolvedValue({
      data: { success: false, message: "Invalid" },
    });
    render(<Register />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "  John Doe  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "  test@example.com  " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: " 1234567890 " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: " 123 Street " },
    });
    fireEvent.change(getDateInput(), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: " Football " } },
    );

    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: "John Doe",
        email: "test@example.com",
        password: "password123",
        phone: "1234567890",
        address: "123 Street",
        DOB: "2000-01-01",
        answer: "Football",
      });
    });
  });

  it("handles successful registration with toast and redirect", async () => {
    axios.post.mockResolvedValue({ data: { success: true } });
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Register Successfully, please login",
      );
    });
    expect(navigateMock).toHaveBeenCalledWith("/login");
  });

  it("shows backend error message when registration returns success false", async () => {
    axios.post.mockResolvedValue({
      data: { success: false, message: "User already exists" },
    });
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("User already exists");
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("uses fallback message when registration returns success false without message", async () => {
    axios.post.mockResolvedValue({ data: { success: false } });
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Registration failed");
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("uses backend error response message when request throws", async () => {
    axios.post.mockRejectedValue({
      response: { data: { message: "Email already registered" } },
    });
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Email already registered");
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("uses generic fallback message when request throws generic error", async () => {
    const err = new Error("Network error");
    axios.post.mockRejectedValue(err);
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith(err);
  });

  it("does not submit when a required trimmed field is whitespace only", async () => {
    render(<Register />);

    fireEvent.change(screen.getByPlaceholderText("Enter Your Name"), {
      target: { value: "   " },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Email"), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: "1234567890" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter Your Address"), {
      target: { value: "123 Street" },
    });
    fireEvent.change(getDateInput(), {
      target: { value: "2000-01-01" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("What is Your Favorite sports"),
      { target: { value: "Football" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Please fill all required fields",
      );
    });
    expect(axios.post).not.toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it("uses generic fallback when thrown error has response but no message", async () => {
    axios.post.mockRejectedValue({ response: { data: {} } });
    render(<Register />);

    fillRequiredFields();
    fireEvent.click(screen.getByRole("button", { name: "REGISTER" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Something went wrong");
    });
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
