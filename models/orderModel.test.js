// models/orderModel.test.js
import Order from "./orderModel.js";

// Liu Shixin, A0265144H
describe("models/orderModel.js (Order schema)", () => {
  // Liu Shixin, A0265144H
  test("defines schema fields correctly (types/refs/timestamps)", () => {
    // Arrange
    const schema = Order.schema;

    // Act
    const productsPath = schema.path("products");
    const buyerPath = schema.path("buyer");
    const paymentPath = schema.path("payment");
    const statusPath = schema.path("status");

    // Assert
    expect(Order.modelName).toBe("Order");

    // products: array of ObjectId with ref "Products"
    expect(productsPath.instance).toBe("Array");
    expect(productsPath.caster.instance).toBe("ObjectId");
    expect(productsPath.caster.options.ref).toBe("Products");

    // buyer: ObjectId with ref "users"
    expect(buyerPath.instance).toBe("ObjectId");
    expect(buyerPath.options.ref).toBe("users");

    // payment: Mixed (because schema uses {})
    expect(paymentPath.instance).toBe("Mixed");

    // status: has default + enum
    expect(statusPath.instance).toBe("String");
    expect(statusPath.options.default).toBe("Not Process");
    expect(statusPath.enumValues).toEqual([
      "Not Process",
      "Processing",
      "Shipped",
      "deliverd",
      "cancel",
    ]);

    // timestamps enabled
    expect(schema.options.timestamps).toBe(true);
  });

  // Liu Shixin, A0265144H
  test('defaults status to "Not Process" when missing', () => {
    // Arrange
    const doc = new Order({});

    // Act
    const validationError = doc.validateSync();

    // Assert
    expect(validationError).toBeUndefined();
    expect(doc.status).toBe("Not Process");
  });

  // Liu Shixin, A0265144H
  test("accepts all allowed status enum values", () => {
    // Arrange
    const allowed = [
      "Not Process",
      "Processing",
      "Shipped",
      "deliverd",
      "cancel",
    ];

    for (const status of allowed) {
      // Act
      const doc = new Order({ status });
      const validationError = doc.validateSync();

      // Assert
      expect(validationError).toBeUndefined();
    }
  });

  // Liu Shixin, A0265144H
  test("rejects invalid status values with validation error", () => {
    // Arrange
    const doc = new Order({ status: "INVALID_STATUS" });

    // Act
    const err = doc.validateSync();

    // Assert
    expect(err).toBeTruthy();
    expect(err.errors).toBeTruthy();
    expect(err.errors.status).toBeTruthy();
    expect(err.errors.status.name).toBe("ValidatorError");
  });
});
