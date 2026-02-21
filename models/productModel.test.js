// Liu Yiyang, A0258121M
import mongoose from 'mongoose';
import ProductModel from './productModel.js';

describe('ProductModel Schema Tests', () => {
  describe('Schema Validation', () => {
    it('should validate product with all required fields', () => {
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

    it('should fail validation when multiple fields are missing', () => {
      const product = new ProductModel({
        name: 'Test Product',
        price: 50,
      });

      const error = product.validateSync();

      expect(error).toBeDefined();
      expect(error.errors.slug).toBeDefined();
      expect(error.errors.description).toBeDefined();
      expect(error.errors.category).toBeDefined();
      expect(error.errors.quantity).toBeDefined();
    });
  });

  describe('Field Type Validation', () => {
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

    it('should accept valid string for slug', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'my-product-2024',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.slug).toBe('my-product-2024');
      expect(typeof product.slug).toBe('string');
    });

    it('should accept valid string for description', () => {
      const longDescription = 'This is a detailed product description with many words';
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: longDescription,
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.description).toBe(longDescription);
      expect(typeof product.description).toBe('string');
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
      expect(product.category).toBeInstanceOf(mongoose.Types.ObjectId);
    });
  });

  describe('Numeric Field Validation - Price', () => {
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

    it('should accept zero price', () => {
      const product = new ProductModel({
        name: 'Free Product',
        slug: 'free-product',
        description: 'Description',
        price: 0,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.price).toBe(0);
    });

    it('should accept very small decimal price', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 0.01,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      expect(product.price).toBe(0.01);
    });

    it('should accept large price value', () => {
      const product = new ProductModel({
        name: 'Luxury Product',
        slug: 'lux  ury',
        description: 'Description',
        price: 999999.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 1,
      });

      expect(product.price).toBe(999999.99);
    });
  });

  describe('Numeric Field Validation - Quantity', () => {
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

    it('should accept zero quantity', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 0,
      });

      expect(product.quantity).toBe(0);
    });

    it('should accept single unit quantity', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 1,
      });

      expect(product.quantity).toBe(1);
    });

    it('should accept large quantity', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 10000,
      });

      expect(product.quantity).toBe(10000);
    });
  });

  describe('Optional Fields - Shipping', () => {
    it('should accept boolean true for shipping', () => {
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

    it('should accept boolean false for shipping', () => {
      const product = new ProductModel({
        name: 'Digital Product',
        slug: 'digital',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        shipping: false,
      });

      expect(product.shipping).toBe(false);
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
      const imageData = Buffer.from('test image data');
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        photo: {
          data: imageData,
          contentType: 'image/jpeg',
        },
      });

      expect(product.photo.data).toBeInstanceOf(Buffer);
      expect(product.photo.data.toString()).toBe(imageData.toString());
      expect(product.photo.contentType).toBe('image/jpeg');
    });

    it('should accept different image content types', () => {
      const contentTypes = ['image/png', 'image/gif', 'image/webp', 'image/bmp'];
      
      contentTypes.forEach((contentType) => {
        const product = new ProductModel({
          name: 'Product',
          slug: 'product',
          description: 'Description',
          price: 50,
          category: new mongoose.Types.ObjectId(),
          quantity: 5,
          photo: {
            data: Buffer.from('image data'),
            contentType: contentType,
          },
        });

        expect(product.photo.contentType).toBe(contentType);
      });
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

    it('should accept photo with only data (no contentType)', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        photo: {
          data: Buffer.from('image'),
        },
      });

      expect(product.photo.data).toBeDefined();
      expect(product.photo.contentType).toBeUndefined();
    });

    it('should accept photo with only contentType (no data)', () => {
      const product = new ProductModel({
        name: 'Product',
        slug: 'product',
        description: 'Description',
        price: 50,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
        photo: {
          contentType: 'image/jpeg',
        },
      });

      expect(product.photo.data).toBeUndefined();
      expect(product.photo.contentType).toBe('image/jpeg');
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

  describe('Text field boundaries/edge cases', () => {
    it('should handle very long text values', () => {
      const longText = 'a'.repeat(10000);
      const product = new ProductModel({
        name: longText,
        slug: longText,
        description: longText,
        price: 99.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 10,
      });

      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.name.length).toBe(10000);
    });

    it('should handle special characters in text fields', () => {
      const product = new ProductModel({
        name: 'Product™ "Special" Edition',
        slug: 'product-special-2024',
        description: 'Contains: letters, números, 中文, emoji 🎉',
        price: 49.99,
        category: new mongoose.Types.ObjectId(),
        quantity: 5,
      });

      const error = product.validateSync();

      expect(error).toBeUndefined();
      expect(product.description).toContain('🎉');
    });
  });
});
