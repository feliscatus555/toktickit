import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../src/services/authService.js";

describe("UNIT-01 — Password Complexity Validator (BR-18)", () => {
  it("rejects passwords shorter than 8 characters", () => {
    const result = validatePasswordComplexity("Pass1!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must be at least 8 characters long.");
  });

  it("rejects passwords missing an uppercase letter", () => {
    const result = validatePasswordComplexity("password123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must include at least one uppercase letter.");
  });

  it("rejects passwords missing a lowercase letter", () => {
    const result = validatePasswordComplexity("PASSWORD123!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must include at least one lowercase letter.");
  });

  it("rejects passwords missing a numeric digit", () => {
    const result = validatePasswordComplexity("Password!!!");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must include at least one number.");
  });

  it("rejects passwords missing a special character", () => {
    const result = validatePasswordComplexity("Password123");
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Password must include at least one special character.");
  });

  it("accepts valid passwords satisfying all complexity criteria", () => {
    const result = validatePasswordComplexity("SecurePass2026!");
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
