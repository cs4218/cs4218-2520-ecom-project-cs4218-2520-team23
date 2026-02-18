// client/src/context/search.test.js
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SearchProvider, useSearch } from "./search";

/**
 * Unit tests only (no router/network).
 */

describe("client/src/context/search.js (unit)", () => {
  // Liu Shixin, A0265144H
  test("useSearch outside provider returns undefined (consumer can detect missing provider)", () => {
    // Arrange
    function OrphanConsumer() {
      const value = useSearch(); // should be undefined if no provider
      return <div>{value ? "has-provider" : "no-provider"}</div>;
    }

    // Act
    render(<OrphanConsumer />);

    // Assert
    expect(screen.getByText("no-provider")).toBeInTheDocument();
  });

  // Liu Shixin, A0265144H
  test("SearchProvider supplies default state: keyword '' and empty results", () => {
    // Arrange
    function ReadConsumer() {
      const [state] = useSearch();
      return (
        <div>
          <div data-testid="keyword">{state.keyword}</div>
          <div data-testid="results-len">{state.results.length}</div>
        </div>
      );
    }

    // Act
    render(
      <SearchProvider>
        <ReadConsumer />
      </SearchProvider>
    );

    // Assert
    expect(screen.getByTestId("keyword")).toHaveTextContent("");
    expect(screen.getByTestId("results-len")).toHaveTextContent("0");
  });

  // Liu Shixin, A0265144H
  test("SearchProvider setter updates state and consumer re-renders (state-based)", async () => {
    // Arrange
    function UpdateConsumer() {
      const [state, setState] = useSearch();
      return (
        <div>
          <div data-testid="keyword">{state.keyword}</div>
          <div data-testid="results-len">{state.results.length}</div>
          <button
            type="button"
            onClick={() =>
              setState({ keyword: "abc", results: [{ _id: "p1" }] })
            }
          >
            update
          </button>
        </div>
      );
    }

    render(
      <SearchProvider>
        <UpdateConsumer />
      </SearchProvider>
    );

    // Act
    fireEvent.click(screen.getByRole("button", { name: "update" }));

    // Assert
    await waitFor(() => {
      expect(screen.getByTestId("keyword")).toHaveTextContent("abc");
      expect(screen.getByTestId("results-len")).toHaveTextContent("1");
    });
  });
});
