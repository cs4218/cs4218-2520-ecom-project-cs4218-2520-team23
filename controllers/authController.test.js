// controllers/authController.test.js
import { jest } from "@jest/globals";

// ---------- Mock fns ----------
const mockUserFindById = jest.fn();
const mockUserFindByIdAndUpdate = jest.fn();

const mockOrderFind = jest.fn();
const mockOrderFindByIdAndUpdate = jest.fn();

const mockComparePassword = jest.fn();
const mockHashPassword = jest.fn();

// ---------- Module mocks ----------
jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: mockUserFindById,
    findByIdAndUpdate: mockUserFindByIdAndUpdate,
  },
}));

jest.mock("../models/orderModel.js", () => ({
  __esModule: true,
  default: {
    find: mockOrderFind,
    findByIdAndUpdate: mockOrderFindByIdAndUpdate,
  },
}));

jest.mock("./../helpers/authHelper.js", () => ({
  __esModule: true,
  comparePassword: mockComparePassword,
  hashPassword: mockHashPassword,
}));

// ---------- Load SUT AFTER mocks ----------
const {
  updateProfileController,
  getOrdersController,
  getAllOrdersController,
  orderStatusController,
} = require("./authController.js");

// ---------- Helpers ----------
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeThenableQuery(resolvedValue) {
  // Supports: await orderModel.find(...).populate(...).populate(...).sort(...)
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    then: (onFulfilled, onRejected) =>
      Promise.resolve(resolvedValue).then(onFulfilled, onRejected),
  };
}

// ---------- Global hooks ----------
const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});

afterAll(() => {
  consoleSpy.mockRestore();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ===================== Tests =====================

describe("controllers/authController.js (selected unit tests)", () => {
  describe("updateProfileController", () => {
    // Liu Shixin, A0265144H
    test("returns json error when password length < 6 (boundary) and does not update/hash", async () => {
      // Arrange
      const req = { body: { password: "12345" }, user: { _id: "u1" } };
      const res = makeRes();

      // NOTE: controller calls findById before password check
      mockUserFindById.mockResolvedValue({
        _id: "u1",
        name: "Old",
        password: "oldhash",
        phone: "9",
        address: "addr",
      });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith({
        error: "Passsword is required and 6 character long",
      });
      expect(mockUserFindById).toHaveBeenCalledWith("u1");
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("updates profile without hashing when password is not provided", async () => {
      // Arrange
      const req = {
        body: { name: "NewName", phone: "111", address: "NewAddr" },
        user: { _id: "u1" },
      };
      const res = makeRes();

      const existing = {
        _id: "u1",
        name: "OldName",
        password: "oldhash",
        phone: "999",
        address: "OldAddr",
      };
      const updated = { _id: "u1", name: "NewName" };

      mockUserFindById.mockResolvedValue(existing);
      mockUserFindByIdAndUpdate.mockResolvedValue(updated);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(mockHashPassword).not.toHaveBeenCalled();
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        {
          name: "NewName",
          password: "oldhash",
          phone: "111",
          address: "NewAddr",
        },
        { new: true }
      );

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Profile Updated Successfully",
        updatedUser: updated,
      });
    });

    // Liu Shixin, A0265144H
    test("hashes password when provided and length >= 6, then updates password", async () => {
      // Arrange
      const req = { body: { password: "123456" }, user: { _id: "u1" } };
      const res = makeRes();

      mockUserFindById.mockResolvedValue({
        _id: "u1",
        name: "OldName",
        password: "oldhash",
        phone: "9",
        address: "addr",
      });
      mockHashPassword.mockResolvedValue("newhash");
      mockUserFindByIdAndUpdate.mockResolvedValue({ _id: "u1" });

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(mockHashPassword).toHaveBeenCalledWith("123456");
      expect(mockUserFindByIdAndUpdate).toHaveBeenCalledWith(
        "u1",
        expect.objectContaining({ password: "newhash" }),
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
    });

    // Liu Shixin, A0265144H
    test("error path: if findById rejects -> responds 400", async () => {
      // Arrange
      const req = { body: {}, user: { _id: "u1" } };
      const res = makeRes();

      const err = new Error("boom");
      mockUserFindById.mockRejectedValue(err);

      // Act
      await updateProfileController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Update profile",
          error: err,
        })
      );
    });
  });
  describe("getOrdersController", () => {
    // Liu Shixin, A0265144H
    test("returns orders for buyer and populates products + buyer", async () => {
      // Arrange
      const req = { user: { _id: "buyer1" } };
      const res = makeRes();

      const orders = [{ _id: "o1" }, { _id: "o2" }];
      const q = makeThenableQuery(orders);
      mockOrderFind.mockReturnValue(q);

      // Act
      await getOrdersController(req, res);

      // Assert
      expect(mockOrderFind).toHaveBeenCalledWith({ buyer: "buyer1" });
      expect(q.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
      expect(q.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    // Liu Shixin, A0265144H
    test("error path: if find throws -> responds 500", async () => {
      // Arrange
      const req = { user: { _id: "buyer1" } };
      const res = makeRes();

      const err = new Error("boom");
      mockOrderFind.mockImplementation(() => {
        throw err;
      });

      // Act
      await getOrdersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Geting Orders",
          error: err,
        })
      );
    });
  });

  describe("getAllOrdersController", () => {
    // Liu Shixin, A0265144H
    test('returns all orders and sorts by createdAt "-1"', async () => {
      // Arrange
      const req = {};
      const res = makeRes();

      const orders = [{ _id: "o1" }];
      const q = makeThenableQuery(orders);
      mockOrderFind.mockReturnValue(q);

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(mockOrderFind).toHaveBeenCalledWith({});
      expect(q.populate).toHaveBeenNthCalledWith(1, "products", "-photo");
      expect(q.populate).toHaveBeenNthCalledWith(2, "buyer", "name");
      expect(q.sort).toHaveBeenCalledWith({ createdAt: "-1" });
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    // Liu Shixin, A0265144H
    test("error path: if find throws -> responds 500", async () => {
      // Arrange
      const req = {};
      const res = makeRes();

      const err = new Error("boom");
      mockOrderFind.mockImplementation(() => {
        throw err;
      });

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error WHile Geting Orders",
          error: err,
        })
      );
    });
  });

  describe("orderStatusController", () => {
    // Liu Shixin, A0265144H
    test("updates order status and returns updated order", async () => {
      // Arrange
      const req = { params: { orderId: "o1" }, body: { status: "Delivered" } };
      const res = makeRes();

      const updated = { _id: "o1", status: "Delivered" };
      mockOrderFindByIdAndUpdate.mockResolvedValue(updated);

      // Act
      await orderStatusController(req, res);

      // Assert
      expect(mockOrderFindByIdAndUpdate).toHaveBeenCalledWith(
        "o1",
        { status: "Delivered" },
        { new: true }
      );
      expect(res.json).toHaveBeenCalledWith(updated);
    });

    // Liu Shixin, A0265144H
    test("error path: if findByIdAndUpdate rejects -> responds 500", async () => {
      // Arrange
      const req = { params: { orderId: "o1" }, body: { status: "Delivered" } };
      const res = makeRes();

      const err = new Error("boom");
      mockOrderFindByIdAndUpdate.mockRejectedValue(err);

      // Act
      await orderStatusController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Updateing Order",
          error: err,
        })
      );
    });
  });
});
