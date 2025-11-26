export type AiJobType =
  | "IMAGE_GENERATE_BY_PROMPT_TEXT"
  | "IMAGE_EDIT_BY_PROMPT_TEXT"
  | "IMAGE_EDIT_BY_PROMPT_ID";

export interface AiImageJobPayload {
  type: AiJobType;
  promptText?: string;
  promptId?: string;
  // буфер исходного изображения (для edit)
  inputImageBase64?: string | null;
  inputImageFilename?: string | null;
  resolvedSize?: "1024x1024" | "1024x1536" | "1536x1024";
}

export interface AiImageJobResult {
  imageBase64: string;
  usedTokens: Record<string, any>;
}
