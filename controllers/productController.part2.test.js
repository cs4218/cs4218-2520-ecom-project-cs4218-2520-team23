jest.mock("braintree", () => ({
  BraintreeGateway: jest.fn().mockImplementation(() => ({
    clientToken: { generate: jest.fn() },
    transaction: { sale: jest.fn() },
  })),
  Environment: { Sandbox: "sandbox" },
}));

import {
  getProductController,
  getSingleProductController,
  productPhotoController,
  productFiltersController,
  productCountController,
  productListController,
  searchProductController,
  realtedProductController,
  productCategoryController,
} from "./productController.js";
import productModel from "../models/productModel.js";
import categoryModel from "../models/categoryModel.js";

jest.mock("../models/productModel.js");
jest.mock("../models/categoryModel.js");

// Liu Yiyang, A0258121M
describe('Product Controller Tests under the "Product" feature', () => {
  let req, res;

  beforeEach(() => {
    req = {
      params: {},
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      set: jest.fn(),
      json: jest.fn(),
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getProductController", () => {
    it("should get all products successfully", async () => {
      const mockProducts = [
        { _id: "1", name: "Product 1", price: 100 },
        { _id: "2", name: "Product 2", price: 200 },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await getProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.populate).toHaveBeenCalledWith("category");
      expect(mockQuery.select).toHaveBeenCalledWith("-photo");
      expect(mockQuery.limit).toHaveBeenCalledWith(12);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 2,
        message: "All Products",
        products: mockProducts,
      });
    });

    it("should handle empty product list", async () => {
      const mockProducts = [];
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      };
      productModel.find.mockReturnValue(mockQuery);

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 0,
        message: "All Products",
        products: [],
      });
    });

    it("should handle exactly 12 products", async () => {
      const mockProducts = Array.from({ length: 12 }, (_, i) => ({
        _id: `${i + 1}`,
        name: `Product ${i + 1}`,
        price: 100 * (i + 1),
      }));
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      };
      productModel.find.mockReturnValue(mockQuery);

      await getProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        countTotal: 12,
        message: "All Products",
        products: mockProducts,
      });
    });

    it("should handle database connection error", async () => {
      const mockError = new Error("Database connection failed");
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      };
      productModel.find.mockReturnValue(mockQuery);

      await getProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error in getting products",
        error: mockError.message,
      });
    });
  });

  describe("getSingleProductController", () => {
    it("should get single product successfully", async () => {
      const mockProduct = {
        _id: "1",
        name: "Test Product",
        slug: "test-product",
        category: { name: "Electronics" },
      };
      req.params.slug = "test-product";

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProduct),
      };

      productModel.findOne.mockReturnValue(mockQuery);

      await getSingleProductController(req, res);

      expect(productModel.findOne).toHaveBeenCalledWith({
        slug: "test-product",
      });
      expect(mockQuery.select).toHaveBeenCalledWith("-photo");
      expect(mockQuery.populate).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Single Product Fetched",
        product: mockProduct,
      });
    });

    it("should handle product not found", async () => {
      req.params.slug = "non-existent-product";
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(null),
      };
      productModel.findOne.mockReturnValue(mockQuery);
      await getSingleProductController(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Product not found",
      });
    });

    it("should handle slug with special characters", async () => {
      const mockProduct = {
        _id: "1",
        name: "Product",
        slug: "product-2024-v2",
      };
      req.params.slug = "product-2024-v2";
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProduct),
      };
      productModel.findOne.mockReturnValue(mockQuery);
      await getSingleProductController(req, res);
      expect(productModel.findOne).toHaveBeenCalledWith({
        slug: "product-2024-v2",
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle database query error", async () => {
      const mockError = new Error("Product not found");
      req.params.slug = "test-product";

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(mockError),
      };

      productModel.findOne.mockReturnValue(mockQuery);
      await getSingleProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error while getting single product",
        error: mockError,
      });
    });

    describe("productPhotoController", () => {
      it("should get photo successfully", async () => {
        const mockPhotoData = Buffer.from("test image data");
        const mockProduct = {
          photo: {
            data: mockPhotoData,
            contentType: "image/jpeg",
          },
        };
        req.params.pid = "123";

        const mockQuery = {
          select: jest.fn().mockResolvedValue(mockProduct),
        };

        productModel.findById.mockReturnValue(mockQuery);

        await productPhotoController(req, res);

        expect(productModel.findById).toHaveBeenCalledWith("123");
        expect(mockQuery.select).toHaveBeenCalledWith("photo");
        expect(res.set).toHaveBeenCalledWith("Content-type", "image/jpeg");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith(mockPhotoData);
      });

      it("should handle different image content types", async () => {
        const testCases = [
          { contentType: "image/png", data: Buffer.from("png data") },
          { contentType: "image/gif", data: Buffer.from("gif data") },
          { contentType: "image/webp", data: Buffer.from("webp data") },
        ];
        for (const testCase of testCases) {
          jest.clearAllMocks();
          const mockProduct = { photo: testCase };
          req.params.pid = "123";
          const mockQuery = {
            select: jest.fn().mockResolvedValue(mockProduct),
          };
          productModel.findById.mockReturnValue(mockQuery);

          await productPhotoController(req, res);

          expect(res.set).toHaveBeenCalledWith(
            "Content-type",
            testCase.contentType
          );
          expect(res.send).toHaveBeenCalledWith(testCase.data);
        }
      });

      it("should not send response when photo data is null", async () => {
        const mockProduct = {
          photo: {
            data: null,
            contentType: "image/jpeg",
          },
        };
        req.params.pid = "123";

        const mockQuery = {
          select: jest.fn().mockResolvedValue(mockProduct),
        };

        productModel.findById.mockReturnValue(mockQuery);

        await productPhotoController(req, res);

        expect(res.set).not.toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalledWith(200);
      });
      it("should handle undefined photo data", async () => {
        const mockProduct = {
          photo: {
            data: undefined,
            contentType: "image/jpeg",
          },
        };
        req.params.pid = "123";
        const mockQuery = {
          select: jest.fn().mockResolvedValue(mockProduct),
        };
        productModel.findById.mockReturnValue(mockQuery);

        await productPhotoController(req, res);

        expect(res.set).not.toHaveBeenCalled();
      });

      it("should handle database error (State: Error)", async () => {
        const mockError = new Error("Photo not found");
        req.params.pid = "123";

        const mockQuery = {
          select: jest.fn().mockRejectedValue(mockError),
        };

        productModel.findById.mockReturnValue(mockQuery);

        await productPhotoController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Error while getting photo",
          error: mockError,
        });
      });

      it("should handle invalid product ID format", async () => {
        const mockError = new Error("Cast to ObjectId failed");
        req.params.pid = "invalid-id";
        const mockQuery = {
          select: jest.fn().mockRejectedValue(mockError),
        };
        productModel.findById.mockReturnValue(mockQuery);

        await productPhotoController(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
      });
    });

    describe("productFiltersController", () => {
      it("should apply no filters when both inputs are empty", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: [],
          radio: [],
        };
        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          products: mockProducts,
        });
      });

      it("should filter by category only when price is empty", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: ["cat1", "cat2"],
          radio: [],
        };
        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["cat1", "cat2"],
        });
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should filter by single category (minimum input)", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: ["cat1"],
          radio: [],
        };
        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["cat1"],
        });
      });

      it("should filter by price range only when category is empty", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: [],
          radio: [100, 500],
        };

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          price: { $gte: 100, $lte: 500 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should handle edge price values", async () => {
        const testCases = [
          { radio: [0, 100], desc: "minimum price 0" },
          { radio: [0, 0], desc: "both zero" },
          { radio: [1000, 10000], desc: "large values" },
        ];
        for (const testCase of testCases) {
          jest.clearAllMocks();
          req.body = {
            checked: [],
            radio: testCase.radio,
          };
          productModel.find.mockResolvedValue([]);

          await productFiltersController(req, res);

          expect(productModel.find).toHaveBeenCalledWith({
            price: { $gte: testCase.radio[0], $lte: testCase.radio[1] },
          });
        }
      });

      it("should filter products by both category and price", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: ["cat1"],
          radio: [100, 500],
        };

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["cat1"],
          price: { $gte: 100, $lte: 500 },
        });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          products: mockProducts,
        });
      });

      it("should handle multiple categories with price range", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        req.body = {
          checked: ["cat1", "cat2", "cat3"],
          radio: [200, 800],
        };

        productModel.find.mockResolvedValue(mockProducts);

        await productFiltersController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          category: ["cat1", "cat2", "cat3"],
          price: { $gte: 200, $lte: 800 },
        });
      });

      it("should handle database error during filtering", async () => {
        const mockError = new Error("Filter error");
        req.body = {
          checked: [],
          radio: [],
        };

        productModel.find.mockRejectedValue(mockError);

        await productFiltersController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "Error while Filtering Products",
          error: mockError,
        });
      });
    });

    describe("productCountController", () => {
      it("should get product count successfully", async () => {
        const mockQuery = {
          estimatedDocumentCount: jest.fn().mockResolvedValue(100),
        };

        productModel.find.mockReturnValue(mockQuery);

        await productCountController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockQuery.estimatedDocumentCount).toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          total: 100,
        });
      });

      it("should handle zero products", async () => {
        const mockQuery = {
          estimatedDocumentCount: jest.fn().mockResolvedValue(0),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productCountController(req, res);

        expect(res.send).toHaveBeenCalledWith({
          success: true,
          total: 0,
        });
      });

      it("should handle regular amount of products", async () => {
        const mockQuery = {
          estimatedDocumentCount: jest.fn().mockResolvedValue(10),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productCountController(req, res);

        expect(res.send).toHaveBeenCalledWith({
          success: true,
          total: 10,
        });
      });

      it("should handle large product count", async () => {
        const mockQuery = {
          estimatedDocumentCount: jest.fn().mockResolvedValue(1000000),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productCountController(req, res);

        expect(res.send).toHaveBeenCalledWith({
          success: true,
          total: 1000000,
        });
      });

      it("should handle database error", async () => {
        const mockError = new Error("Count error");
        const mockQuery = {
          estimatedDocumentCount: jest.fn().mockRejectedValue(mockError),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productCountController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          message: "Error in product count",
          error: mockError,
          success: false,
        });
      });
    });

    describe("productListController", () => {
      it("should return first page when page param is undefined", async () => {
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockProducts),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productListController(req, res);

        expect(mockQuery.skip).toHaveBeenCalledWith(0);
        expect(mockQuery.limit).toHaveBeenCalledWith(6);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should return first page when page is 1", async () => {
        req.params.page = 1;
        const mockProducts = [{ _id: "1", name: "Product 1" }];
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockProducts),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productListController(req, res);

        expect(mockQuery.skip).toHaveBeenCalledWith(0);
        expect(res.status).toHaveBeenCalledWith(200);
      });

      it("should calculate correct offset for page 2", async () => {
        req.params.page = 2;
        const mockProducts = [{ _id: "7", name: "Product 7" }];
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockProducts),
        };
        productModel.find.mockReturnValue(mockQuery);

        await productListController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({});
        expect(mockQuery.select).toHaveBeenCalledWith("-photo");
        expect(mockQuery.skip).toHaveBeenCalledWith(6);
        expect(mockQuery.limit).toHaveBeenCalledWith(6);
        expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          products: mockProducts,
        });
      });

      it("should handle large page number", async () => {
        req.params.page = 100;
        const mockProducts = [];
        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockResolvedValue(mockProducts),
        };

        productModel.find.mockReturnValue(mockQuery);

        await productListController(req, res);

        expect(mockQuery.skip).toHaveBeenCalledWith(594);
        expect(res.send).toHaveBeenCalledWith({
          success: true,
          products: [],
        });
      });

      it("should handle error when getting product list fails", async () => {
        const mockError = new Error("List error");
        req.params.page = 1;

        const mockQuery = {
          select: jest.fn().mockReturnThis(),
          skip: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
          sort: jest.fn().mockRejectedValue(mockError),
        };

        productModel.find.mockReturnValue(mockQuery);

        await productListController(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.send).toHaveBeenCalledWith({
          success: false,
          message: "error in per page ctrl",
          error: mockError,
        });
      });
    });

    describe("searchProductController", () => {
      it("should search products by keyword case-insensitively", async () => {
        const mockProducts = [
          { _id: "1", name: "Laptop Computer" },
          { _id: "2", name: "Desktop Computer" },
        ];
        req.params.keyword = "computer";

        const mockQuery = {
          select: jest.fn().mockResolvedValue(mockProducts),
        };

        productModel.find.mockReturnValue(mockQuery);

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          $or: [
            { name: { $regex: "computer", $options: "i" } },
            { description: { $regex: "computer", $options: "i" } },
          ],
        });
        expect(mockQuery.select).toHaveBeenCalledWith("-photo");
        expect(res.json).toHaveBeenCalledWith(mockProducts);
      });

      it("should return empty array when no matches found", async () => {
        req.params.keyword = "nonexistent";
        const mockQuery = {
          select: jest.fn().mockResolvedValue([]),
        };
        productModel.find.mockReturnValue(mockQuery);

        await searchProductController(req, res);

        expect(res.json).toHaveBeenCalledWith([]);
      });

      it("should handle special characters in search keyword", async () => {
        const mockProducts = [{ _id: "1", name: "Product-2024" }];
        req.params.keyword = "2024";
        const mockQuery = {
          select: jest.fn().mockResolvedValue(mockProducts),
        };
        productModel.find.mockReturnValue(mockQuery);

        await searchProductController(req, res);

        expect(productModel.find).toHaveBeenCalledWith({
          $or: [
            { name: { $regex: "2024", $options: "i" } },
            { description: { $regex: "2024", $options: "i" } },
          ],
        });
      });

      it("should search in both name and description fields", async () => {
        req.params.keyword = "test";
        const mockQuery = {
          select: jest.fn().mockResolvedValue([]),
        };
        productModel.find.mockReturnValue(mockQuery);

        await searchProductController(req, res);

        const callArgs = productModel.find.mock.calls[0][0];
        expect(callArgs.$or).toHaveLength(2);
        expect(callArgs.$or[0]).toHaveProperty("name");
        expect(callArgs.$or[1]).toHaveProperty("description");
      });
    });

    it("should handle database error", async () => {
      const mockError = new Error("Search error");
      req.params.keyword = "test";
      const mockQuery = {
        select: jest.fn().mockRejectedValue(mockError),
      };
      productModel.find.mockReturnValue(mockQuery);

      await searchProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Error In Search Product API",
        error: mockError,
      });
    });
  });

  describe("realtedProductController", () => {
    it("should get related products successfully", async () => {
      const mockProducts = [
        { _id: "2", name: "Related Product 1", category: "cat1" },
        { _id: "3", name: "Related Product 2", category: "cat1" },
      ];
      req.params = {
        pid: "1",
        cid: "cat1",
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: "cat1",
        _id: { $ne: "1" },
      });
      expect(mockQuery.select).toHaveBeenCalledWith("-photo");
      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(mockQuery.populate).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should limit results to 3 products", async () => {
      const mockProducts = Array.from({ length: 3 }, (_, i) => ({
        _id: `${i + 2}`,
        name: `Product ${i + 2}`,
      }));
      req.params = { pid: "1", cid: "cat1" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };
      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should return empty array when no related products exist", async () => {
      req.params = { pid: "1", cid: "cat1" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue([]),
      };
      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: [],
      });
    });

    it("should handle less than 3 related products", async () => {
      const mockProducts = [{ _id: "2", name: "Product 2" }];
      req.params = { pid: "1", cid: "cat1" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it("should handle database error", async () => {
      const mockError = new Error("Related products error");
      req.params = { pid: "1", cid: "cat1" };
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(mockError),
      };
      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "error while geting related product",
        error: mockError,
      });
    });
  });

  describe("productCategoryController", () => {
    it("should get products by category successfully", async () => {
      const mockCategory = {
        _id: "cat1",
        name: "Electronics",
        slug: "electronics",
      };
      const mockProducts = [
        { _id: "1", name: "Product 1", category: "cat1" },
        { _id: "2", name: "Product 2", category: "cat1" },
      ];
      req.params.slug = "electronics";

      categoryModel.findOne.mockResolvedValue(mockCategory);

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({
        slug: "electronics",
      });
      expect(productModel.find).toHaveBeenCalledWith({
        category: mockCategory,
      });
      expect(mockQuery.populate).toHaveBeenCalledWith("category");
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
      });
    });

    it("should handle category with no products", async () => {
      const mockCategory = {
        _id: "cat1",
        name: "Empty Category",
        slug: "empty",
      };
      req.params.slug = "empty";
      categoryModel.findOne.mockResolvedValue(mockCategory);
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([]),
      };
      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: [],
      });
    });

    it("should handle non-existent category", async () => {
      req.params.slug = "non-existent";
      categoryModel.findOne.mockResolvedValue(null);
      const mockQuery = {
        populate: jest.fn().mockResolvedValue([]),
      };
      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({ category: null });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle category with many products", async () => {
      const mockCategory = { _id: "cat1", name: "Popular", slug: "popular" };
      const mockProducts = Array.from({ length: 50 }, (_, i) => ({
        _id: `${i + 1}`,
        name: `Product ${i + 1}`,
      }));
      req.params.slug = "popular";
      categoryModel.findOne.mockResolvedValue(mockCategory);
      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockProducts),
      };
      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
      });
    });

    it("should handle category lookup error", async () => {
      const mockError = new Error("Category error");
      req.params.slug = "electronics";
      categoryModel.findOne.mockRejectedValue(mockError);

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error While Getting products",
      });
    });

    it("should handle product query error after successful category lookup", async () => {
      const mockCategory = {
        _id: "cat1",
        name: "Electronics",
        slug: "electronics",
      };
      const mockError = new Error("Product query failed");
      req.params.slug = "electronics";
      categoryModel.findOne.mockResolvedValue(mockCategory);
      const mockQuery = {
        populate: jest.fn().mockRejectedValue(mockError),
      };
      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: "Error While Getting products",
      });
    });
  });
});
