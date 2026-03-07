// Dong Cheng-Yu, A0262348B
//
// Bottom-up integration tests for CartPage.
// CartProvider and AuthProvider (unit-tested in MS1) form the base layer and are used real.
// CartPage is integrated on top, verifying that context state, localStorage sync, and renders
// work correctly together across guest/auth views, DropIn visibility, item removal, and payment.
// External boundaries stubbed: axios, braintree DropIn, react-hot-toast, useNavigate.

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

import CartPage from "./CartPage";
import { AuthProvider } from "../context/auth";
import { CartProvider } from "../context/cart";
import { SearchProvider } from "../context/search";

jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => {
  const actual = jest.requireActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockDropInInstance = null;
jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  const DropInWidget = ({ onInstance }) => {
    React.useEffect(() => {
      if (onInstance && mockDropInInstance) {
        onInstance(mockDropInInstance);
      }
    }, [onInstance]);
    return <div data-testid="dropin-widget">DropIn</div>;
  };
  return {
    __esModule: true,
    default: DropInWidget,
  };
});

const makeProduct = (overrides = {}) => ({
  _id: "prod-1",
  name: "Test Product",
  description: "A detailed description that exceeds thirty characters easily",
  price: 29.99,
  ...overrides,
});

function seedLocalStorage({ auth = null, cart = [] } = {}) {
  if (auth) {
    localStorage.setItem("auth", JSON.stringify(auth));
  }
  if (cart.length) {
    localStorage.setItem("cart", JSON.stringify(cart));
  }
}

function mockAxios({
  clientToken = "braintree-client-token",
  tokenSuccess = true,
  paymentSuccess = true,
} = {}) {
  axios.get.mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/token") {
      return tokenSuccess
        ? Promise.resolve({ data: { clientToken } })
        : Promise.reject(new Error("token-fetch-failed"));
    }
    if (url === "/api/v1/category/get-category") {
      return Promise.resolve({ data: { category: [] } });
    }
    return Promise.reject(new Error(`Unhandled GET: ${url}`));
  });

  axios.post.mockImplementation((url) => {
    if (url === "/api/v1/product/braintree/payment") {
      return paymentSuccess
        ? Promise.resolve({ data: { ok: true } })
        : Promise.reject(new Error("payment-failed"));
    }
    return Promise.reject(new Error(`Unhandled POST: ${url}`));
  });
}

function renderCartPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <SearchProvider>
          <CartProvider>
            <CartPage />
          </CartProvider>
        </SearchProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  mockDropInInstance = null;
  mockNavigate.mockReset();
});

describe("Integration - Guest user view", () => {
  test("shows 'Hello Guest' and login-to-checkout button when no auth in localStorage", async () => {
    mockAxios({ tokenSuccess: false });
    renderCartPage();

    expect(await screen.findByText(/Hello Guest/i)).toBeInTheDocument();
    expect(screen.getByText(/Your Cart Is Empty/i)).toBeInTheDocument();
  });

  test("guest with cart items sees login prompt, not payment widget", async () => {
    seedLocalStorage({ cart: [makeProduct()] });
    mockAxios({ tokenSuccess: false });

    renderCartPage();

    const loginBtn = await screen.findByRole("button", {
      name: /Please Login to checkout/i,
    });
    expect(loginBtn).toBeInTheDocument();
    expect(screen.queryByTestId("dropin-widget")).not.toBeInTheDocument();
  });

  test("clicking login-to-checkout navigates to /login with cart state", async () => {
    seedLocalStorage({ cart: [makeProduct()] });
    mockAxios({ tokenSuccess: false });

    renderCartPage();

    const loginBtn = await screen.findByRole("button", {
      name: /Please Login to checkout/i,
    });
    fireEvent.click(loginBtn);

    expect(mockNavigate).toHaveBeenCalledWith("/login", { state: "/cart" });
  });
});

