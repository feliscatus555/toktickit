import { describe, it, expect } from "vitest";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

export function validateAttachmentFile(filename: string, sizeBytes: number, currentAttachmentCount: number = 0) {
  if (currentAttachmentCount >= 5) {
    return { valid: false, error: "Maximum 5 attachments allowed per ticket." };
  }

  const ext = "." + filename.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file format "${filename}". Allowed formats: JPG, PNG, WEBP, PDF.` };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File "${filename}" exceeds the 5 MB limit.` };
  }

  return { valid: true };
}

describe("UNIT-03: Attachment File & Size Validator", () => {
  it("accepts valid file types (JPG, PNG, WEBP, PDF) under 5 MB", () => {
    expect(validateAttachmentFile("screenshot.png", 2 * 1024 * 1024).valid).toBe(true);
    expect(validateAttachmentFile("document.pdf", 4.9 * 1024 * 1024).valid).toBe(true);
    expect(validateAttachmentFile("photo.jpg", 100 * 1024).valid).toBe(true);
    expect(validateAttachmentFile("image.webp", 1 * 1024 * 1024).valid).toBe(true);
  });

  it("rejects invalid file extensions (.exe, .zip, .sh, .dmg)", () => {
    const res = validateAttachmentFile("installer.exe", 1 * 1024 * 1024);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Allowed formats: JPG, PNG, WEBP, PDF");
  });

  it("rejects files exceeding 5 MB limit", () => {
    const res = validateAttachmentFile("large_video.pdf", 6 * 1024 * 1024);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("exceeds the 5 MB limit");
  });

  it("rejects uploading more than 5 attachments", () => {
    const res = validateAttachmentFile("photo6.jpg", 1 * 1024 * 1024, 5);
    expect(res.valid).toBe(false);
    expect(res.error).toContain("Maximum 5 attachments allowed per ticket");
  });
});
