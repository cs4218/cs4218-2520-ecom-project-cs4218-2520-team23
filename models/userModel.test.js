// Liu Yiyang, A0258121M
import mongoose from 'mongoose';
import userModel from './userModel.js';

describe('User Model Tests', () => {
  it('should create a valid user', () => {
    const validUser = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St', city: 'New York' },
      answer: 'Blue'
    });
    const error = validUser.validateSync();
    expect(error).toBeUndefined();
  });

  it('should fail validation when required fields are missing', () => {
    const user = new userModel({});
    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.phone).toBeDefined();
    expect(error.errors.address).toBeDefined();
    expect(error.errors.answer).toBeDefined();
  });

  it('should fail validation without name', () => {
    const user = new userModel({
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.name).toBeDefined();
    expect(error.errors.name.kind).toBe('required');
  });

  it('should fail validation without email', () => {
    const user = new userModel({
      name: 'John Doe',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.email).toBeDefined();
    expect(error.errors.email.kind).toBe('required');
  });

  it('should fail validation without password', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.password).toBeDefined();
    expect(error.errors.password.kind).toBe('required');
  });

  it('should fail validation without phone', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.phone).toBeDefined();
    expect(error.errors.phone.kind).toBe('required');
  });

  it('should fail validation without address', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.address).toBeDefined();
    expect(error.errors.address.kind).toBe('required');
  });

  it('should fail validation without answer (security question)', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
    });

    const error = user.validateSync();

    expect(error).toBeDefined();
    expect(error.errors.answer).toBeDefined();
    expect(error.errors.answer.kind).toBe('required');
  });

  it('should accept valid string for name', () => {
    const user = new userModel({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'hashedpass',
      phone: '9876543210',
      address: { city: 'Boston' },
      answer: 'Green',
    });

    expect(typeof user.name).toBe('string');
    expect(user.name).toBe('Jane Smith');
  });

  it('should accept valid string for email', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'test@domain.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Blue',
    });

    expect(typeof user.email).toBe('string');
    expect(user.email).toBe('test@domain.com');
  });
    
  it('should accept valid string for password', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'secureHashedPassword123',
      phone: '1234567890',
      address: {},
      answer: 'Blue',
    });

    expect(typeof user.password).toBe('string');
    expect(user.password).toBe('secureHashedPassword123');
  });

  it('should accept valid string for phone', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '+1-555-123-4567',
      address: {},
      answer: 'Blue',
    });

    expect(typeof user.phone).toBe('string');
    expect(user.phone).toBe('+1-555-123-4567');
  });

  it('should accept valid string for answer', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'My favorite color is blue',
    });

    expect(typeof user.answer).toBe('string');
    expect(user.answer).toBe('My favorite color is blue');
  });

  it('should accept simple address object', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    const error = user.validateSync();
    
    expect(error).toBeUndefined();
    expect(user.address.street).toBe('123 Main St');
  });

  it('should accept complex address object with multiple fields', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'USA',
      },
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.address.street).toBe('123 Main St');
    expect(user.address.city).toBe('New York');
    expect(user.address.state).toBe('NY');
    expect(user.address.zip).toBe('10001');
    expect(user.address.country).toBe('USA');
  });

  it('should accept empty address object', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Blue',
    });

    const error = user.validateSync();

    expect(error).toBeUndefined();
    expect(user.address).toEqual({});
  });
 
  it('should trim leading and trailing whitespace from name', () => {
    const user = new userModel({
      name: '  John Doe  ',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });
    expect(user.name).toBe('John Doe');
  });

  it('should trim only leading whitespace', () => {
    const user = new userModel({
      name: '   Jane Smith',
      email: 'jane@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Green',
    });

    expect(user.name).toBe('Jane Smith');
  });

  it('should trim only trailing whitespace', () => {
    const user = new userModel({
      name: 'Bob Jones   ',
      email: 'bob@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Red',
    });

    expect(user.name).toBe('Bob Jones');
  });

  it('should preserve internal whitespace in name', () => {
    const user = new userModel({
      name: '  John   Middle   Doe  ',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Blue',
    });

    expect(user.name).toBe('John   Middle   Doe');
  });

  it('should have default role of 0 (regular user)', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue',
    });

    expect(user.role).toBe(0);
    expect(typeof user.role).toBe('number');
  });

  it('should accept role value of 1 (admin)', () => {
    const adminUser = new userModel({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Red',
      role: 1,
    });

    expect(adminUser.role).toBe(1);
  });

  it('should accept role value of 0 explicitly set', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Blue',
      role: 0,
    });

    expect(user.role).toBe(0);
  });

  it('should not accept negative role values', () => {
    const user = new userModel({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Yellow',
      role: -1,
    });

    const error = user.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
    expect(error.errors.role.kind).toBe('enum');
  });

  it('should not accept any values that is not 0 or 1', () => {
    const user = new userModel({
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedpass',
      phone: '1234567890',
      address: {},
      answer: 'Purple',
      role: 999,
    });

    const error = user.validateSync();
    expect(error).toBeDefined();
    expect(error.errors.role).toBeDefined();
    expect(error.errors.role.kind).toBe('enum');
  });

  it('should have timestamps enabled in schema', () => {
    // Arrange: Get schema configuration
    const schema = userModel.schema;
    expect(schema.options.timestamps).toBe(true);
  });

  it('should have correct model name', () => {
    expect(userModel.modelName).toBe('users');
  });

  it('should have correct collection name', () => {
    expect(userModel.collection.name).toBe('users');
  });

  describe('Edge Cases', () => {
    it('should handle very long string values', () => {
      const longString = 'a'.repeat(1000);
      const user = new userModel({
        name: longString,
        email: `${longString}@example.com`,
        password: longString,
        phone: longString,
        address: { street: longString },
        answer: longString,
      });

      const error = user.validateSync();

      expect(error).toBeUndefined();
      expect(user.name).toBe(longString);
    });

    it('should handle special characters in string fields', () => {
      const user = new userModel({
        name: "John O'Doe-Smith Jr.",
        email: 'test+tag@example.co.uk',
        password: 'P@ssw0rd!#$%',
        phone: '+1 (555) 123-4567',
        address: { street: '123½ Main St., Apt #5' },
        answer: 'My pet\'s name is "Fluffy"',
      });

      const error = user.validateSync();

      expect(error).toBeUndefined();
      expect(user.name).toBe("John O'Doe-Smith Jr.");
    });
  });
});