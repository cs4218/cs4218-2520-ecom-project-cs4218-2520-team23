import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Categories from "./Categories";

// mock hook
jest.mock("../hooks/useCategory", () => jest.fn());
import useCategory from "../hooks/useCategory";

// mock Layout to isolate UI
jest.mock("../components/Layout", () => ({ children }) => <div>{children}</div>);

describe("Categories page (render tests)", () => {
  test("BVA: empty categories -> renders no links", () => {
    useCategory.mockReturnValueOnce([]);

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    // no buttons/links for categories
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  test("EP: categories present -> renders correct links + text", () => {
    useCategory.mockReturnValueOnce([
      { _id: "1", name: "Cat1", slug: "cat1" },
      { _id: "2", name: "Cat2", slug: "cat2" },
    ]);

    render(
      <MemoryRouter>
        <Categories />
      </MemoryRouter>
    );

    const link1 = screen.getByRole("link", { name: "Cat1" });
    const link2 = screen.getByRole("link", { name: "Cat2" });

    expect(link1).toHaveAttribute("href", "/category/cat1");
    expect(link2).toHaveAttribute("href", "/category/cat2");
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });
});
