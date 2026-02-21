// controllers/productController.test.js
import { jest } from "@jest/globals";

// ===================== Mock fns =====================
const mockProductSave = jest.fn();
const mockProductFindByIdAndDelete = jest.fn();
const mockProductFindByIdAndUpdate = jest.fn();

const mockReadFileSync = jest.fn();
const mockSlugify = jest.fn();

beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
});

// We only need the constructor + the specific static methods used by the 3 controllers
const mockProductModel = jest.fn(function (doc) {
  Object.assign(this, doc);
  this.photo = this.photo || { data: null, contentType: null };
  this.save = mockProductSave;
});
mockProductModel.findByIdAndDelete = mockProductFindByIdAndDelete;
mockProductModel.findByIdAndUpdate = mockProductFindByIdAndUpdate;

// ===================== Module mocks =====================
jest.mock("../models/productModel.js", () => ({
  __esModule: true,
  default: mockProductModel,
}));

jest.mock("fs", () => ({
  __esModule: true,
  default: { readFileSync: mockReadFileSync },
}));

jest.mock("slugify", () => ({
  __esModule: true,
  default: mockSlugify,
}));

jest.mock("dotenv", () => ({
  __esModule: true,
  default: { config: jest.fn() },
}));

jest.mock("braintree", () => ({
  __esModule: true,
  default: {
    Environment: { Sandbox: {} },
    BraintreeGateway: jest.fn(() => ({
      clientToken: { generate: jest.fn() },
      transaction: { sale: jest.fn() },
    })),
  },
}));

