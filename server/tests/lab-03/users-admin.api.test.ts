import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Administrator User Management API Tests (Feature-12)", () => {
  const prisma = getPrisma();

  let adminToken: string;
  let adminUser: any;
  let itStaffToken: string;
  let requesterToken: string;

  // Cleanup helper for users created in tests
  const createdUserEmails: string[] = [];

  beforeAll(async () => {
    // 1. Authenticate John Smith (Admin)
    const adminRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" });
    expect(adminRes.status).toBe(200);
    adminToken = adminRes.body.token;
    adminUser = adminRes.body.user;

    // 2. Authenticate Sarah Johnson (IT Staff)
    const staffRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "sarah.johnson@kmutt.ac.th", password: "Password123!" });
    expect(staffRes.status).toBe(200);
    itStaffToken = staffRes.body.token;

    // 3. Authenticate Somchai Pattana (Requester)
    const reqRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "somchai.p@kmutt.ac.th", password: "Password123!" });
    expect(reqRes.status).toBe(200);
    requesterToken = reqRes.body.token;
  });

  afterAll(async () => {
    if (createdUserEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: createdUserEmails } },
      });
    }
  });

  // =========================================================================
  // API-17: Admin user list retrieval (AC-15, FR-32, AC-19, FR-41)
  // =========================================================================
  describe("API-17: Admin user list retrieval (AC-15, FR-32, AC-19, FR-41)", () => {
    it("allows Administrator to retrieve complete user list with name, email, role, status", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);

      const first = res.body[0];
      expect(first).toHaveProperty("id");
      expect(first).toHaveProperty("email");
      expect(first).toHaveProperty("displayName");
      expect(first).toHaveProperty("role");
      expect(first).toHaveProperty("isActive");
      expect(first).toHaveProperty("mustChangePassword");
      expect(first).not.toHaveProperty("passwordHash");
    });

    it("filters users by search keyword across name and email", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=sarah")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        const matchesName = u.displayName.toLowerCase().includes("sarah");
        const matchesEmail = u.email.toLowerCase().includes("sarah");
        expect(matchesName || matchesEmail).toBe(true);
      }
    });

    it("filters users by role (e.g. IT_STAFF)", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThan(0);
      for (const u of res.body) {
        expect(u.role).toBe("IT_STAFF");
      }
    });

    it("combines search query and role filter", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=johnson&role=IT_STAFF")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].email).toBe("sarah.johnson@kmutt.ac.th");
    });

    it("strictly returns 403 Forbidden for IT Staff attempting to list users (AC-19, FR-41)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${itStaffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("strictly returns 403 Forbidden for Requester attempting to list users (AC-19, FR-41)", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("returns 401 Unauthorized for unauthenticated requests", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
    });
  });

  // =========================================================================
  // API-18: Admin user creation and duplicate rejection (AC-16, FR-34, FR-35)
  // =========================================================================
  describe("API-18: Admin user creation and duplicate rejection (AC-16, FR-34, FR-35)", () => {
    const testNewEmail = "alex.thompson.test@kmutt.ac.th";

    afterAll(async () => {
      await prisma.user.deleteMany({
        where: { email: testNewEmail },
      });
    });

    it("allows Administrator to create user with initial password (FR-34)", async () => {
      const payload = {
        displayName: "Alex Thompson",
        email: testNewEmail,
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.email).toBe(testNewEmail);
      expect(res.body.displayName).toBe("Alex Thompson");
      expect(res.body.role).toBe("IT_STAFF");
      expect(res.body.isActive).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body).not.toHaveProperty("passwordHash");

      createdUserEmails.push(testNewEmail);

      // Verify newly created user can log in and requires password change
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: testNewEmail, password: "InitialPassword123!" });
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects duplicate email creation with 409 Conflict (AC-16, FR-35)", async () => {
      const duplicatePayload = {
        displayName: "Alex Duplicate",
        email: testNewEmail,
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialPassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send(duplicatePayload);

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("CONFLICT");
      expect(res.body.error?.fieldErrors?.[0]?.field).toBe("email");
    });

    it("rejects user creation with missing required fields with 422", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          displayName: "",
          email: "invalid-email",
          role: "INVALID_ROLE",
          initialPassword: "",
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("VALIDATION_FAILED");
      expect(res.body.error?.fieldErrors?.length).toBeGreaterThan(0);
    });

    it("rejects user creation when initial password fails complexity rules with 422", async () => {
      const weakEmail = "weak.user.test@kmutt.ac.th";
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          displayName: "Weak Password User",
          email: weakEmail,
          role: "REQUESTER",
          initialPassword: "weak",
        });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("VALIDATION_FAILED");
      expect(res.body.error?.fieldErrors?.[0]?.field).toBe("initialPassword");
    });

    it("strictly returns 403 Forbidden when IT Staff attempts to create a user (AC-19)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({
          displayName: "Unauthorized Test",
          email: "unauth@kmutt.ac.th",
          role: "REQUESTER",
          initialPassword: "Password123!",
        });

      expect(res.status).toBe(403);
    });
  });

  // =========================================================================
  // API-19: Admin self-deactivation prevention (AC-17, FR-38, BR-13)
  // =========================================================================
  describe("API-19: Admin self-deactivation prevention (AC-17, FR-38, BR-13)", () => {
    it("rejects Administrator deactivating own account with 422 Unprocessable Entity (AC-17, FR-38)", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("SELF_DEACTIVATION_PREVENTED");
      expect(res.body.error?.message).toContain("cannot deactivate their own account");

      // Verify admin account remains active
      const checkAdmin = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(checkAdmin?.isActive).toBe(true);
    });

    it("allows Administrator to update their own name or email without deactivating", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ displayName: "John Smith Admin" });

      expect(res.status).toBe(200);
      expect(res.body.displayName).toBe("John Smith Admin");

      // Reset name back
      await prisma.user.update({
        where: { id: adminUser.id },
        data: { displayName: "John Smith" },
      });
    });
  });

  // =========================================================================
  // API-20: Last active Admin protection (AC-18, FR-39, BR-14)
  // =========================================================================
  describe("API-20: Last active Admin protection (AC-18, FR-39, BR-14)", () => {
    it("rejects deactivating or removing the role of the sole active Administrator (AC-18, FR-39)", async () => {
      // Create a temporary second admin so another user can test target
      const secondAdminEmail = "second.admin.test@kmutt.ac.th";
      const secondAdmin = await prisma.user.create({
        data: {
          displayName: "Second Admin",
          email: secondAdminEmail,
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
          passwordHash: "dummy",
        },
      });
      createdUserEmails.push(secondAdminEmail);

      // Now there are 2 active admins (John Smith and Second Admin)
      // Login as second admin
      const secondAdminLogin = await request(app)
        .post("/api/auth/login")
        .send({ email: secondAdminEmail, password: "Password123!" });
      // We can create a token directly or use secondAdmin token
      const secondAdminToken = (await request(app)
        .post("/api/auth/login")
        .send({ email: "john.smith@kmutt.ac.th", password: "Password123!" })).body.token;

      // Deactivate second admin using John Smith (permitted since count = 2)
      const deactFirst = await request(app)
        .patch(`/api/admin/users/${secondAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });
      expect(deactFirst.status).toBe(200);
      expect(deactFirst.body.isActive).toBe(false);

      // Now only 1 active admin remains (John Smith)
      // Attempting to demote John Smith from ADMINISTRATOR to REQUESTER
      const demoteRes = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ role: "REQUESTER" });

      expect(demoteRes.status).toBe(422);
      expect(demoteRes.body.error?.code).toBe("LAST_ADMIN_PREVENTED");
      expect(demoteRes.body.error?.message).toContain("last active Administrator");
    });
  });

  // =========================================================================
  // API-21: Reset initial password by Admin (FR-37)
  // =========================================================================
  describe("API-21: Reset initial password by Admin (FR-37)", () => {
    let targetUser: any;
    const targetEmail = "reset.target.test@kmutt.ac.th";

    beforeAll(async () => {
      targetUser = await prisma.user.create({
        data: {
          displayName: "Reset Target",
          email: targetEmail,
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false,
          passwordHash: "dummy",
        },
      });
      createdUserEmails.push(targetEmail);
    });

    it("allows Administrator to issue new initial password and forces mustChangePassword = true (FR-37)", async () => {
      const newPass = "NewInitialPass2026!";
      const res = await request(app)
        .post(`/api/admin/users/${targetUser.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: newPass });

      expect(res.status).toBe(200);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body.message).toContain("Initial password reset successfully");

      // Verify target user has mustChangePassword = true in database
      const updatedUser = await prisma.user.findUnique({ where: { id: targetUser.id } });
      expect(updatedUser?.mustChangePassword).toBe(true);

      // Verify login succeeds with the new initial password and reports mustChangePassword = true
      const loginRes = await request(app)
        .post("/api/auth/login")
        .send({ email: targetEmail, password: newPass });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user.mustChangePassword).toBe(true);
    });

    it("rejects password reset with weak password failing complexity rules with 422", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUser.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "weak" });

      expect(res.status).toBe(422);
      expect(res.body.error?.code).toBe("VALIDATION_FAILED");
    });

    it("returns 404 Not Found when resetting password for non-existent user", async () => {
      const res = await request(app)
        .post("/api/admin/users/999999/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "NewValidPassword2026!" });

      expect(res.status).toBe(404);
    });

    it("strictly returns 403 Forbidden when IT Staff attempts to reset password", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUser.id}/reset-password`)
        .set("Authorization", `Bearer ${itStaffToken}`)
        .send({ newInitialPassword: "NewValidPassword2026!" });

      expect(res.status).toBe(403);
    });
  });
});
