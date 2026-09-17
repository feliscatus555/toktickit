export interface ValidationResult {
  isValid: boolean;
  error?: string;
  trimmed?: string;
}

export function validateCommentContent(content: unknown): ValidationResult {
  if (typeof content !== "string") {
    return {
      isValid: false,
      error: "Content must be a text string.",
    };
  }

  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return {
      isValid: false,
      error: "Content cannot be empty or whitespace-only.",
    };
  }

  if (trimmed.length > 2000) {
    return {
      isValid: false,
      error: "Content must not exceed 2,000 characters.",
    };
  }

  return {
    isValid: true,
    trimmed,
  };
}
