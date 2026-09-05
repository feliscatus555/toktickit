const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

export function validateAttachmentFile(
  filename: string,
  sizeBytes: number,
  currentAttachmentCount: number = 0,
  mimeType?: string
) {
  if (currentAttachmentCount >= 5) {
    return { valid: false, error: "Maximum 5 attachments allowed per ticket." };
  }

  const ext = "." + filename.split(".").pop()?.toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Invalid file format "${filename}". Allowed formats: JPG, PNG, WEBP, PDF.` };
  }

  if (mimeType && !ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    return { valid: false, error: `Invalid MIME type "${mimeType}". Allowed formats: JPG, PNG, WEBP, PDF.` };
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File "${filename}" exceeds the 5 MB limit.` };
  }

  return { valid: true };
}
