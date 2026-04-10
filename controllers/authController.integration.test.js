// Kevin Liu, A0265144H
import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import {
  loginController,
  registerController,
} from "./authController.js";
import userModel from "../models/userModel.js";

const createAuthTestApp = () => {
  const app = express();
  app.use(express.json());

  app.post("/api/v1/auth/register", registerController);
  app.post("/api/v1/auth/login", loginController);

  return app;
};

const validUser = {
  name: "Kevin Test User",
  email: "kevin-auth@example.com",
  password: "secret123",
  phone: "91234567",
  address: "NUS Computing",
  answer: "blue",
};

describe("authController integration", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = "ms2-integration-secret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "cs4218-ms2-auth-controller",
    });
    app = createAuthTestApp();
  });

  afterEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  test("register stores a hashed password instead of plaintext", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(validUser);

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.user.email).toBe(validUser.email);

    const savedUser = await userModel.findOne({ email: validUser.email }).lean();
    expect(savedUser).not.toBeNull();
    expect(savedUser.password).not.toBe(validUser.password);
    expect(savedUser.password.startsWith("$2")).toBe(true);
  });

  test("login succeeds after real registration and returns a JWT token", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: validUser.password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe("login successfully");
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user).toEqual(
      expect.objectContaining({
        email: validUser.email,
        name: validUser.name,
        role: 0,
      })
    );
  });

  test("login returns 404 when email is not registered", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "anything" });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Email is not registered");
    expect(response.body.token).toBeUndefined();
  });

  test("register rejects duplicate email with 409", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(validUser);

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe("Already Register please login");
  });

  test("register returns an error message when required fields are missing", async () => {
    const incompleteUser = { name: "No Email User" };

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send(incompleteUser);

    expect(response.status).toBe(200);
    expect(response.body.message).toBeDefined();
  });

  test("login fails with 401 when the password is wrong", async () => {
    await request(app).post("/api/v1/auth/register").send(validUser);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: validUser.email, password: "wrong-password" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,
        message: "Invalid Password",
      })
    );
    expect(response.body.token).toBeUndefined();
  });
});
