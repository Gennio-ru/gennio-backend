import { GeminiAspectRatio } from "./types";

export function isGeminiAspectRatio(value: string): value is GeminiAspectRatio {
  return (Object.values(GeminiAspectRatio) as string[]).includes(value);
}
