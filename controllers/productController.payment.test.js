import { jest, describe, test, expect, beforeEach } from "@jest/globals";

const flushPromises = () => new Promise((r) => setImmediate(r));

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => { res.headersSent = true; return res; });
  res.json = jest.fn(() => { res.headersSent = true; return res; });
  return res;
}

describe("payment controllers unit tests (Jest, ESM)", () => {
  let braintreeTokenController;
  let brainTreePaymentController;

  let gatewayMock;
  let OrderModelMock;
  let OrderSaveMock;

  beforeEach(async () => {
    jest.resetModules();
    jest.clearAllMocks();

    OrderSaveMock = jest.fn().mockResolvedValue({ _id: "order123" });
    OrderModelMock = jest.fn().mockImplementation(() => ({ save: OrderSaveMock }));

    gatewayMock = {
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    };

    await jest.unstable_mockModule("dotenv", () => ({ default: { config: jest.fn() } }));

    await jest.unstable_mockModule("../models/productModel.js", () => ({ default: {} }));
    await jest.unstable_mockModule("../models/categoryModel.js", () => ({ default: {} }));
    await jest.unstable_mockModule("../models/orderModel.js", () => ({ default: OrderModelMock }));

    await jest.unstable_mockModule("braintree", () => ({
      default: {
        Environment: { Sandbox: "SANDBOX_ENV" },
        BraintreeGateway: jest.fn(() => gatewayMock),
      },
      Environment: { Sandbox: "SANDBOX_ENV" },
      BraintreeGateway: jest.fn(() => gatewayMock),
    }));

    const mod = await import("../controllers/productController.js");
    braintreeTokenController = mod.braintreeTokenController;
    brainTreePaymentController = mod.brainTreePaymentController;
  });

  describe("braintreeTokenController", () => {
    test("EP: generate err => 500 + send(err)", async () => {
      const req = {};
      const res = makeRes();

      const err = new Error("token err");
      gatewayMock.clientToken.generate.mockImplementation((_opts, cb) => cb(err, null));

      await braintreeTokenController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(err);
    });

    test("EP: generate success => send(response)", async () => {
      const req = {};
      const res = makeRes();

      const response = { clientToken: "abc123" };
      gatewayMock.clientToken.generate.mockImplementation((_opts, cb) => cb(null, response));

      await braintreeTokenController(req, res);

      expect(res.send).toHaveBeenCalledWith(response);
      expect(res.status).not.toHaveBeenCalledWith(500);
    });

    test("Robustness: sync throw => respond 500", async () => {
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
    test("BVA: empty cart => amount '0.00'; success => ok true + order created", async () => {
      const req = { body: { nonce: "n1", cart: [] }, user: { _id: "u1" } };
      const res = makeRes();

      gatewayMock.transaction.sale.mockImplementation((payload, cb) => {
        // amount is a string because controller uses toFixed(2)
        expect(payload.amount).toBe("0.00");
        cb(null, { success: true, id: "t1" });
      });

      await brainTreePaymentController(req, res);
      await flushPromises();

      expect(gatewayMock.transaction.sale).toHaveBeenCalledTimes(1);
      expect(OrderModelMock).toHaveBeenCalledTimes(1);
      expect(OrderModelMock).toHaveBeenCalledWith({
        products: [],
        payment: expect.any(Object),
        buyer: "u1",
      });
      expect(OrderSaveMock).toHaveBeenCalledTimes(1);
      expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test("EP: multi-item cart => amount '30.50'; success => ok true", async () => {
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

    test("EP: sale callback error + no result => 500 + send(err) + no order", async () => {
      const req = { body: { nonce: "n3", cart: [{ price: 10 }] }, user: { _id: "u3" } };
      const res = makeRes();

      const err = new Error("network");
      gatewayMock.transaction.sale.mockImplementation((_payload, cb) => cb(err, null));

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(err);
      expect(OrderModelMock).not.toHaveBeenCalled();
    });

    test("EP: result.success=false => 500 + send(message) + no order", async () => {
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

    test("Validation: missing req.user => 401", async () => {
      const req = { body: { nonce: "n5", cart: [{ price: 10 }] }, user: undefined };
      const res = makeRes();

      await brainTreePaymentController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ error: "Unauthorized" });
      expect(gatewayMock.transaction.sale).not.toHaveBeenCalled();
    });
    test("Robustness: braintree callback called twice => respond once", async () => {
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
  });
});
