// client/src/pages/user/Profile.test.js
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

describe("client/src/pages/user/Profile.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("prefills form fields from auth.user and email input is disabled", async () => {
    // Arrange
    const auth = {
      user: {
        name: "Alice",
        email: "alice@test.com",
        phone: "123",
        address: "Somewhere",
      },
    };
    const setAuth = jest.fn();
    mockUseAuth.mockReturnValue([auth, setAuth]);

    // Act
    render(<Profile />);

    // Assert (useEffect sets state after render)
    const nameInput = screen.getByPlaceholderText("Enter Your Name");
    const emailInput = screen.getByPlaceholderText("Enter Your Email");
    const phoneInput = screen.getByPlaceholderText("Enter Your Phone");
    const addressInput = screen.getByPlaceholderText("Enter Your Address");

    await waitFor(() => {
      expect(nameInput).toHaveValue("Alice");
      expect(emailInput).toHaveValue("alice@test.com");
      expect(phoneInput).toHaveValue("123");
      expect(addressInput).toHaveValue("Somewhere");
    });

    expect(emailInput).toBeDisabled();
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "Your Profile"
    );
    expect(screen.getByTestId("user-menu")).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("typing updates controlled inputs (name/phone/address)", async () => {
    // Arrange
    const auth = {
      user: {
        name: "Alice",
        email: "alice@test.com",
        phone: "123",
        address: "Somewhere",
      },
    };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    render(<Profile />);

    const nameInput = screen.getByPlaceholderText("Enter Your Name");
    const phoneInput = screen.getByPlaceholderText("Enter Your Phone");
    const addressInput = screen.getByPlaceholderText("Enter Your Address");
    const passwordInput = screen.getByPlaceholderText("Enter Your Password");

    await waitFor(() => expect(nameInput).toHaveValue("Alice"));

    // Act
    fireEvent.change(nameInput, { target: { value: "Bob" } });
    fireEvent.change(phoneInput, { target: { value: "999" } });
    fireEvent.change(addressInput, { target: { value: "New Addr" } });
    fireEvent.change(passwordInput, { target: { value: "newpassword" } });

    // Assert
    expect(nameInput).toHaveValue("Bob");
    expect(phoneInput).toHaveValue("999");
    expect(addressInput).toHaveValue("New Addr");
    expect(passwordInput).toHaveValue("newpassword");
  });

  // Liu Shixin, A0265144H
  test("submit success: calls axios.put with payload, updates auth + localStorage, shows success toast", async () => {
    // Arrange
    const auth = {
      token: "t",
      user: {
        name: "Alice",
        email: "alice@test.com",
        phone: "123",
        address: "Somewhere",
      },
    };
    const setAuth = jest.fn();
    mockUseAuth.mockReturnValue([auth, setAuth]);

    // localStorage seeded as code expects it exists and has user field
    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: auth.user })
    );

    const updatedUser = {
      name: "Alice Updated",
      email: "alice@test.com",
      phone: "555",
      address: "Addr2",
    };
    mockAxiosPut.mockResolvedValue({ data: { updatedUser } });

    render(<Profile />);

    // wait for initial prefill
    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
        "Alice"
      )
    );

    // change a field so we can assert payload
    fireEvent.change(screen.getByPlaceholderText("Enter Your Phone"), {
      target: { value: "555" },
    });

    // Act
    const form = screen.getByText("UPDATE").closest("form");
    fireEvent.submit(form);

    // Assert
    await waitFor(() => {
      expect(mockAxiosPut).toHaveBeenCalledWith("/api/v1/auth/profile", {
        name: "Alice",
        email: "alice@test.com",
        password: "", // initial state in component :contentReference[oaicite:12]{index=12}
        phone: "555",
        address: "Somewhere",
      });
    });

    expect(setAuth).toHaveBeenCalledWith({ ...auth, user: updatedUser });
    expect(JSON.parse(localStorage.getItem("auth")).user).toEqual(updatedUser);
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Profile Updated Successfully"
    );
    expect(mockToastError).not.toHaveBeenCalled();
  });

  // Liu Shixin, A0265144H
  test("submit API error: shows toast.error and does not update auth/localStorage", async () => {
    // Arrange
    const auth = {
      token: "t",
      user: {
        name: "Alice",
        email: "alice@test.com",
        phone: "123",
        address: "Somewhere",
      },
    };
    const setAuth = jest.fn();
    mockUseAuth.mockReturnValue([auth, setAuth]);

    localStorage.setItem(
      "auth",
      JSON.stringify({ token: "t", user: auth.user })
    );

    mockAxiosPut.mockResolvedValue({ data: { error: "Bad request" } });

    render(<Profile />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
        "Alice"
      )
    );

    // Act
    fireEvent.submit(screen.getByText("UPDATE").closest("form"));

    // Assert
    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Bad request");
    });
    expect(setAuth).not.toHaveBeenCalled();

    // localStorage user unchanged
    expect(JSON.parse(localStorage.getItem("auth")).user).toEqual(auth.user);
  });

  // Liu Shixin, A0265144H
  test("submit throws: logs error and shows 'Something went wrong'", async () => {
    // Arrange
    const auth = {
      user: {
        name: "Alice",
        email: "alice@test.com",
        phone: "123",
        address: "Somewhere",
      },
    };
    mockUseAuth.mockReturnValue([auth, jest.fn()]);

    const err = new Error("network down");
    mockAxiosPut.mockRejectedValue(err);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(<Profile />);

    await waitFor(() =>
      expect(screen.getByPlaceholderText("Enter Your Name")).toHaveValue(
        "Alice"
      )
    );

    // Act
    fireEvent.submit(screen.getByText("UPDATE").closest("form"));

    // Assert
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(err);
      expect(mockToastError).toHaveBeenCalledWith("Something went wrong");
    });

    consoleSpy.mockRestore();
  });
});
