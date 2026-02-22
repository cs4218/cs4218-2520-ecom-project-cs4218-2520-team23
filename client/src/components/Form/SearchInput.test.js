// client/src/components/Form/SearchInput.test.js
import { jest } from "@jest/globals";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockAxiosGet = jest.fn();
jest.mock("axios", () => ({
  __esModule: true,
  default: { get: mockAxiosGet },
}));

const mockUseSearch = jest.fn();
jest.mock("../../context/search", () => ({
  __esModule: true,
  useSearch: mockUseSearch,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

const SearchInput = require("./SearchInput").default;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SearchInput (unit)", () => {
  // Liu Shixin, A0265144H
  test("renders controlled input and search button", () => {
    // Arrange
    const values = { keyword: "", results: [] };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    // Act
    render(<SearchInput />);

    // Assert
    const input = screen.getByPlaceholderText("Search");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
    expect(screen.getByRole("button", { name: "Search" })).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("typing updates keyword via setValues", () => {
    // Arrange
    const values = { keyword: "", results: ["old"] };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    render(<SearchInput />);
    const input = screen.getByPlaceholderText("Search");

    // Act
    fireEvent.change(input, { target: { value: "phone" } });

    // Assert
    expect(setValues).toHaveBeenCalledWith({ ...values, keyword: "phone" });
  });

  // Liu Shixin, A0265144H
  test("submit success: calls axios, sets results, navigates to /search", async () => {
    // Arrange
    const values = { keyword: "laptop", results: [] };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    const fakeResults = [{ _id: "p1" }];
    mockAxiosGet.mockResolvedValue({ data: fakeResults });

    render(<SearchInput />);
    const form = screen.getByRole("search"); // <form role="search" ...> :contentReference[oaicite:12]{index=12}

    // Act
    fireEvent.submit(form);

    // Assert
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(
        "/api/v1/product/search/laptop"
      );
    });
    expect(setValues).toHaveBeenCalledWith({ ...values, results: fakeResults });
    expect(mockNavigate).toHaveBeenCalledWith("/search");
  });

  // Liu Shixin, A0265144H
  test("submit failure: logs error and does not navigate", async () => {
    // Arrange
    const values = { keyword: "x", results: [] };
    const setValues = jest.fn();
    mockUseSearch.mockReturnValue([values, setValues]);

    const err = new Error("network fail");
    mockAxiosGet.mockRejectedValue(err);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    render(<SearchInput />);
    const form = screen.getByRole("search");

    // Act
    fireEvent.submit(form);

    // Assert
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(err);
    });
    expect(mockNavigate).not.toHaveBeenCalled();

    // We only expect no "results update" call here
    expect(setValues).not.toHaveBeenCalledWith(
      expect.objectContaining({ results: expect.anything() })
    );

    consoleSpy.mockRestore();
  });
});
