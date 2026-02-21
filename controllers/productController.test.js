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
} from './productController.js';
import productModel from '../models/productModel.js';
import categoryModel from '../models/categoryModel.js';

jest.mock('../models/productModel.js');
jest.mock('../models/categoryModel.js');

// Tests written by: Liu Yiyang, A0258121M
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

  describe('getProductController', () => {
    it('should get all products successfully', async () => {
      const mockProducts = [
        { _id: '1', name: 'Product 1', price: 100 },
        { _id: '2', name: 'Product 2', price: 200 },
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
      expect(mockQuery.populate).toHaveBeenCalledWith('category');
      expect(mockQuery.select).toHaveBeenCalledWith('-photo');
      expect(mockQuery.limit).toHaveBeenCalledWith(12);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        counTotal: 2,
        message: 'ALlProducts ',
        products: mockProducts,
      });
    });

    it('should handle error when getting products fails', async () => {
      const mockError = new Error('Database error');
      
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      };

      productModel.find.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await getProductController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Erorr in getting products',
        error: mockError.message,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('getSingleProductController', () => {
    it('should get single product successfully', async () => {
      const mockProduct = { _id: '1', name: 'Test Product', slug: 'test-product' };
      req.params.slug = 'test-product';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProduct),
      };

      productModel.findOne.mockReturnValue(mockQuery);

      await getSingleProductController(req, res);

      expect(productModel.findOne).toHaveBeenCalledWith({ slug: 'test-product' });
      expect(mockQuery.select).toHaveBeenCalledWith('-photo');
      expect(mockQuery.populate).toHaveBeenCalledWith('category');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: 'Single Product Fetched',
        product: mockProduct,
      });
    });

    it('should handle error when getting single product fails', async () => {
      const mockError = new Error('Product not found');
      req.params.slug = 'test-product';

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(mockError),
      };

      productModel.findOne.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await getSingleProductController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Eror while getitng single product',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('productPhotoController', () => {
    it('should get product photo successfully', async () => {
      const mockPhotoData = Buffer.from('test image data');
      const mockProduct = {
        photo: {
          data: mockPhotoData,
          contentType: 'image/jpeg',
        },
      };
      req.params.pid = '123';

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockProduct),
      };

      productModel.findById.mockReturnValue(mockQuery);

      await productPhotoController(req, res);

      expect(productModel.findById).toHaveBeenCalledWith('123');
      expect(mockQuery.select).toHaveBeenCalledWith('photo');
      expect(res.set).toHaveBeenCalledWith('Content-type', 'image/jpeg');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(mockPhotoData);
    });

    it('should not send photo when photo data is not available', async () => {
      const mockProduct = {
        photo: {
          data: null,
          contentType: 'image/jpeg',
        },
      };
      req.params.pid = '123';

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockProduct),
      };

      productModel.findById.mockReturnValue(mockQuery);

      await productPhotoController(req, res);

      expect(res.set).not.toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(200);
    });

    it('should handle error when getting photo fails', async () => {
      const mockError = new Error('Photo not found');
      req.params.pid = '123';

      const mockQuery = {
        select: jest.fn().mockRejectedValue(mockError),
      };

      productModel.findById.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await productPhotoController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Erorr while getting photo',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('productFiltersController', () => {
    it('should filter products by category only', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];
      req.body = {
        checked: ['cat1', 'cat2'],
        radio: [],
      };

      productModel.find.mockResolvedValue(mockProducts);

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: ['cat1', 'cat2'],
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it('should filter products by price range only', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];
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
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it('should filter products by both category and price', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];
      req.body = {
        checked: ['cat1'],
        radio: [100, 500],
      };

      productModel.find.mockResolvedValue(mockProducts);

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: ['cat1'],
        price: { $gte: 100, $lte: 500 },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it('should filter products with no filters applied', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];
      req.body = {
        checked: [],
        radio: [],
      };

      productModel.find.mockResolvedValue(mockProducts);

      await productFiltersController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should handle error when filtering fails', async () => {
      const mockError = new Error('Filter error');
      req.body = {
        checked: [],
        radio: [],
      };

      productModel.find.mockRejectedValue(mockError);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await productFiltersController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error WHile Filtering Products',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('productCountController', () => {
    it('should get product count successfully', async () => {
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

    it('should handle error when getting count fails', async () => {
      const mockError = new Error('Count error');
      const mockQuery = {
        estimatedDocumentCount: jest.fn().mockRejectedValue(mockError),
      };

      productModel.find.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await productCountController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Error in product count',
        error: mockError,
        success: false,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('productListController', () => {
    it('should get paginated products with page number', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];
      req.params.page = 2;

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await productListController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({});
      expect(mockQuery.select).toHaveBeenCalledWith('-photo');
      expect(mockQuery.skip).toHaveBeenCalledWith(6);
      expect(mockQuery.limit).toHaveBeenCalledWith(6);
      expect(mockQuery.sort).toHaveBeenCalledWith({ createdAt: -1 });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it('should get first page when page param is not provided', async () => {
      const mockProducts = [{ _id: '1', name: 'Product 1' }];

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

    it('should handle error when getting product list fails', async () => {
      const mockError = new Error('List error');
      req.params.page = 1;

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockRejectedValue(mockError),
      };

      productModel.find.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await productListController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'error in per page ctrl',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('searchProductController', () => {
    it('should search products by keyword', async () => {
      const mockProducts = [
        { _id: '1', name: 'Laptop Computer' },
        { _id: '2', name: 'Desktop Computer' },
      ];
      req.params.keyword = 'computer';

      const mockQuery = {
        select: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await searchProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        $or: [
          { name: { $regex: 'computer', $options: 'i' } },
          { description: { $regex: 'computer', $options: 'i' } },
        ],
      });
      expect(mockQuery.select).toHaveBeenCalledWith('-photo');
      expect(res.json).toHaveBeenCalledWith(mockProducts);
    });

    it('should handle error when search fails', async () => {
      const mockError = new Error('Search error');
      req.params.keyword = 'test';

      const mockQuery = {
        select: jest.fn().mockRejectedValue(mockError),
      };

      productModel.find.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await searchProductController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'Error In Search Product API',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('realtedProductController', () => {
    it('should get related products successfully', async () => {
      const mockProducts = [
        { _id: '2', name: 'Related Product 1' },
        { _id: '3', name: 'Related Product 2' },
      ];
      req.params = {
        pid: '1',
        cid: 'cat1',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await realtedProductController(req, res);

      expect(productModel.find).toHaveBeenCalledWith({
        category: 'cat1',
        _id: { $ne: '1' },
      });
      expect(mockQuery.select).toHaveBeenCalledWith('-photo');
      expect(mockQuery.limit).toHaveBeenCalledWith(3);
      expect(mockQuery.populate).toHaveBeenCalledWith('category');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        products: mockProducts,
      });
    });

    it('should handle error when getting related products fails', async () => {
      const mockError = new Error('Related products error');
      req.params = {
        pid: '1',
        cid: 'cat1',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        populate: jest.fn().mockRejectedValue(mockError),
      };

      productModel.find.mockReturnValue(mockQuery);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await realtedProductController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: 'error while geting related product',
        error: mockError,
      });

      consoleLogSpy.mockRestore();
    });
  });

  describe('productCategoryController', () => {
    it('should get products by category successfully', async () => {
      const mockCategory = { _id: 'cat1', name: 'Electronics', slug: 'electronics' };
      const mockProducts = [
        { _id: '1', name: 'Product 1', category: 'cat1' },
        { _id: '2', name: 'Product 2', category: 'cat1' },
      ];
      req.params.slug = 'electronics';

      categoryModel.findOne.mockResolvedValue(mockCategory);

      const mockQuery = {
        populate: jest.fn().mockResolvedValue(mockProducts),
      };

      productModel.find.mockReturnValue(mockQuery);

      await productCategoryController(req, res);

      expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: 'electronics' });
      expect(productModel.find).toHaveBeenCalledWith({ category: mockCategory });
      expect(mockQuery.populate).toHaveBeenCalledWith('category');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        category: mockCategory,
        products: mockProducts,
      });
    });

    it('should handle error when getting products by category fails', async () => {
      const mockError = new Error('Category error');
      req.params.slug = 'electronics';

      categoryModel.findOne.mockRejectedValue(mockError);

      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      await productCategoryController(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(mockError);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        error: mockError,
        message: 'Error While Getting products',
      });

      consoleLogSpy.mockRestore();
    });
  });
});
