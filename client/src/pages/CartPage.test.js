/**
 * Test written by Ng Hong Ray, A0253509A 
 * I am using UI return tests here since the component is mostly UI with some side effects (fetching token, making payment).
 * I have also added some bug-detection tests for total price calculation, which is a critical part of the payment flow.
 * Testing Principles Applied:
 * 
 * 1. Equivalence Partitioning 
 * - Cart: Empty vs Non-empty
 * - Address: Present vs Absent
 * 
 * 2. Boundary Value Analysis
 * - Cart size: 0 vs 1 vs many
 * - Total price: empty cart ($0.00) vs non-empty cart (sum of prices)
 * 
 * 3. Bug Detection Tests
 * - Total price calculation should handle string prices (common bug if not converted to Number)
 * 
 * 4. State & Behaviour Testing
 * - Remove item: clicking Remove should update state and localStorage correctly
 * 
 * 5. Side-Effect / Interaction Testing
 * - getToken should fetch client token and handle success/failure
 * - Make Payment should call payment API and handle success/failure
 * 
 * Tests that are not really needed in MS1, but good to have:
 * 1. UI tests for conditional rendering based on auth/cart state (can be removed if too much load)
 * 2. More granular unit tests for helper functions (e.g. totalPrice) if they are extracted out of the component
**/

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

// Layout: render children only
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
  await act(async () => { });

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

// UI test can be removed if too much load
describe("CartPage rendering (EP: auth/cart partitions)", () => {
  // Equivalence Partitioning & Boundary Value Analysis
  test("Guest + empty cart -> shows Guest greeting and 'Cart Is Empty'", async () => {
    await setup({ auth: { user: null, token: null }, cart: [] });

    expect(await screen.findByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();

    // BVA: cart length = 0 => should NOT render DropIn/payment section
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });
  // Equivalence Partitioning & Boundary Value Analysis
  test("Logged in + non-empty cart -> shows user name and item count", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "Sembawang" }, token: "t" },
      cart: [product(), product({ _id: "p2" })],
    });

    expect(await screen.findByText(/Hello\s+Ray/i)).toBeInTheDocument();
    expect(screen.getByText(/You Have 2 items in your cart/i)).toBeInTheDocument();
  });
  // Equivalence Partitioning
  test("Logged in but no address -> shows Update Address button", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "" }, token: "t" },
      cart: [product()],
    });

    const btn = await screen.findByRole("button", { name: /Update Address/i });
    expect(btn).toBeInTheDocument();
  });
  // Equivalence Partitioning
  test("Not logged in -> shows 'Please Login to checkout' button and navigates to /login with state=/cart", async () => {
    await setup({ auth: { user: null, token: null }, cart: [product()] });

    const btn = await screen.findByRole("button", {
      name: /Plase Login to checkout/i,
    });
    fireEvent.click(btn);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });
});

describe("getToken: Token fetching", () => {
  // Equivalence Partitioning
  test("successful token fetch -> payment UI can appear when logged in + cart not empty", async () => {
    mockDropinInstance = { requestPaymentMethod: jest.fn() };

    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product()],
      clientToken: "ct",
      axiosTokenSuccess: true,
    });

    expect(await screen.findByTestId("dropin")).toBeInTheDocument();
  });
  // Equivalence Partitioning
  test("token fetch failure -> DropIn should NOT appear", async () => {
    await setup({
      auth: { user: { name: "Ray", address: "SG" }, token: "t" },
      cart: [product()],
      axiosTokenSuccess: false,
    });

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
    expect(screen.queryByTestId("dropin")).not.toBeInTheDocument();
  });
});

describe("removeCartItem: Cart listing + remove item", () => {
  // Boundary Value Analysis
  test("cart size 1 -> renders one item card and correct photo URL", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [product({ _id: "abc" })],
    });

    const img = await screen.findByRole("img", { name: /Product 1/i });
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/abc");
  });
  // Equivalence Partitioning
  test("clicking Remove removes the correct item, updates state + localStorage", async () => {
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

describe("totalPrice: correctness", () => {
  // boundary value analysis
  test("total for empty cart should show $0.00", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [],
    });

    expect(await screen.findByText(/Total\s*:/i)).toHaveTextContent("Total : $0.00");
  });

  test("string input prices should not sum numerically", async () => {
    await setup({
      auth: { user: { name: "Ray" }, token: "t" },
      cart: [product({ price: "10" }), product({ _id: "p2", price: "5" })],
    });

    expect(await screen.findByText(/Total\s*:/i)).toHaveTextContent("Total : $15.00");
  });
});

describe("handlePaymet: Payment flow", () => {
  // Equivalence Partitioning
  test("successful payment -> posts nonce+cart, clears cart, navigates, toast success", async () => {
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

  // Equivalence Partitioning
  test("payment failure -> logs error, does NOT clear cart/navigate", async () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation(() => { });
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
