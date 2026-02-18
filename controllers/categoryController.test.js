/**
 * Test written by Ng Hong Ray, A0253509A
 *
 * external dependencies (categoryModel, slugify) are mocked to avoid real DB
 * or library calls, ensuring only controller logic is tested.
 *
 * Testing Principles Applied:
 *
 * 1. Equivalence Partitioning
 * - Create: missing name vs existing category vs new category
 * - Update/Delete/get: success vs failure paths
 *
 * 2. Boundary Value Analysis
 * - Name field: undefined / empty string
 *
 * 3. Error Handling Verification
 * - Database failures should return 500 and not crash
 *
 * Focus: Status codes, response payloads, and correct DB interactions.
 */


const slugify = require("slugify");
const categoryModel = require("../models/categoryModel.js");

jest.mock("slugify", () => jest.fn((s) => `slug-${String(s)}`));

// categoryModel as BOTH constructor + static methods
jest.mock("../models/categoryModel.js", () => {
  const categoryModelFn = jest.fn();

  categoryModelFn.findOne = jest.fn();
  categoryModelFn.find = jest.fn();
  categoryModelFn.findByIdAndUpdate = jest.fn();
  categoryModelFn.findByIdAndDelete = jest.fn();

  return categoryModelFn;
});

// Import controllers AFTER mocks
const {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} = require("./categoryController.js");

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe("Category Controllers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    slugify.mockImplementation((s) => `slug-${String(s)}`);
  });

  describe("createCategoryController", () => {
    // Boundary Value Analysis
    test("missing name -> 401 (Name is required)", async () => {
      const req = { body: {} };
      const res = makeRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    // Boundary Value Analysis
    test("empty string name -> 401 (Name is required)", async () => {
      const req = { body: { name: "" } };
      const res = makeRes();

      await createCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({ message: "Name is required" });
    });

    // Equivalence Partitioning: existing category vs new category
    test("existing category -> 200 (Category Already Exists)", async () => {
      const req = { body: { name: "Books" } };
      const res = makeRes();

      categoryModel.findOne.mockResolvedValueOnce({ _id: "x", name: "Books" });

      await createCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ name: "Books" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Category Already Exists",
      });
    });

    // Equivalence Partitioning: new category
    test("New category -> 201 with saved category", async () => {
      const req = { body: { name: "Electronics" } };
      const res = makeRes();

      categoryModel.findOne.mockResolvedValueOnce(null);

      const savedDoc = { _id: "1", name: "Electronics", slug: "slug-Electronics" };
      const saveMock = jest.fn().mockResolvedValueOnce(savedDoc);

      categoryModel.mockImplementationOnce(() => ({ save: saveMock }));

      await createCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith("Electronics");
      expect(categoryModel).toHaveBeenCalledWith({
        name: "Electronics",
        slug: "slug-Electronics",
      });
      expect(saveMock).toHaveBeenCalledTimes(1);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "New category created",
        category: savedDoc,
      });
    });

    // Equivalence Partitioning: DB failure
    test("createCategoryController DB failure -> 500 + logs error", async () => {
      const req = { body: { name: "Toys" } };
      const res = makeRes();

      const logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
      categoryModel.findOne.mockRejectedValueOnce(new Error("db down"));

      await createCategoryController(req, res);

      expect(logSpy).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Category",
          error: expect.objectContaining({ message: "db down" }),
        })
      );

      logSpy.mockRestore();
    });
  });

  describe("updateCategoryController", () => {
    // Equivalence Partitioning: valid update vs ID not found vs DB error
    test("valid update -> 200 + updated category", async () => {
      const req = { body: { name: "NewName" }, params: { id: "123" } };
      const res = makeRes();

      const updated = { _id: "123", name: "NewName", slug: "slug-NewName" };
      categoryModel.findByIdAndUpdate.mockResolvedValueOnce(updated);

      await updateCategoryController(req, res);

      expect(slugify).toHaveBeenCalledWith("NewName");
      expect(categoryModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "123",
        { name: "NewName", slug: "slug-NewName" },
        { new: true }
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        messsage: "Category Updated Successfully",
        category: updated,
      });
    });

    // Equivalence Partitioning: ID not found
    test("ID not found -> 404", async () => {
      const req = { body: { name: "X" }, params: { id: "bad" } };
      const res = makeRes();

      categoryModel.findByIdAndUpdate.mockResolvedValueOnce(null);

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Category not found",
      });
    });

    // Equivalence Partitioning: DB error
    test("Error-path: update throws -> 500", async () => {
      const req = { body: { name: "X" }, params: { id: "123" } };
      const res = makeRes();

      categoryModel.findByIdAndUpdate.mockRejectedValueOnce(new Error("fail"));

      await updateCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while updating category",
        })
      );
    });
  });

  describe("categoryControlller (get all)", () => {
    // Equivalence Partitioning: successful retrieval vs DB failure
    test("returns all categories -> 200", async () => {
      const req = {};
      const res = makeRes();

      const list = [{ _id: "1" }, { _id: "2" }];
      categoryModel.find.mockResolvedValueOnce(list);

      await categoryControlller(req, res);

      expect(categoryModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "All Categories List",
        category: list,
      });
    });

    // Equivalence Partitioning: DB failure
    test("Error-path: find throws -> 500", async () => {
      const req = {};
      const res = makeRes();

      categoryModel.find.mockRejectedValueOnce(new Error("fail"));

      await categoryControlller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while getting all categories",
        })
      );
    });
  });

  describe("singleCategoryController", () => {
    // Equivalence Partitioning: valid slug vs DB error
    test("slug exists -> 200 + category", async () => {
      const req = { params: { slug: "books" } };
      const res = makeRes();

      const cat = { _id: "1", slug: "books" };
      categoryModel.findOne.mockResolvedValueOnce(cat);

      await singleCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "books" });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Get Single Category Successfully",
        category: cat,
      });
    });

    // Equivalence Partitioning: slug not found
    test("Error-path: findOne throws -> 500", async () => {
      const req = { params: { slug: "x" } };
      const res = makeRes();

      categoryModel.findOne.mockRejectedValueOnce(new Error("fail"));

      await singleCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While getting Single Category",
        })
      );
    });
  });

  describe("deleteCategoryCOntroller", () => {
    // Equivalence Partitioning: valid delete vs ID not found vs DB error
    test("valid delete -> 200", async () => {
      const req = { params: { id: "123" } };
      const res = makeRes();

      categoryModel.findByIdAndDelete.mockResolvedValueOnce({ _id: "123" });

      await deleteCategoryCOntroller(req, res);

      expect(categoryModel.findByIdAndDelete).toHaveBeenCalledWith("123");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Categry Deleted Successfully",
      });
    });

    test("Error-path: delete throws -> 500", async () => {
      const req = { params: { id: "123" } };
      const res = makeRes();

      categoryModel.findByIdAndDelete.mockRejectedValueOnce(new Error("fail"));

      await deleteCategoryCOntroller(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error while deleting category",
        })
      );
    });
  });
});
