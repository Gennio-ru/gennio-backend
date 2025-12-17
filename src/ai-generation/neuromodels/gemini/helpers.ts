import { GeminiAspectRatio, GeminiImageSizes } from "./types";

export function isGeminiAspectRatio(value: string): value is GeminiAspectRatio {
  return (Object.values(GeminiAspectRatio) as string[]).includes(value);
}

export function isGeminiImageSize(value: string): value is GeminiImageSizes {
  return (Object.values(GeminiImageSizes) as string[]).includes(value);
}
