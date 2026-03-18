// Kevin Liu, A0265144H
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  loginController,
  registerController,
  testController,
} from "../controllers/authController.js";
import { isAdmin, requireSignIn } from "./authMiddleware.js";
import userModel from "../models/userModel.js";

const createProtectedAuthTestApp = () => {
  const app = express();
  app.use(express.json());

  app.post("/api/v1/auth/register", registerController);
  app.post("/api/v1/auth/login", loginController);
  app.get("/api/v1/auth/user-auth", requireSignIn, (req, res) => {
    res.status(200).send({ ok: true });
  });
  app.get("/api/v1/auth/admin-auth", requireSignIn, isAdmin, (req, res) => {
    res.status(200).send({ ok: true });
  });
  app.get("/api/v1/auth/test", requireSignIn, isAdmin, testController);

  return app;
};

const buildUserPayload = (email) => ({
  name: "Kevin Middleware User",
  email,
  password: "secret123",
  phone: "98765432",
  address: "School of Computing",
  answer: "green",
});

const registerAndLogin = async (app, email = "middleware-user@example.com") => {
  const user = buildUserPayload(email);
  await request(app).post("/api/v1/auth/register").send(user);
  const loginResponse = await request(app)
    .post("/api/v1/auth/login")
    .send({ email: user.email, password: user.password });

  return {
    user,
    token: loginResponse.body.token,
  };
};

describe("authMiddleware integration", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "ms2-integration-secret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "cs4218-ms2-auth-middleware",
    });
    app = createProtectedAuthTestApp();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test("login token grants access to /user-auth", async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  test("non-admin token is rejected by /admin-auth", async () => {
    const { token } = await registerAndLogin(app);

    const response = await request(app)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", token);

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "UnAuthorized Access",
      })
    );
  });

  test("admin user can access /admin-auth after role update", async () => {
    const { user } = await registerAndLogin(app, "admin-user@example.com");

    await userModel.findOneAndUpdate({ email: user.email }, { role: 1 });

    const adminLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: user.password });

    const response = await request(app)
      .get("/api/v1/auth/admin-auth")
      .set("Authorization", adminLoginResponse.body.token);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true });
  });

  test("admin token can access the full /test route chain", async () => {
    const { user } = await registerAndLogin(app, "admin-route@example.com");

    await userModel.findOneAndUpdate({ email: user.email }, { role: 1 });

    const adminLoginResponse = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: user.email, password: user.password });

    const response = await request(app)
      .get("/api/v1/auth/test")
      .set("Authorization", adminLoginResponse.body.token);

    expect(response.status).toBe(200);
    expect(response.text).toBe("Protected Routes");
  });

  test("missing or invalid tokens are rejected by requireSignIn", async () => {
    const missingTokenResponse = await request(app).get(
      "/api/v1/auth/user-auth"
    );
    expect(missingTokenResponse.status).toBe(401);
    expect(missingTokenResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Unauthorized or invalid token",
      })
    );

    const invalidTokenResponse = await request(app)
      .get("/api/v1/auth/user-auth")
      .set("Authorization", "not-a-valid-jwt");

    expect(invalidTokenResponse.status).toBe(401);
    expect(invalidTokenResponse.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Unauthorized or invalid token",
      })
    );
  });
});
