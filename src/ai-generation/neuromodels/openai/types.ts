export type ImageQuality = "low" | "medium" | "high";

export type OpenAIModel = "gpt-image-1" | "gpt-image-1-mini";

export enum OpenAIAspectRatio {
  RATIO_1_1 = "1:1",
  RATIO_2_3 = "2:3",
  RATIO_3_2 = "3:2",
}

export type OpenAIImageSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
