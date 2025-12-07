export class GeminiModerationBlockedError extends Error {
  code = "moderation_blocked" as const;

  constructor(message = "Gemini: content blocked by safety filters") {
    super(message);
    this.name = "GeminiModerationBlockedError";
  }
}

export const GEMINI_MODERATION_FINISH_REASONS = [
  "IMAGE_SAFETY",
  "PROHIBITED_CONTENT",
  "NO_IMAGE",
] as const;

export type GeminiModerationFinishReason =
  (typeof GEMINI_MODERATION_FINISH_REASONS)[number];