describe("Integration - Authenticated user view", () => {
  test("shows user's name in greeting when auth is seeded in localStorage", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Alice", address: "123 Main St" },
        token: "valid-jwt-token",
      },
    });
    mockAxios();

    renderCartPage();

    expect(await screen.findByText(/Hello\s+Alice/i)).toBeInTheDocument();
  });

  test("renders cart items with correct image URL, truncated description, and price", async () => {
    const product = makeProduct({
      _id: "abc-123",
      name: "Fancy Gadget",
      description: "A very long description that should be cut after 30 chars",
      price: 49.99,
    });

    seedLocalStorage({
      auth: {
        user: { name: "Bob", address: "456 Elm St" },
        token: "valid-jwt-token",
      },
      cart: [product],
    });
    mockAxios();

    renderCartPage();

    const img = await screen.findByRole("img", { name: /Fancy Gadget/i });
    expect(img).toHaveAttribute("src", "/api/v1/product/product-photo/abc-123");
    expect(
      screen.getByText("A very long description that s"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Price\s*:\s*49\.99/i)).toBeInTheDocument();
  });

  test("correctly computes and displays USD total for multiple cart items", async () => {
    const items = [
      makeProduct({ _id: "p1", price: 10.0 }),
      makeProduct({ _id: "p2", price: 25.5 }),
      makeProduct({ _id: "p3", price: 4.5 }),
    ];

    seedLocalStorage({
      auth: {
        user: { name: "Carol", address: "789 Oak Ave" },
        token: "valid-jwt-token",
      },
      cart: items,
    });
    mockAxios();

    renderCartPage();

    expect(
      await screen.findByText(/Total\s*:\s*\$40\.00/i),
    ).toBeInTheDocument();
  });

  test("shows correct cart item count for authenticated user", async () => {
    const items = [
      makeProduct({ _id: "p1" }),
      makeProduct({ _id: "p2", name: "Second Item" }),
    ];

    seedLocalStorage({
      auth: {
        user: { name: "Dave", address: "" },
        token: "valid-jwt-token",
      },
      cart: items,
    });
    mockAxios();

    renderCartPage();

    expect(
      await screen.findByText(/You Have 2 items in your cart/i),
    ).toBeInTheDocument();
  });
});

describe("Integration - DropIn and Make Payment visibility", () => {
  test("DropIn is NOT rendered when cart is empty despite valid token and auth", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Eve", address: "1 St" },
        token: "valid-jwt-token",
      },
    });
    mockAxios({ clientToken: "ct-xyz" });

    renderCartPage();

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith("/api/v1/product/braintree/token"),
    );

    expect(screen.queryByTestId("dropin-widget")).not.toBeInTheDocument();
  });

  test("DropIn is NOT rendered when braintree token fetch fails", async () => {
    seedLocalStorage({
      auth: {
        user: { name: "Frank", address: "2 St" },
        token: "valid-jwt-token",
      },
      cart: [makeProduct()],
    });
    mockAxios({ tokenSuccess: false });

    renderCartPage();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());

    expect(screen.queryByTestId("dropin-widget")).not.toBeInTheDocument();
  });

  test("DropIn appears when clientToken, auth.token, and cart items all present", async () => {
    mockDropInInstance = { requestPaymentMethod: jest.fn() };

    seedLocalStorage({
      auth: {
        user: { name: "Grace", address: "3 St" },
        token: "valid-jwt-token",
      },
      cart: [makeProduct()],
    });
    mockAxios({ clientToken: "ct-abc" });

    renderCartPage();

    expect(await screen.findByTestId("dropin-widget")).toBeInTheDocument();
    expect(
      await screen.findByRole("button", { name: /Make Payment/i }),
    ).toBeInTheDocument();
  });

  test("Make Payment button is disabled when user has no address", async () => {
    mockDropInInstance = { requestPaymentMethod: jest.fn() };

    seedLocalStorage({
      auth: {
        user: { name: "Hank", address: "" },
        token: "valid-jwt-token",
      },
      cart: [makeProduct()],
    });
    mockAxios({ clientToken: "ct-abc" });

    renderCartPage();

    const payBtn = await screen.findByRole("button", { name: /Make Payment/i });
    expect(payBtn).toBeDisabled();
  });
});

