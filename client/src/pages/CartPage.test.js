/**
 * CartPage.test.js
 *
 * Tools: Jest + React Testing Library
 *
 * Practices used (documented per suite):
 * - EP: guest vs logged-in, empty vs non-empty cart, address present vs missing,
 *   token present vs missing, clientToken present vs missing, axios success vs failure
 * - BVA: cart size 0 vs 1 vs 2, total = 0 vs >0, payment button disabled/enabled boundaries
 * - Isolation: mocks for axios, DropIn, contexts, router, toast, localStorage
 * - Bug detection: includes tests that will FAIL if CartPage has logic bugs (e.g., string prices summed incorrectly)
 */

import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import CartPage from "./CartPage";
import toast from "react-hot-toast";

// ===== Mocks =====
jest.mock("axios");
const axios = require("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn() },
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

// Layout: render children only (isolation)
jest.mock("./../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div data-testid="layout">{children}</div>,
}));

// Context hooks: overridable per-test
const mockUseAuth = jest.fn();
const mockUseCart = jest.fn();
jest.mock("../context/auth", () => ({
  __esModule: true,
  useAuth: () => mockUseAuth(),
}));
jest.mock("../context/cart", () => ({
  __esModule: true,
  useCart: () => mockUseCart(),
}));

// DropIn: call onInstance in useEffect (avoid setState during render warning)
let mockDropinInstance = null;
jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: ({ onInstance }) => {
      React.useEffect(() => {
        if (onInstance && mockDropinInstance) onInstance(mockDropinInstance);
      }, [onInstance]);
      return <div data-testid="dropin">DropIn</div>;
    },
  };
});

// react-icons not needed for tests
jest.mock("react-icons/ai", () => ({
  __esModule: true,
  AiFillWarning: () => <span data-testid="warn-icon" />,
}));

// ===== localStorage mock =====
const ls = (() => {
  let store = {};
  return {
    getItem: jest.fn((k) => (k in store ? store[k] : null)),
    setItem: jest.fn((k, v) => {
      store[k] = String(v);
    }),
    removeItem: jest.fn((k) => {
      delete store[k];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, "localStorage", { value: ls });

// ===== Test helpers =====
const product = (overrides = {}) => ({
  _id: "p1",
  name: "Product 1",
  description: "This is a long description for Product 1",
  price: 10,
  ...overrides,
});

async function setup({
  auth = { user: null, token: null },
  cart = [],
  setAuth = jest.fn(),
  setCart = jest.fn(),
  clientToken = "token-from-api",
  axiosTokenSuccess = true,
} = {}) {
  if (axiosTokenSuccess) {
    axios.get.mockResolvedValue({ data: { clientToken } });
  } else {
    axios.get.mockRejectedValue(new Error("token fail"));
  }

  mockUseAuth.mockImplementation(() => [auth, setAuth]);
  mockUseCart.mockImplementation(() => [cart, setCart]);

  render(<CartPage />);

  // 1) wait effect fired
  await waitFor(() => expect(axios.get).toHaveBeenCalled());

  // 2) flush React update triggered by setClientToken
  await act(async () => {});

  return { setAuth, setCart };
}


beforeEach(() => {
  jest.clearAllMocks();
  ls.clear();
  mockNavigate.mockClear();
  mockUseAuth.mockReset();
  mockUseCart.mockReset();
  mockDropinInstance = null;
});

describe("CartPage rendering (EP: auth/cart partitions)", () => {
  test("EP/BVA: Guest + empty cart -> shows Guest greeting and 'Cart Is Empty'", async () => {
    await setup({ auth: { user: null, token: null }, cart: [] });

    expect(await screen.findByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();

    // BVA: cart length = 0 => should NOT render DropIn/payment section
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });

  test("EP/BVA: Logged in + non-empty cart -> shows user name and item count", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "Sembawang" }, token: "t" },
      cart: [product(), product({ _id: "p2" })], // BVA: size 2
    });

    expect(await screen.findByText(/Hello\s+Ray/i)).toBeInTheDocument();
    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
  });

  test("EP: Logged in but no address -> shows Update Address button", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "" }, token: "t" },
      cart: [product()],
    });

    const btn = await screen.findByRole("button", { name: /Update Address/i });
    expect(btn).toBeInTheDocument();
  });

  test("EP: Not logged in -> shows 'Please Login to checkout' button and navigates to /login with state=/cart", async () => {
    await setup({ auth: { user: null, token: null }, cart: [product()] });

    const btn = await screen.findByRole("button", {
      name: /Plase Login to checkout/i,
    });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });
});

