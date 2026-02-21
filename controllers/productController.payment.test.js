/**
 * Test written by Ng Hong Ray, A0253509A
 *
 * external dependencies (Braintree gateway, Order model, dotenv) are mocked
 * to ensure only controller logic, validation, and side-effects are tested.
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning (EP)
 * - Token generation: success vs callback error vs sync throw
 * - Payment: success vs gateway error vs result.success = false
 * - Validation: missing nonce, invalid cart type, invalid item price
 * - Authorization: missing req.user
 *
 * 2. Boundary Value Analysis (BVA)
 * - Cart: empty (rejected) vs multi-item cart
 * - Price validation: NaN and negative values
 *
 * 3. Validation Testing
 * - Tests explicitly cover validation logic for missing/invalid data
 * - This is written to improve branch coverage and
 *
 * Focus: Validation logic, payment flow correctness, error handling,
 * and prevention of double responses.
 */

const { describe, test, expect, beforeEach } = require("@jest/globals");

const flushPromises = () => new Promise((r) => setImmediate(r));

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => {
    res.headersSent = true;
    return res;
  });
  res.json = jest.fn(() => {
    res.headersSent = true;
    return res;
  });
  return res;
}

describe("Product Payment Controllers: ", () => {
  let braintreeTokenController;
  let brainTreePaymentController;

  let gatewayMock;
  let OrderModelMock;
  let OrderSaveMock;

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    OrderSaveMock = jest.fn().mockResolvedValue({ _id: "order123" });
    OrderModelMock = jest.fn().mockImplementation(() => ({ save: OrderSaveMock }));

    gatewayMock = {
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    };

    // CommonJS-safe mocks (must happen before requiring the module under test)
    jest.doMock("dotenv", () => ({ config: jest.fn() }));

    jest.doMock("../models/productModel.js", () => ({}));
    jest.doMock("../models/categoryModel.js", () => ({}));
    jest.doMock("../models/orderModel.js", () => OrderModelMock);

    jest.doMock("braintree", () => ({
      Environment: { Sandbox: "SANDBOX_ENV" },
      BraintreeGateway: jest.fn(() => gatewayMock),
      default: {
        Environment: { Sandbox: "SANDBOX_ENV" },
        BraintreeGateway: jest.fn(() => gatewayMock),
      },
    }));

    // Load controllers AFTER mocks
    const mod = require("../controllers/productController.js");
    braintreeTokenController = mod.braintreeTokenController;
    brainTreePaymentController = mod.brainTreePaymentController;
  });

  describe("braintreeTokenController", () => {
    // Equivalence Partitioning
    test("generate err => 500 + send(err)", async () => {
      const req = {};
      const res = makeRes();

      const err = new Error("token err");
      gatewayMock.clientToken.generate.mockImplementation((_opts, cb) => cb(err, null));

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(err);
    });

    // Equivalence Partitioning
    test("generate success => send(response)", async () => {
      const req = {};
      const res = makeRes();

      const response = { clientToken: "abc123" };
      gatewayMock.clientToken.generate.mockImplementation((_opts, cb) => cb(null, response));

      await braintreeTokenController(req, res);

      expect(res.send).toHaveBeenCalledWith(response);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    test("Sync throw => respond 500", async () => {
      const req = {};
      const res = makeRes();

      gatewayMock.clientToken.generate.mockImplementation(() => {
        throw new Error("sync throw");
      });

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Braintree token generation failed" });
    });
  });

  describe("brainTreePaymentController", () => {
    // Boundary Value Analysis + Equivalence Partitioning
    test("empty cart -> 400 (Cart cannot be empty) + no sale + no order", async () => {
      const req = { body: { nonce: "n1", cart: [] }, user: { _id: "u1" } };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Cart cannot be empty" });

      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
      expect(OrderModelMock).not.toHaveBeenCalled();
      expect(OrderSaveMock).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    // Equivalence Partitioning + Boundary Value Analysis
    test("multi-item cart => amount '30.50'; success => ok true", async () => {
      const req = {
        body: { nonce: "n2", cart: [{ price: 10 }, { price: 20 }, { price: 0.5 }] },
        user: { _id: "u2" },
      };
      const res = makeRes();

      gatewayMock.transaction.sale.mockImplementation((payload, cb) => {
        expect(payload.amount).toBe("30.50");
        expect(Number(payload.amount)).toBeCloseTo(30.5);
        cb(null, { success: true, id: "t2" });
      });

      await brainTreePaymentController(req, res);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    // Equivalence Partitioning
    test("sale callback error + no result => 500 + send(err) + no order", async () => {
      const req = { body: { nonce: "n3", cart: [{ price: 10 }] }, user: { _id: "u3" } };
      const res = makeRes();

      const err = new Error("network");
      gatewayMock.transaction.sale.mockImplementation((_payload, cb) => cb(err, null));

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(err);
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    // Equivalence Partitioning
    test("result.success=false => 500 + send(message) + no order", async () => {
      const req = { body: { nonce: "n4", cart: [{ price: 10 }] }, user: { _id: "u4" } };
      const res = makeRes();

      gatewayMock.transaction.sale.mockImplementation((_payload, cb) => {
        cb(null, { success: false, message: "declined" });
      });

      await brainTreePaymentController(req, res);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith("declined");
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("missing req.user => 401", async () => {
      const req = { body: { nonce: "n5", cart: [{ price: 10 }] }, user: undefined };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
    });

    test("braintree callback called twice => respond once", async () => {
      const req = { body: { nonce: "n6", cart: [{ price: 10 }] }, user: { _id: "u6" } };
      const res = makeRes();

      gatewayMock.transaction.sale.mockImplementation((_payload, cb) => {
        cb(null, { success: true, id: "t6" });
        cb(null, { success: true, id: "t6_dup" }); // second call
      });

      await brainTreePaymentController(req, res);
      await flushPromises();

      expect(res.json).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("missing nonce -> 400", async () => {
      const req = { body: { cart: [{ price: 10 }] }, user: { _id: "u7" } }; // nonce missing
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Missing payment nonce" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("cart not array -> 400", async () => {
      const req = { body: { nonce: "n8", cart: "not-an-array" }, user: { _id: "u8" } };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Cart must be an array" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("invalid item price (NaN) -> 400", async () => {
      const req = {
        body: { nonce: "n9", cart: [{ price: "abc" }] }, // Number("abc") => NaN
        user: { _id: "u9" },
      };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Invalid item price in cart" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("invalid item price (negative) -> 400", async () => {
      const req = {
        body: { nonce: "n10", cart: [{ price: -1 }] },
        user: { _id: "u10" },
      };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ error: "Invalid item price in cart" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("Error-path: order save throws inside sale callback -> 500 Order creation failed", async () => {
      // override for this test only
      OrderSaveMock.mockRejectedValueOnce(new Error("save fail"));

      const req = {
        body: { nonce: "n11", cart: [{ price: 10 }] },
        user: { _id: "u11" },
      };
      const res = makeRes();

      gatewayMock.transaction.sale.mockImplementation((_payload, cb) => {
        cb(null, { success: true, id: "t11" }); // payment succeeded, order save fails
      });

      await brainTreePaymentController(req, res);
      await flushPromises();

      expect(OrderModelMock).toHaveBeenCalledTimes(1);
      expect(OrderSaveMock).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Order creation failed" });
      expect(res.json).not.toHaveBeenCalledWith({ ok: true });
    });
  });
});
