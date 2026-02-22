// client/src/pages/admin/Users.test.js
import React from "react";
import { render, screen } from "@testing-library/react";
import { jest } from "@jest/globals";

/**
 * Unit tests only (presentational; mock wrappers).
 */

jest.mock("./../../components/Layout", () => ({
  __esModule: true,
  default: ({ title, children }) => (
    <div>
      <div data-testid="layout-title">{title}</div>
      {children}
    </div>
  ),
}));

jest.mock("../../components/AdminMenu", () => ({
  __esModule: true,
  default: () => <div data-testid="admin-menu" />,
}));

const Users = require("./Users").default;

describe("client/src/pages/admin/Users.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("renders Layout with correct title and shows AdminMenu + heading", () => {
    // Arrange / Act
    render(<Users />);

    // Assert
    expect(screen.getByTestId("layout-title")).toHaveTextContent(
      "Dashboard - All Users"
    );
    expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "All Users" })
    ).toBeInTheDocument();
  });
});
