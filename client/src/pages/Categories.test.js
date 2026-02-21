/**
 * Test written by Ng Hong Ray, A0253509A
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning 
 * - categories: empty list vs non-empty list
 * - Valid category objects with name + slug
 *
 * 2. Boundary Value Analysis 
 * - categories length: 0 (renders nothing)
 * - categories length: multiple items (renders correct number of links)
 *
 * Notes:
 * - The hook’s data-fetching behavior is tested separately in useCategory.test.js
 * - This file focuses purely on UI mapping and routing correctness to verify that the Categories page correctly renders links based on the hook’s output.
 */

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
    // Boundary Value Analysis + Equivalence Partitioning
    test("empty categories -> renders no links", () => {
        useCategory.mockReturnValueOnce([]);

        render(
            <MemoryRouter>
                <Categories />
            </MemoryRouter>
        );

        // no buttons/links for categories
        expect(screen.queryAllByRole("link")).toHaveLength(0);
    });

    // Boundary Value Analysis + Equivalence Partitioning
    test("categories present -> renders correct links + text", () => {
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
