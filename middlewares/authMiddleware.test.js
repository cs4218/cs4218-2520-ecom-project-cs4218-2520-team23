// Dong Cheng-Yu, A0262348B
import { requireSignIn, isAdmin } from "./authMiddleware";
import JWT from "jsonwebtoken";
import userModel from "../models/userModel.js";

describe("authMiddleware", () => {
  describe("requireSignIn", () => {
    it("should decode JWT and attach user to req, then call next", async () => {
      const fakeUser = { _id: "123", role: 0 };
      const token = "valid.token";
      const req = { headers: { authorization: token } };
      const res = {};
      const next = jest.fn();
      jest.spyOn(JWT, "verify").mockReturnValue(fakeUser);

      await requireSignIn(req, res, next);

      expect(JWT.verify).toHaveBeenCalledWith(token, process.env.JWT_SECRET);
      expect(req.user).toEqual(fakeUser);
      expect(next).toHaveBeenCalled();
      JWT.verify.mockRestore();
    });

    it("should log error and send 401 if JWT is invalid", async () => {
      const req = { headers: { authorization: "bad.token" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();
      jest.spyOn(JWT, "verify").mockImplementation(() => {
        throw new Error("bad token");
      });
      const spy = jest.spyOn(console, "log").mockImplementation(() => {});

      await requireSignIn(req, res, next);

      expect(spy).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized or invalid token",
      });
      expect(next).not.toHaveBeenCalled();
      JWT.verify.mockRestore();
      spy.mockRestore();
    });
  });

  describe("isAdmin", () => {
    it("should call next if user is admin", async () => {
      const req = { user: { _id: "adminid" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();
      jest.spyOn(userModel, "findById").mockResolvedValue({ role: 1 });

      await isAdmin(req, res, next);

      expect(userModel.findById).toHaveBeenCalledWith("adminid");
      expect(next).toHaveBeenCalled();
      userModel.findById.mockRestore();
    });

    it("should send 401 if user is not admin", async () => {
      const req = { user: { _id: "userid" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();
      jest.spyOn(userModel, "findById").mockResolvedValue({ role: 0 });

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith({
        success: false,
        message: "UnAuthorized Access",
      });
      expect(next).not.toHaveBeenCalled();
      userModel.findById.mockRestore();
    });

    it("should handle errors and send 401", async () => {
      const req = { user: { _id: "userid" } };
      const res = { status: jest.fn().mockReturnThis(), send: jest.fn() };
      const next = jest.fn();
      jest.spyOn(userModel, "findById").mockImplementation(() => {
        throw new Error("db error");
      });
      const spy = jest.spyOn(console, "log").mockImplementation(() => {});

      await isAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Error in admin middleware",
        }),
      );
      expect(spy).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
      userModel.findById.mockRestore();
      spy.mockRestore();
    });
  });
});
