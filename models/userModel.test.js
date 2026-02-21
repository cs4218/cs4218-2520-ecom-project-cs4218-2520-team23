// Tests written by: Liu Yiyang, A0258121M
import mongoose from 'mongoose';
import userModel from './userModel.js';

describe('User Model Test', () => {
  // Test valid user creation
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

  // Test default role value
  it('should have default role of 0', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    expect(user.role).toBe(0);
  });

  // Test required fields
  it('should fail validation without required fields', () => {
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

  // Test individual required fields
  it('should fail validation without name', () => {
    const user = new userModel({
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error.errors.name).toBeDefined();
  });

  it('should fail validation without email', () => {
    const user = new userModel({
      name: 'John Doe',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error.errors.email).toBeDefined();
  });

  it('should fail validation without password', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error.errors.password).toBeDefined();
  });

  it('should fail validation without phone', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error.errors.phone).toBeDefined();
  });

  it('should fail validation without address', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error.errors.address).toBeDefined();
  });

  it('should fail validation without answer', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' }
    });

    const error = user.validateSync();
    expect(error.errors.answer).toBeDefined();
  });

  // Test trim on name field
  it('should trim whitespace from name', () => {
    const user = new userModel({
      name: '  John Doe  ',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Blue'
    });

    expect(user.name).toBe('John Doe');
  });

  // Test custom role value
  it('should accept custom role value', () => {
    const adminUser = new userModel({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { street: '123 Main St' },
      answer: 'Red',
      role: 1
    });

    expect(adminUser.role).toBe(1);
  });

  // Test that address can be an object
  it('should accept address as an object', () => {
    const user = new userModel({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'hashedpassword123',
      phone: '1234567890',
      address: { 
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        zip: '10001'
      },
      answer: 'Blue'
    });

    const error = user.validateSync();
    expect(error).toBeUndefined();
    expect(user.address.street).toBe('123 Main St');
    expect(user.address.city).toBe('New York');
  });

  // Test model name
  it('should have correct model name', () => {
    expect(userModel.modelName).toBe('users');
  });
});
