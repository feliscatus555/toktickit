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

export interface ActionTakenInput {
  description?: unknown;
  result?: unknown;
  followUpRequired?: unknown;
  followUpNote?: unknown;
  attachmentNotes?: unknown;
  actionDateTime?: unknown;
}

export interface ActionTakenValidationResult {
  isValid: boolean;
  error?: string;
  data?: {
    description: string;
    result: string;
    followUpRequired: boolean;
    followUpNote: string | null;
    attachmentNotes: string | null;
    actionDateTime: Date;
  };
}

export function validateActionTakenInput(
  input: ActionTakenInput,
  isUpdate = false
): ActionTakenValidationResult {
  if (!input || typeof input !== "object") {
    return { isValid: false, error: "Input payload is required." };
  }

  // description
  if (!isUpdate || input.description !== undefined) {
    if (typeof input.description !== "string" || input.description.trim().length === 0) {
      return {
        isValid: false,
        error: "Action description is required and cannot be empty or whitespace-only.",
      };
    }
  }

  // result
  if (!isUpdate || input.result !== undefined) {
    if (typeof input.result !== "string" || input.result.trim().length === 0) {
      return {
        isValid: false,
        error: "Action result is required and cannot be empty or whitespace-only.",
      };
    }
  }

  const followUpRequired = Boolean(input.followUpRequired);

  // followUpNote
  if (followUpRequired) {
    if (typeof input.followUpNote !== "string" || input.followUpNote.trim().length === 0) {
      return {
        isValid: false,
        error: "Follow-up note is required when follow-up is needed.",
      };
    }
  }

  // actionDateTime
  let actionDateTime = new Date();
  if (input.actionDateTime !== undefined && input.actionDateTime !== null) {
    const parsed = new Date(input.actionDateTime as string);
    if (isNaN(parsed.getTime())) {
      return { isValid: false, error: "Invalid action date/time." };
    }
    actionDateTime = parsed;
  }

  return {
    isValid: true,
    data: {
      description: typeof input.description === "string" ? input.description.trim() : "",
      result: typeof input.result === "string" ? input.result.trim() : "",
      followUpRequired,
      followUpNote: followUpRequired && typeof input.followUpNote === "string" ? input.followUpNote.trim() : null,
      attachmentNotes:
        typeof input.attachmentNotes === "string" && input.attachmentNotes.trim().length > 0
          ? input.attachmentNotes.trim()
          : null,
      actionDateTime,
    },
  };
}
