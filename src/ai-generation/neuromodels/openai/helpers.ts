import { openAIaspectRatioSizeObject } from "./openai.constants";
import { OpenAIAspectRatio } from "./types";

export const isOpenAIAspectRatio = (x: string): x is OpenAIAspectRatio => {
  return x in openAIaspectRatioSizeObject;
};