describe("Integration - Removing an item updates CartContext and localStorage", () => {
  test("removing one item from a two-item cart updates localStorage and re-renders", async () => {
    const item1 = makeProduct({ _id: "id-1", name: "Item One" });
    const item2 = makeProduct({ _id: "id-2", name: "Item Two" });

    seedLocalStorage({
      auth: {
        user: { name: "Ivy", address: "4 St" },
        token: "valid-jwt-token",
      },
      cart: [item1, item2],
    });
    mockAxios();

    renderCartPage();

    expect(await screen.findByText("Item One")).toBeInTheDocument();
    expect(screen.getByText("Item Two")).toBeInTheDocument();

    const removeButtons = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeButtons[0]);

    await waitFor(() =>
      expect(screen.queryByText("Item One")).not.toBeInTheDocument(),
    );

    expect(screen.getByText("Item Two")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("cart") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]._id).toBe("id-2");
  });

  test("removing last item empties the cart and shows empty-cart message", async () => {
    const item = makeProduct({ _id: "only-1", name: "Only Item" });

    seedLocalStorage({
      auth: {
        user: { name: "Jack", address: "5 St" },
        token: "valid-jwt-token",
      },
      cart: [item],
    });
    mockAxios();

    renderCartPage();

    await screen.findByText("Only Item");
    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));

    expect(await screen.findByText(/Your Cart Is Empty/i)).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("cart") ?? "[]");
    expect(stored).toHaveLength(0);
  });

  test("total price updates after an item is removed", async () => {
    const item1 = makeProduct({ _id: "t1", price: 10.0 });
    const item2 = makeProduct({ _id: "t2", price: 20.0 });

    seedLocalStorage({
      auth: {
        user: { name: "Kelly", address: "6 St" },
        token: "valid-jwt-token",
      },
      cart: [item1, item2],
    });
    mockAxios();

    renderCartPage();

    expect(
      await screen.findByText(/Total\s*:\s*\$30\.00/i),
    ).toBeInTheDocument();

    const removeBtns = screen.getAllByRole("button", { name: /Remove/i });
    fireEvent.click(removeBtns[0]);

    expect(
      await screen.findByText(/Total\s*:\s*\$20\.00/i),
    ).toBeInTheDocument();
  });
});

describe("Integration - Successful payment clears cart and navigates", () => {
  test("successful payment clears CartContext, removes localStorage cart, and navigates", async () => {
    const nonce = "payment-nonce-xyz";
    mockDropInInstance = {
      requestPaymentMethod: jest.fn().mockResolvedValue({ nonce }),
    };

    const item = makeProduct({ _id: "pay-1", price: 99.0 });

    seedLocalStorage({
      auth: {
        user: { name: "Leo", address: "7 St" },
        token: "valid-jwt-token",
      },
      cart: [item],
    });
    mockAxios({ clientToken: "ct-payment", paymentSuccess: true });

    renderCartPage();

    await screen.findByTestId("dropin-widget");

    const payBtn = await screen.findByRole("button", { name: /Make Payment/i });
    await waitFor(() => expect(payBtn).not.toBeDisabled());

    fireEvent.click(payBtn);

    await waitFor(() =>
      expect(mockDropInInstance.requestPaymentMethod).toHaveBeenCalled(),
    );

    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        { nonce, cart: [expect.objectContaining({ _id: "pay-1" })] },
      ),
    );

    expect(await screen.findByText(/Your Cart Is Empty/i)).toBeInTheDocument();
    expect(localStorage.getItem("cart")).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith("/dashboard/user/orders");
  });

  test("failed payment does NOT clear cart or navigate away", async () => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    mockDropInInstance = {
      requestPaymentMethod: jest
        .fn()
        .mockRejectedValue(new Error("payment-error")),
    };

    const item = makeProduct({ _id: "fail-1", price: 50.0 });

    seedLocalStorage({
      auth: {
        user: { name: "Mia", address: "8 St" },
        token: "valid-jwt-token",
      },
      cart: [item],
    });
    mockAxios({ clientToken: "ct-fail", paymentSuccess: false });

    renderCartPage();

    await screen.findByTestId("dropin-widget");
    const payBtn = await screen.findByRole("button", { name: /Make Payment/i });
    await waitFor(() => expect(payBtn).not.toBeDisabled());

    fireEvent.click(payBtn);

    expect(await screen.findByText("Test Product")).toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("cart") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(mockNavigate).not.toHaveBeenCalledWith("/dashboard/user/orders");
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
