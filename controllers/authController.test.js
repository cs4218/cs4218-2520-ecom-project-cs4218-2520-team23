// Dong Cheng-Yu, A0262348B
import * as authController from "./authController";
import userModel from "../models/userModel.js";
import orderModel from "../models/orderModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";
import JWT from "jsonwebtoken";

jest.mock("../models/userModel.js");
jest.mock("../models/orderModel.js");
jest.mock("../helpers/authHelper.js");
jest.mock("jsonwebtoken");

describe("authController", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("registerController", () => {
    it("should return error if name is missing", async () => {
      const req = {
        body: {
          name: "",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Name is Required" });
    });

    it("should return error if email is missing", async () => {
      const req = {
        body: {
          name: "Test",
          email: "",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Email is Required" });
    });

    it("should return error if password is missing", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Password is Required",
      });
    });

    it("should return error if phone is missing", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({
        message: "Phone number is Required",
      });
    });

    it("should return error if address is missing", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "",
          answer: "ans",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Address is Required" });
    });

    it("should return error if answer is missing", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "",
        },
      };
      const res = { send: jest.fn() };

      await authController.registerController(req, res);

      expect(res.send).toHaveBeenCalledWith({ message: "Answer is Required" });
    });

    it("should return 409 if user already exists", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      userModel.findOne.mockResolvedValue({ _id: "existing" });

      await authController.registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Already Register please login",
      });
    });

    it("should register user successfully with correct status code 201", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const newUser = { _id: "1", name: "Test", email: "test@test.com" };

      userModel.findOne.mockResolvedValue(null);
      hashPassword.mockResolvedValue("hashedpass");
      userModel.mockImplementation(() => ({
        save: jest.fn().mockResolvedValue(newUser),
      }));

      await authController.registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User Register Successfully",
        }),
      );
    });

    it("should handle registration error", async () => {
      const req = {
        body: {
          name: "Test",
          email: "test@test.com",
          password: "pass",
          phone: "123",
          address: "addr",
          answer: "ans",
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      userModel.findOne.mockRejectedValue(error);

      await authController.registerController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in Registration",
        }),
      );
    });
  });

  describe("loginController", () => {
    it("should return 404 error if email and password missing", async () => {
      const req = { body: { email: "", password: "" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await authController.loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid email or password",
      });
    });

    it("should return 404 if user not found", async () => {
      const req = { body: { email: "test@test.com", password: "pass" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      userModel.findOne.mockResolvedValue(null);

      await authController.loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Email is not registered",
      });
    });

    it("should return 401 if password does not match", async () => {
      const req = { body: { email: "test@test.com", password: "wrongpass" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = { _id: "1", email: "test@test.com", password: "hashed" };

      userModel.findOne.mockResolvedValue(user);
      comparePassword.mockResolvedValue(false);

      await authController.loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid Password",
      });
    });

    it("should login successfully and return token", async () => {
      const req = { body: { email: "test@test.com", password: "pass" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "Test",
        email: "test@test.com",
        phone: "123",
        address: "addr",
        role: 0,
        password: "hashed",
      };

      userModel.findOne.mockResolvedValue(user);
      comparePassword.mockResolvedValue(true);
      JWT.sign.mockReturnValue("token123");

      await authController.loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "login successfully",
          token: "token123",
        }),
      );
    });

    it("should handle login error", async () => {
      const req = { body: { email: "test@test.com", password: "pass" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      userModel.findOne.mockRejectedValue(error);

      await authController.loginController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in login",
        }),
      );
    });
  });

  describe("forgotPasswordController", () => {
    it("should return 400 if email is missing", async () => {
      const req = {
        body: { email: "", answer: "ans", newPassword: "newpass" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await authController.forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "Email is required" });
    });

    it("should return 400 if answer is missing", async () => {
      const req = {
        body: { email: "test@test.com", answer: "", newPassword: "newpass" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await authController.forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({ message: "answer is required" });
    });

    it("should return 400 if newPassword is missing", async () => {
      const req = {
        body: { email: "test@test.com", answer: "ans", newPassword: "" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      await authController.forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: "New Password is required",
      });
    });

    it("should return 404 if wrong email or answer", async () => {
      const req = {
        body: {
          email: "test@test.com",
          answer: "wrong",
          newPassword: "newpass",
        },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };

      userModel.findOne.mockResolvedValue(null);

      await authController.forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Wrong Email Or Answer",
      });
    });

    it("should reset password successfully", async () => {
      const req = {
        body: { email: "test@test.com", answer: "ans", newPassword: "newpass" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = { _id: "1", email: "test@test.com", answer: "ans" };

      userModel.findOne.mockResolvedValue(user);
      hashPassword.mockResolvedValue("newhashed");
      userModel.findByIdAndUpdate.mockResolvedValue({ _id: "1" });

      await authController.forgotPasswordController(req, res);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith("1", {
        password: "newhashed",
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith({
        success: true,
        message: "Password Reset Successfully",
      });
    });

    it("should handle forgot password error", async () => {
      const req = {
        body: { email: "test@test.com", answer: "ans", newPassword: "newpass" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      userModel.findOne.mockRejectedValue(error);

      await authController.forgotPasswordController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Something went wrong",
        }),
      );
    });
  });

  describe("testController", () => {
    it("should return protected route message", () => {
      const req = {};
      const res = { send: jest.fn() };

      authController.testController(req, res);

      expect(res.send).toHaveBeenCalledWith("Protected Routes");
    });

    it("should catch error and send error response", () => {
      const req = {};
      const res = { send: jest.fn() };
      const consoleSpy = jest
        .spyOn(console, "log")
        .mockImplementation(() => {});
      const error = new Error("Test error");

      res.send.mockImplementationOnce(() => {
        throw error;
      });

      authController.testController(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      expect(res.send).toHaveBeenCalledTimes(2);
      expect(res.send).toHaveBeenNthCalledWith(2, { error });
      consoleSpy.mockRestore();
    });
  });

  describe("updateProfileController", () => {
    it("should return error if password is less than 6 characters", async () => {
      const req = { user: { _id: "1" }, body: { password: "short" } };
      const res = { json: jest.fn() };

      userModel.findById.mockResolvedValue({ _id: "1", name: "Test" });

      await authController.updateProfileController(req, res);

      expect(res.json).toHaveBeenCalledWith({
        error: "Password is required and 6 character long",
      });
    });

    it("should update profile without password", async () => {
      const req = {
        user: { _id: "1" },
        body: { name: "Updated", email: "updated@test.com" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "Test",
        password: "hashed",
        phone: "123",
        address: "addr",
      };
      const updatedUser = {
        _id: "1",
        name: "Updated",
        email: "updated@test.com",
      };

      userModel.findById.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(updatedUser);

      await authController.updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile Updated Successfully",
        }),
      );
    });

    it("should update profile with new password", async () => {
      const req = {
        user: { _id: "1" },
        body: { name: "Test", password: "newpass123" },
      };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "Test",
        password: "hashed",
        phone: "123",
        address: "addr",
      };

      userModel.findById.mockResolvedValue(user);
      hashPassword.mockResolvedValue("newhashed");
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      await authController.updateProfileController(req, res);

      expect(hashPassword).toHaveBeenCalledWith("newpass123");
      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should use existing name when not provided in update", async () => {
      const req = { user: { _id: "1" }, body: { phone: "999" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "ExistingName",
        password: "hashed",
        phone: "123",
        address: "addr",
      };

      userModel.findById.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      await authController.updateProfileController(req, res);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          name: "ExistingName",
          phone: "999",
        }),
        { new: true },
      );
    });

    it("should use existing phone when not provided in update", async () => {
      const req = { user: { _id: "1" }, body: { name: "NewName" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "Test",
        password: "hashed",
        phone: "123",
        address: "addr",
      };

      userModel.findById.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      await authController.updateProfileController(req, res);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          phone: "123",
        }),
        { new: true },
      );
    });

    it("should use existing address when not provided in update", async () => {
      const req = { user: { _id: "1" }, body: { name: "NewName" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const user = {
        _id: "1",
        name: "Test",
        password: "hashed",
        phone: "123",
        address: "OldAddr",
      };

      userModel.findById.mockResolvedValue(user);
      userModel.findByIdAndUpdate.mockResolvedValue(user);

      await authController.updateProfileController(req, res);

      expect(userModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          address: "OldAddr",
        }),
        { new: true },
      );
    });

    it("should handle update profile error", async () => {
      const req = { user: { _id: "1" }, body: { name: "Test" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      userModel.findById.mockRejectedValue(error);

      await authController.updateProfileController(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Updating profile",
        }),
      );
    });
  });

  describe("getOrdersController", () => {
    it("should get user orders", async () => {
      const req = { user: { _id: "1" } };
      const res = { json: jest.fn() };
      const orders = [{ _id: "o1", buyer: "1", status: "delivered" }];

      orderModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockResolvedValue(orders),
        }),
      });

      await authController.getOrdersController(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({ buyer: "1" });
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("should handle get orders error", async () => {
      const req = { user: { _id: "1" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      orderModel.find.mockImplementation(() => {
        throw error;
      });

      await authController.getOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Getting Orders",
        }),
      );
    });
  });

  describe("getAllOrdersController", () => {
    it("should get all orders sorted by creation date", async () => {
      const req = {};
      const res = { json: jest.fn() };
      const orders = [
        { _id: "o1", buyer: "1", status: "delivered" },
        { _id: "o2", buyer: "2", status: "pending" },
      ];

      orderModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            sort: jest.fn().mockResolvedValue(orders),
          }),
        }),
      });

      await authController.getAllOrdersController(req, res);

      expect(orderModel.find).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(orders);
    });

    it("should handle get all orders error", async () => {
      const req = {};
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      orderModel.find.mockImplementation(() => {
        throw error;
      });

      await authController.getAllOrdersController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Getting Orders",
        }),
      );
    });
  });

  describe("orderStatusController", () => {
    it("should update order status", async () => {
      const req = { params: { orderId: "o1" }, body: { status: "shipped" } };
      const res = { json: jest.fn() };
      const updatedOrder = { _id: "o1", status: "shipped" };

      userModel.findByIdAndUpdate = jest.fn();
      orderModel.findByIdAndUpdate.mockResolvedValue(updatedOrder);

      await authController.orderStatusController(req, res);

      expect(orderModel.findByIdAndUpdate).toHaveBeenCalledWith(
        "o1",
        { status: "shipped" },
        { new: true },
      );
      expect(res.json).toHaveBeenCalledWith(updatedOrder);
    });

    it("should handle order status update error", async () => {
      const req = { params: { orderId: "o1" }, body: { status: "shipped" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const error = new Error("DB Error");

      orderModel.findByIdAndUpdate.mockRejectedValue(error);

      await authController.orderStatusController(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error While Updating Order",
        }),
      );
    });
  });
});