describe("Token fetching (EP: axios get success/failure)", () => {
  test("EP: successful token fetch -> payment UI can appear when logged in + cart not empty", async () => {
    mockDropinInstance = { requestPaymentMethod: jest.fn() };

    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product()],
      clientToken: "ct",
      axiosTokenSuccess: true,
    });

    expect(await screen.findByTestId("dropin")).toBeInTheDocument();
  });

  test("EP: token fetch failure -> DropIn should NOT appear", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product()],
      axiosTokenSuccess: false,
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });
});

describe("Cart listing + remove item (BVA: cart size, EP: remove flow)", () => {
  test("BVA: cart size 1 -> renders one item card and correct photo URL", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [product({ _id: "abc" })],
    });

    const img = await screen.findByRole("img", { name: /Product 1/i });
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/abc");
  });

  test("EP: clicking Remove removes the correct item, updates state + localStorage", async () => {
    const setCart = jest.fn();
    const cart = [product({ _id: "p1" }), product({ _id: "p2", name: "P2" })];

    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart,
      setCart,
    });

    const removeButtons = await screen.findAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeButtons[0]);

    expect(setCart).toHaveBeenCalledWith([expect.objectContaining({ _id: "p2" })]);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([{ ...cart[1] }])
    );
  });
});

describe("totalPrice correctness (Bug-detection tests)", () => {
  test("BVA: total for empty cart should show $0.00", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [],
    });

    expect(await screen.findByText(/Total\s*:/i)).toHaveTextContent("Total : $0.00");
  });

  test("BUG DETECT: string prices should still sum numerically (fails until code converts price to Number)", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [product({ price: "10" }), product({ _id: "p2", price: "5" })],
    });

    expect(await screen.findByText(/Total\s*:/i)).toHaveTextContent("Total : $15.00");
  });
});

describe("Payment flow (EP: success/failure, BVA: disabled/enabled boundaries)", () => {
  test("BVA: Make Payment button disabled when no address", async () => {
    mockDropinInstance = { requestPaymentMethod: jest.fn() };

    await setup({
      auth: { user: { name: "Ray", address: "" }, token: "t" },
      cart: [product()],
      clientToken: "ct",
      axiosTokenSuccess: true,
    });

    const btn = await screen.findByRole("button", { name: /Make Payment/i });
    expect(btn).toBeDisabled();
  });

  test("EP: successful payment -> posts nonce+cart, clears cart, navigates, toast success", async () => {
    const setCart = jest.fn();
    mockDropinInstance = {
      requestPaymentMethod: jest.fn().mockResolvedValue({ nonce: "n1" }),
    };
    axios.post.mockResolvedValueOnce({ data: { ok: true } });

    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product({ _id: "p1", price: 10 })],
      setCart,
      clientToken: "ct",
      axiosTokenSuccess: true,
    });

    const btn = await screen.findByRole("button", { name: /Make Payment/i });
    expect(btn).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(mockDropinInstance.requestPaymentMethod).toHaveBeenCalled();
    expect(axios.post).toHaveBeenCalledWith("/api/v1/product/braintree/payment", {
      nonce: "n1",
      cart: [expect.objectContaining({ _id: "p1" })],
    });

    expect(window.localStorage.removeItem).toHaveBeenCalledWith("cart");
    expect(setCart).toHaveBeenCalledWith([]);
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
    expect(toast.success).toHaveBeenCalledWith("Payment Completed Successfully ");
  });

  test("EP: payment failure -> logs error, does NOT clear cart/navigate", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const setCart = jest.fn();

    mockDropinInstance = {
      requestPaymentMethod: jest.fn().mockRejectedValue(new Error("nonce fail")),
    };

    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product()],
      setCart,
      clientToken: "ct",
      axiosTokenSuccess: true,
    });

    const btn = await screen.findByRole("button", { name: /Make Payment/i });

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(logSpy).toHaveBeenCalled();
    expect(window.localStorage.removeItem).not.toHaveBeenCalledWith("cart");
    expect(setCart).not.toHaveBeenCalledWith([]);
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard/user/orders");

    logSpy.mockRestore();
  });
});
