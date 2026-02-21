// Tests written by: Liu Yiyang, A0258121M
import mongoose from 'mongoose';
import ProductModel from './productModel.js';

describe('ProductModel Schema Tests', () => {
  describe('Schema Validation', () => {
    it('should validate a product with all required fields', () => {
      const validProduct = new ProductModel({
        name: 'Test Product',
        slug: 'test-product',
        description: 'This is a test product description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = validProduct.validateSync();
      expect(error).toBeUndefined();
    });

    it('should fail validation when name is missing', () => {
      const product = new ProductModel({
        slug: 'test-product',
        description: 'Description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.name.kind).toBe('required');
    });

    it('should fail validation when slug is missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        description: 'Description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.slug).toBeDefined();
      expect(error.errors.slug.kind).toBe('required');
    });

    it('should fail validation when description is missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        slug: 'test-product',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.description.kind).toBe('required');
    });

    it('should fail validation when price is missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        slug: 'test-product',
        description: 'Description',
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.price).toBeDefined();
      expect(error.errors.price.kind).toBe('required');
    });

    it('should fail validation when category is missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        slug: 'test-product',
        description: 'Description',
        price: 99.99,
        quantity: 10,
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.category.kind).toBe('required');
    });

    it('should fail validation when quantity is missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        slug: 'test-product',
        description: 'Description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
      });

      const error = product.validateSync();
      expect(error).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
      expect(error.errors.quantity.kind).toBe('required');
    });
  });

  describe('Schema Field Types', () => {
    it('should accept valid string for name', () => {
      const product = new ProductModel({
        name: 'Product Name',
        slug: 'product-slug',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.name).toBe('Product Name');
      expect(typeof product.name).toBe('string');
    });

    it('should accept valid number for price', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.price).toBe(99.99);
      expect(typeof product.price).toBe('number');
    });

    it('should accept valid number for quantity', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 100,
      });

      expect(product.quantity).toBe(100);
      expect(typeof product.quantity).toBe('number');
    });

    it('should accept valid ObjectId for category', () => {
      const categoryId = new mongoose.Types.ObjectId();
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: categoryId,
        quantity: 5,
      });

      expect(product.category).toEqual(categoryId);
    });

    it('should accept boolean for shipping', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        shipping: true,
      });

      expect(product.shipping).toBe(true);
      expect(typeof product.shipping).toBe('boolean');
    });

    it('should allow shipping to be undefined', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.shipping).toBeUndefined();
    });
  });

  describe('Photo Field', () => {
    it('should accept photo with data and contentType', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        photo: {
          data: Buffer.from('test image data'),
          contentType: 'image/jpeg',
        },
      });

      expect(product.photo.data).toBeInstanceOf(Buffer);
      expect(product.photo.contentType).toBe('image/jpeg');
    });

    it('should allow photo to be undefined or empty object', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      // Mongoose creates an empty object for subdocuments even when not provided
      expect(product.photo).toBeDefined();
      expect(product.photo.data).toBeUndefined();
      expect(product.photo.contentType).toBeUndefined();
    });
  });

  describe('Timestamps', () => {
    it('should have timestamps enabled in schema', () => {
      const schema = ProductModel.schema;
      expect(schema.options.timestamps).toBe(true);
    });
  });

  describe('Model Properties', () => {
    it('should have correct model name', () => {
      expect(ProductModel.modelName).toBe('Products');
    });

    it('should have correct collection name', () => {
      expect(ProductModel.collection.name).toBe('products');
    });
  });
});
