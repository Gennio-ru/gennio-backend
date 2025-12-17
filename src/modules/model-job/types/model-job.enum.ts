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
  ImageEditByStyleReference = "image-edit-by-style-reference",
  ImageGenerateByPromptText = "image-generate-by-prompt-text",
}

export enum ModelJobTariffCode {
  User = "USER",
  Admin = "ADMIN",
}

export enum ModelJobFileKind {
  Input = "INPUT",
  Output = "OUTPUT",
  Preview = "PREVIEW",
}
