export enum ModelType {
  OpenAI = "OPENAI",
  Gemini = "GEMINI",
}

export enum ModelJobStatusType {
  queued = "queued",
  processing = "processing",
  succeeded = "succeeded",
  failed = "failed",
}

export enum ModelJobType {
  ImageEditByPromptId = "image-edit-by-prompt-id",
  ImageEditByPromptText = "image-edit-by-prompt-text",
  ImageGenerateByPromptText = "image-generate-by-prompt-text",
}
