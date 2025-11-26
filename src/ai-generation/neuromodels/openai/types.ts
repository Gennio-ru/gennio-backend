export interface GenerateImageResult {
  imageBuffer: Buffer;
  usedTokens: Record<string, any>;
}

export type ImageQuality = "low" | "medium" | "high";