jest.mock("../models/categoryModel.js", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("../models/orderModel.js", () => ({ __esModule: true, default: {} }));

// ===================== Load SUT AFTER mocks =====================
const {
  createProductController,
  deleteProductController,
  updateProductController,
} = require("./productController.js");

// ===================== Helpers =====================
function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

function makeDeleteThenable() {
  // supports: await productModel.findByIdAndDelete(...).select("-photo")
  return {
    select: jest.fn(() => ({
      then: (onFulfilled, onRejected) =>
        Promise.resolve(true).then(onFulfilled, onRejected),
    })),
  };
}

// ===================== Hooks =====================
beforeEach(() => {
  jest.clearAllMocks();
});

// ===================== Tests =====================
describe("controllers/productController.js (selected unit tests)", () => {
  describe("createProductController", () => {
    // Liu Shixin, A0265144H
    test("validation: missing name -> 500 'Name is Required' and does not create/save", async () => {
      // Arrange
      const req = {
        fields: { description: "d", price: 1, category: "c", quantity: 1 },
        files: {},
      };
      const res = makeRes();

      // Act
      await createProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(mockProductModel).not.toHaveBeenCalled();
      expect(mockProductSave).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("validation: missing description -> 500 'Description is Required'", async () => {
      const req = {
        fields: { name: "n", price: 1, category: "c", quantity: 1 },
        files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "Description is Required",
      });
      expect(mockProductModel).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("validation: missing price -> 500 'Price is Required'", async () => {
      const req = {
        fields: { name: "n", description: "d", category: "c", quantity: 1 },
        files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Price is Required" });
      expect(mockProductModel).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("validation: missing category -> 500 'Category is Required'", async () => {
      const req = {
        fields: { name: "n", description: "d", price: 1, quantity: 1 },
        files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Category is Required" });
      expect(mockProductModel).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("validation: missing quantity -> 500 'Quantity is Required'", async () => {
      const req = {
        fields: { name: "n", description: "d", price: 1, category: "c" },
        files: {},
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Quantity is Required" });
      expect(mockProductModel).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("boundary: photo size 1,000,001 (>1MB) -> 500 photo error and does not save", async () => {
      // Arrange
      const req = {
        fields: {
          name: "n",
          description: "d",
          price: 1,
          category: "c",
          quantity: 1,
        },
        files: { photo: { size: 1000001 } },
      };
      const res = makeRes();

      // Act
      await createProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        error: "Photo should be less than 1MB",
      });
      expect(mockProductModel).not.toHaveBeenCalled();
      expect(mockProductSave).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("boundary: photo size exactly 1,000,000 (==1MB) is allowed; sets slug + reads photo + saves", async () => {
      // Arrange
      const req = {
        fields: {
          name: "My Product",
          description: "d",
          price: 10,
          category: "c",
          quantity: 2,
        },
        files: { photo: { size: 1000000, path: "/tmp/p", type: "image/png" } },
      };
      const res = makeRes();

      mockSlugify.mockReturnValue("my-product");
      mockReadFileSync.mockReturnValue(Buffer.from("img-bytes"));

      // Make save resolve with the created product doc
      const savedDoc = { _id: "p1" };
      mockProductSave.mockResolvedValue(savedDoc);

      // Act
      await createProductController(req, res);

      // Assert
      expect(mockSlugify).toHaveBeenCalledWith("My Product");
      expect(mockProductModel).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "My Product",
          description: "d",
          price: 10,
          category: "c",
          quantity: 2,
          slug: "my-product",
        })
      );

      expect(mockReadFileSync).toHaveBeenCalledWith("/tmp/p");
      expect(mockProductSave).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Created Successfully",
        products: savedDoc,
      });
    });

    // Liu Shixin, A0265144H
    test("validation: no photo provided -> 500 'Photo is Required' and does not save", async () => {
      const req = {
        fields: {
          name: "NoPhoto",
          description: "d",
          price: 10,
          category: "c",
          quantity: 2,
        },
        files: {}, // no photo
      };
      const res = makeRes();

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Photo is Required" });
      expect(mockProductSave).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("error path: save rejects -> responds 500 'Error in crearing product'", async () => {
      const req = {
        fields: {
          name: "n",
          description: "d",
          price: 10,
          category: "c",
          quantity: 2,
        },
        files: { photo: { size: 500000, path: "/tmp/p", type: "image/png" } }, // ← add a valid photo
      };
      const res = makeRes();

      mockSlugify.mockReturnValue("n");
      mockReadFileSync.mockReturnValue(Buffer.from("img"));
      mockProductSave.mockRejectedValue(new Error("boom")); // ← this now actually gets hit

      await createProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in crearing product",
        })
      );
    });
  });

  describe("deleteProductController", () => {
    // Liu Shixin, A0265144H
    test("success: deletes by pid, selects -photo, returns 200", async () => {
      // Arrange
      const req = { params: { pid: "p1" } };
      const res = makeRes();

      const q = makeDeleteThenable();
      mockProductFindByIdAndDelete.mockReturnValue(q);

      // Act
      await deleteProductController(req, res);

      // Assert
      expect(mockProductFindByIdAndDelete).toHaveBeenCalledWith("p1");
      expect(q.select).toHaveBeenCalledWith("-photo");

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Deleted successfully",
      });
    });

    // Liu Shixin, A0265144H
    test("error path: delete throws -> responds 500", async () => {
      // Arrange
      const req = { params: { pid: "p1" } };
      const res = makeRes();

      mockProductFindByIdAndDelete.mockImplementation(() => {
        throw new Error("boom");
      });

      // Act
      await deleteProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while deleting product",
        })
      );
    });
  });

  describe("updateProductController", () => {
    // Liu Shixin, A0265144H
    test("validation: missing name -> 500 'Name is Required' and does not update", async () => {
      // Arrange
      const req = {
        params: { pid: "p1" },
        fields: { description: "d", price: 1, category: "c", quantity: 1 },
        files: {},
      };
      const res = makeRes();

      // Act
      await updateProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({ error: "Name is Required" });
      expect(mockProductFindByIdAndUpdate).not.toHaveBeenCalled();
    });

    // Liu Shixin, A0265144H
    test("success: updates fields + slug, calls save, returns 201", async () => {
      // Arrange
      const req = {
        params: { pid: "p1" },
        fields: {
          name: "New Name",
          description: "d",
          price: 5,
          category: "c",
          quantity: 3,
        },
        files: {},
      };
      const res = makeRes();

      mockSlugify.mockReturnValue("new-name");

      // findByIdAndUpdate returns doc, then controller calls doc.save()
      const updatedDoc = {
        photo: { data: null, contentType: null },
        save: mockProductSave,
      };
      mockProductFindByIdAndUpdate.mockResolvedValue(updatedDoc);
      mockProductSave.mockResolvedValue(updatedDoc);

      // Act
      await updateProductController(req, res);

      // Assert
      expect(mockProductFindByIdAndUpdate).toHaveBeenCalledWith(
        "p1",
        expect.objectContaining({
          name: "New Name",
          description: "d",
          price: 5,
          category: "c",
          quantity: 3,
          slug: "new-name",
        }),
        { new: true }
      );
      expect(mockProductSave).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Product Updated Successfully",
        products: updatedDoc,
      });
    });

    // Liu Shixin, A0265144H
    test("success: when photo provided, reads file and sets photo fields before save", async () => {
      // Arrange
      const req = {
        params: { pid: "p1" },
        fields: {
          name: "New Name",
          description: "d",
          price: 5,
          category: "c",
          quantity: 3,
        },
        files: { photo: { size: 10, path: "/tmp/p", type: "image/jpeg" } },
      };
      const res = makeRes();

      mockSlugify.mockReturnValue("new-name");
      mockReadFileSync.mockReturnValue(Buffer.from("img"));

      const updatedDoc = {
        photo: { data: null, contentType: null },
        save: mockProductSave,
      };
      mockProductFindByIdAndUpdate.mockResolvedValue(updatedDoc);
      mockProductSave.mockResolvedValue(updatedDoc);

      // Act
      await updateProductController(req, res);

      // Assert
      expect(mockReadFileSync).toHaveBeenCalledWith("/tmp/p");
      expect(updatedDoc.photo.contentType).toBe("image/jpeg");
      expect(mockProductSave).toHaveBeenCalledTimes(1);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    // Liu Shixin, A0265144H
    test("error path: update rejects -> responds 500 'Error in Updte product'", async () => {
      // Arrange
      const req = {
        params: { pid: "p1" },
        fields: {
          name: "n",
          description: "d",
          price: 5,
          category: "c",
          quantity: 3,
        },
        files: {},
      };
      const res = makeRes();

      mockProductFindByIdAndUpdate.mockRejectedValue(new Error("boom"));

      // Act
      await updateProductController(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Updte product",
        })
      );
    });
  });
});
