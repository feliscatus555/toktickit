import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../src/services/authService.js";
import { validateCommentContent } from "../../src/services/validationService.js";

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

describe("UNIT-03 — Comment & Note Content Validator (BR-11, FR-28, BR-23)", () => {
  it("rejects empty string content", () => {
    const result = validateCommentContent("");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Content cannot be empty or whitespace-only.");
  });

  it("rejects whitespace-only content (spaces, tabs, newlines)", () => {
    const result = validateCommentContent("   \t  \n  ");
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Content cannot be empty or whitespace-only.");
  });

  it("rejects non-string content", () => {
    expect(validateCommentContent(null).isValid).toBe(false);
    expect(validateCommentContent(undefined).isValid).toBe(false);
    expect(validateCommentContent(12345).isValid).toBe(false);
    expect(validateCommentContent({}).isValid).toBe(false);
  });

  it("rejects content exceeding 2000 characters", () => {
    const longContent = "A".repeat(2001);
    const result = validateCommentContent(longContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toBe("Content must not exceed 2,000 characters.");
  });

  it("accepts valid trimmed content up to 2000 characters", () => {
    const validShort = "  Checking radius logs and user certificates.  ";
    const resShort = validateCommentContent(validShort);
    expect(resShort.isValid).toBe(true);
    expect(resShort.trimmed).toBe("Checking radius logs and user certificates.");

    const boundary2000 = "B".repeat(2000);
    const resBoundary = validateCommentContent(boundary2000);
    expect(resBoundary.isValid).toBe(true);
    expect(resBoundary.trimmed).toHaveLength(2000);
  });
});
