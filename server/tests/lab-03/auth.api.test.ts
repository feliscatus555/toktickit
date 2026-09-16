import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Auth API Integration Tests (Feature-9)", () => {
  const prisma = getPrisma();

  beforeEach(async () => {
    // Reset initial user to ensure idempotent test runs
    const initialHash = await bcrypt.hash("InitialPassword123!", 10);
    await prisma.user.upsert({
      where: { email: "initial.user@kmutt.ac.th" },
      update: {
        passwordHash: initialHash,
        mustChangePassword: true,
        isActive: true,
      },
      create: {
        email: "initial.user@kmutt.ac.th",
        displayName: "Initial Password User",
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: true,
        passwordHash: initialHash,
      },
    });
  });

  describe("API-01: Valid user authentication (POST /api/auth/login)", () => {
    it("returns 200 with JWT token and user identity for valid credentials", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "somchai.p@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(typeof res.body.token).toBe("string");
      expect(res.body.user).toMatchObject({
        email: "somchai.p@kmutt.ac.th",
        displayName: "Somchai Pattana",
        role: "REQUESTER",
        mustChangePassword: false,
      });
    });

    it("verifies GET /api/auth/me returns current user identity with valid token", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "somchai.p@kmutt.ac.th",
          password: "Password123!",
        });

      const token = loginRes.body.token;

      const meRes = await request(app)
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`);

      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toMatchObject({
        email: "somchai.p@kmutt.ac.th",
        displayName: "Somchai Pattana",
        role: "REQUESTER",
        mustChangePassword: false,
      });
    });

    it("returns 401 for GET /api/auth/me without authorization token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("API-02: Inactive user and invalid credentials rejection", () => {
    it("rejects login for inactive user with safe 401 error message", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "inactive.test@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email address or password.");
    });

    it("rejects login for non-existent email with safe 401 error message", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "nonexistent.user@kmutt.ac.th",
          password: "Password123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email address or password.");
    });

    it("rejects login for incorrect password with safe 401 error message", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "somchai.p@kmutt.ac.th",
          password: "WrongPassword999!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
      expect(res.body.error.message).toBe("Invalid email address or password.");
    });

    it("returns 422 if email or password is missing in login payload", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({});

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_FAILED");
      expect(res.body.error.fieldErrors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "email" }),
          expect.objectContaining({ field: "password" }),
        ])
      );
    });
  });

  describe("API-03: User requiring password change gate", () => {
    it("logs in with mustChangePassword = true flag set", async () => {
      const res = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.body.token).toBeDefined();
    });

    it("restricts access to application ticket endpoints when mustChangePassword is true", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      const token = loginRes.body.token;

      // Accessing tickets should be forbidden with MUST_CHANGE_PASSWORD
      const ticketRes = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(ticketRes.status).toBe(403);
      expect(ticketRes.body.error.code).toBe("MUST_CHANGE_PASSWORD");
    });
  });

  describe("API-04: Password change execution (POST /api/auth/change-password)", () => {
    it("rejects password change if new password does not meet complexity", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "InitialPassword123!",
          newPassword: "weak",
          confirmPassword: "weak",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("PASSWORD_TOO_WEAK");
    });

    it("rejects password change if confirmation does not match", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "InitialPassword123!",
          newPassword: "NewPassword123!",
          confirmPassword: "DifferentPassword123!",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("PASSWORD_MISMATCH");
    });

    it("rejects password change if current password is incorrect", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "IncorrectPassword123!",
          newPassword: "NewValidPassword123!",
          confirmPassword: "NewValidPassword123!",
        });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
    });

    it("successfully updates password, clears mustChangePassword, and allows normal access", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "InitialPassword123!",
        });

      const token = loginRes.body.token;

      const changeRes = await request(app)
        .post("/api/auth/change-password")
        .set("Authorization", `Bearer ${token}`)
        .send({
          currentPassword: "InitialPassword123!",
          newPassword: "NewSecurePassword2026!",
          confirmPassword: "NewSecurePassword2026!",
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.user.mustChangePassword).toBe(false);

      // Now accessing tickets should succeed (200 OK)
      const ticketRes = await request(app)
        .get("/api/tickets")
        .set("Authorization", `Bearer ${token}`);

      expect(ticketRes.status).toBe(200);

      // Verify login with new password works
      const newLoginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "initial.user@kmutt.ac.th",
          password: "NewSecurePassword2026!",
        });

      expect(newLoginRes.status).toBe(200);
      expect(newLoginRes.body.user.mustChangePassword).toBe(false);
    });
  });

  describe("API-05: User logout (POST /api/auth/logout)", () => {
    it("returns 200 with success message on logout", async () => {
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({
          email: "somchai.p@kmutt.ac.th",
          password: "Password123!",
        });

      const token = loginRes.body.token;

      const res = await request(app)
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Successfully logged out.");
    });
  });
});
