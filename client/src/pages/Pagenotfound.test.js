// Pan Xinping, A0228445B

import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import Pagenotfound from "../pages/Pagenotfound";

// Mock the Layout component to verify the title prop
jest.mock("./../components/Layout", () => {
  return ({ children, title }) => (
    <div data-testid="mock-layout" data-title={title}>
      {children}
    </div>
  );
});

describe("PageNotFound Component", () => {
  
  const renderPnf = () => {
    return render(
      <MemoryRouter>
        <Pagenotfound />
      </MemoryRouter>
    );
  };

  test("renders the 404 error code and error message", () => {
    renderPnf();
    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument();
  });

  test("passes the correct error title to the Layout component", () => {
    renderPnf();
    const layout = screen.getByTestId("mock-layout");
    expect(layout).toHaveAttribute("data-title", "go back- page not found");
  });

  test("contains a 'Go Back' link that points to the home page", () => {
    renderPnf();
    const link = screen.getByRole("link", { name: /go back/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/");
  });
});