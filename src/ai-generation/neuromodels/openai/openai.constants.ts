import { OpenAIAspectRatio, OpenAIImageSize } from "./types";

export const OPENAI_CLIENT = "OPENAI_CLIENT";

export const openAIaspectRatioSizeObject: Record<
  OpenAIAspectRatio,
  OpenAIImageSize
> = {
  [OpenAIAspectRatio.RATIO_1_1]: "1024x1024",
  [OpenAIAspectRatio.RATIO_2_3]: "1024x1536",
  [OpenAIAspectRatio.RATIO_3_2]: "1536x1024",
};
