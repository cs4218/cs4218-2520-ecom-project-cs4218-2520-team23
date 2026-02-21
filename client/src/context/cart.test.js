/**
 * Test written by Ng Hong Ray, A0253509A
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning 
 *  - localStorage returns null → cart defaults to []
 *  - localStorage returns valid JSON (empty array)
 *  - localStorage returns valid non-empty JSON
 *
 * 2. Boundary Value Analysis 
 *  - Smallest valid payload: "[]"
 *  - Minimal non-empty cart: 1 item array
 *  
 */
import React from "react";
import { act } from "react-dom/test-utils";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CartProvider, useCart } from "./cart"; 

// Simple consumer to observe and mutate context state
function Consumer() {
  const [cart, setCart] = useCart();
  return (
    <div>
      <pre data-testid="cart">{JSON.stringify(cart)}</pre>
      <button
        data-testid="add-item"
        onClick={() => setCart((prev) => [...prev, { id: 1 }])}
      >
        add
      </button>
    </div>
  );
}

function renderWithProvider(ui) {
  return render(<CartProvider>{ui}</CartProvider>);
}

describe("CartProvider / useCart", () => {
  let getItemSpy;

  beforeEach(() => {
    // Reset spies/mocks between tests
    jest.restoreAllMocks();

    // Spy on getItem for assertions 
    getItemSpy = jest.spyOn(Storage.prototype, "getItem");
  });

  // Equivalence Partitioning
  test("When localStorage has no cart (null), defaults to empty array []", () => {
    getItemSpy.mockReturnValueOnce(null);

    renderWithProvider(<Consumer />);

    expect(getItemSpy).toHaveBeenCalledTimes(1);
    expect(getItemSpy).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

  // Boundary Value Analysis
  test('When localStorage has smallest valid cart payload "[]", cart becomes []', () => {
    getItemSpy.mockReturnValueOnce("[]");

    renderWithProvider(<Consumer />);

    expect(getItemSpy).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart").textContent).toBe("[]");
  });

  // Equivalence Partitioning & Boundary Value Analysis 
  test("When localStorage has a valid non-empty cart JSON, it hydrates state", () => {
    // Boundary: minimal non-empty cart array (1 item)
    const payload = JSON.stringify([{ id: 123, qty: 1 }]);
    getItemSpy.mockReturnValueOnce(payload);

    renderWithProvider(<Consumer />);

    expect(getItemSpy).toHaveBeenCalledWith("cart");
    expect(screen.getByTestId("cart").textContent).toBe(payload);
  });

  // frontend state update test (not really needed since it's just useState, but good)
  test("State update: setCart updates cart value from consumer interaction", async () => {
    getItemSpy.mockReturnValueOnce(null);

    renderWithProvider(<Consumer />);
    expect(screen.getByTestId("cart").textContent).toBe("[]");

    // wrap in act() to ensure all state updates are processed and remove warnings
    await act(async () => {
      await userEvent.click(screen.getByTestId("add-item"));
    });

    await waitFor(() => {
      expect(screen.getByTestId("cart").textContent).toBe('[{"id":1}]');
    });
  });

  // The cart is loaded from localStorage only once.
  // It is NOT reloaded every time the component re-renders.
  test("Effect runs once on mount (empty dependency array)", () => {
    getItemSpy.mockReturnValueOnce(null);

    const { rerender } = renderWithProvider(<Consumer />);
    // Effect runs on mount only, so rerender should not call getItem again
    rerender(
      <CartProvider>
        <Consumer />
      </CartProvider>
    );

    expect(getItemSpy).toHaveBeenCalledTimes(1);
  });

  // Misuse scenarios
  test("useCart throws if used outside CartProvider", () => {
    function BadConsumer() {
      useCart();
      return null;
    }

    expect(() => render(<BadConsumer />)).toThrow(
      "useCart must be used within a CartProvider"
    );
  });
});
