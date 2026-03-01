/**
 * Written by: Ng Hong Ray, A0253509A
 * Integration tests for categoryController and related middleware (requireSignIn, isAdmin)
 * - Tests both middleware and controller logic together without DB or HTTP server
 * - Covers authentication middleware behavior and category controller logic for creating, updating, fetching, and deleting categories
 * - Uses Jest mocks for models and JWT to isolate controller/middleware logic
 */
import JWT from "jsonwebtoken";

// Mocking models and JWT for isolated testing
// This allows us to test the controller and middleware logic without needing a real database or HTTP server or installing other packages like
// supertest or mongodb-memory-server
jest.mock("../models/userModel.js", () => ({
  __esModule: true,
  default: {
    findById: jest.fn(),
  },
}));

jest.mock("../models/categoryModel.js", () => {
  const saveMock = jest.fn();

  const Category = function (doc) {
    this.save = saveMock.mockResolvedValue({
      ...doc,
      _id: "cat123",
      name: typeof doc.name === "string" ? doc.name.toLowerCase() : doc.name,
      slug: doc.slug,
    });
  };

  Category.findOne = jest.fn();
  Category.find = jest.fn();
  Category.findByIdAndUpdate = jest.fn();
  Category.findByIdAndDelete = jest.fn();
  Category.findOne.mockResolvedValue(null);

  return {
    __esModule: true,
    default: Category,
  };
});


import {
  createCategoryController,
  updateCategoryController,
  categoryControlller,
  singleCategoryController,
  deleteCategoryCOntroller,
} from "../controllers/categoryController.js";

import { requireSignIn, isAdmin } from "../middlewares/authMiddleware.js";

import User from "../models/userModel.js";
import Category from "../models/categoryModel.js";


function mockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
}

function mockNext() {
  return jest.fn();
}

describe("Category integration (middleware + controller) without DB/HTTP", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = "test-secret";
  });

// Middleware tests
  test("requireSignIn: rejects missing/invalid token", async () => {
    const req = { headers: { authorization: "invalid.token.here" } };
    const res = mockResponse();
    const next = mockNext();

    await requireSignIn(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Unauthorized or invalid token",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("requireSignIn: accepts valid token and sets req.user", async () => {
    const token = JWT.sign({ _id: "user123" }, process.env.JWT_SECRET);
    const req = { headers: { authorization: token } };
    const res = mockResponse();
    const next = mockNext();

    await requireSignIn(req, res, next);

    expect(req.user).toEqual(expect.objectContaining({ _id: "user123" }));
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test("isAdmin: blocks non-admin user (role !== 1)", async () => {
    const req = { user: { _id: "user123" } };
    const res = mockResponse();
    const next = mockNext();

    User.findById.mockResolvedValue({ _id: "user123", role: 0 });

    await isAdmin(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("user123");
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "UnAuthorized Access",
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test("isAdmin: allows admin user (role === 1)", async () => {
    const req = { user: { _id: "admin123" } };
    const res = mockResponse();
    const next = mockNext();

    User.findById.mockResolvedValue({ _id: "admin123", role: 1 });

    await isAdmin(req, res, next);

    expect(User.findById).toHaveBeenCalledWith("admin123");
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });


// Controller + middleware integration tests
  test("createCategoryController: returns 401 if name missing", async () => {
    const req = { body: {} };
    const res = mockResponse();

    await createCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Name is required" })
    );
  });

  test("createCategoryController: returns 200 if category already exists", async () => {
    const req = { body: { name: "Electronics" } };
    const res = mockResponse();

    Category.findOne.mockResolvedValue({ _id: "existing123", name: "electronics" });

    await createCategoryController(req, res);

    expect(Category.findOne).toHaveBeenCalledWith({ name: "Electronics" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Category Already Exists",
      })
    );
  });

  test("createCategoryController: creates new category (201)", async () => {
    const req = { body: { name: "Electronics" } };
    const res = mockResponse();

    Category.findOne.mockResolvedValue(null);

    await createCategoryController(req, res);

    expect(Category.findOne).toHaveBeenCalledWith({ name: "Electronics" });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "New category created",
        category: expect.objectContaining({
          _id: "cat123",
          name: "electronics",
        }),
      })
    );
  });

  test("updateCategoryController: returns 404 if category not found", async () => {
    const req = { body: { name: "NewName" }, params: { id: "missing" } };
    const res = mockResponse();

    Category.findByIdAndUpdate.mockResolvedValue(null);

    await updateCategoryController(req, res);

    expect(Category.findByIdAndUpdate).toHaveBeenCalledWith(
      "missing",
      expect.objectContaining({
        name: "NewName",
      }),
      { new: true }
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Category not found",
      })
    );
  });

  test("updateCategoryController: updates category successfully (200)", async () => {
    const req = { body: { name: "NewName" }, params: { id: "cat123" } };
    const res = mockResponse();

    Category.findByIdAndUpdate.mockResolvedValue({
      _id: "cat123",
      name: "newname",
      slug: "newname",
    });

    await updateCategoryController(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        messsage: "Category Updated Successfully",
        category: expect.objectContaining({
          _id: "cat123",
          name: "newname",
        }),
      })
    );
  });

  test("categoryControlller: returns all categories (200)", async () => {
    const req = {};
    const res = mockResponse();

    Category.find.mockResolvedValue([
      { _id: "c1", name: "electronics", slug: "electronics" },
      { _id: "c2", name: "books", slug: "books" },
    ]);

    await categoryControlller(req, res);

    expect(Category.find).toHaveBeenCalledWith({});
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "All Categories List",
        category: expect.any(Array),
      })
    );
  });

  test("singleCategoryController: returns single category by slug (200)", async () => {
    const req = { params: { slug: "electronics" } };
    const res = mockResponse();

    Category.findOne.mockResolvedValue({
      _id: "c1",
      name: "electronics",
      slug: "electronics",
    });

    await singleCategoryController(req, res);

    expect(Category.findOne).toHaveBeenCalledWith({ slug: "electronics" });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Get Single Category Successfully",
        category: expect.objectContaining({ slug: "electronics" }),
      })
    );
  });

  test("deleteCategoryCOntroller: deletes category (200)", async () => {
    const req = { params: { id: "cat123" } };
    const res = mockResponse();

    Category.findByIdAndDelete.mockResolvedValue({ _id: "cat123" });

    await deleteCategoryCOntroller(req, res);

    expect(Category.findByIdAndDelete).toHaveBeenCalledWith("cat123");
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Categry Deleted Successfully",
      })
    );
  });
});