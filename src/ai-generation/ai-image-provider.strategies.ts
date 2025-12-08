import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { GeminiImageService } from "./neuromodels/gemini/gemini-image.service";
import { AiImageJobPayload } from "./ai-generation.types";
import { ModelType } from "src/modules/model-job/types/model-job.enum";

export type AiImageProviderKey = ModelType;

export interface AiImageProviderStrategyContext {
  payload: AiImageJobPayload;
  openAiImageService: OpenAiImageService;
  geminiImageService: GeminiImageService;
}

export interface AiImageProviderStrategy {
  generateImage: (context: AiImageProviderStrategyContext) => Promise<{
    imageBuffer: Buffer;
    usedTokens: Record<string, any>;
  }>;

  editImage: (context: AiImageProviderStrategyContext) => Promise<{
    imageBuffer: Buffer;
    usedTokens: Record<string, any>;
  }>;
}

export const AI_IMAGE_PROVIDER_STRATEGIES: Record<
  AiImageProviderKey,
  AiImageProviderStrategy
> = {
  [ModelType.Gemini]: {
    async generateImage({
      payload,
      geminiImageService,
    }: AiImageProviderStrategyContext) {
      const { imageBuffer, usedTokens } =
        await geminiImageService.generateImage({
          prompt: payload.promptText!,
          aspectRatio: payload.aspectRatio,
        });

      return { imageBuffer, usedTokens };
    },

    async editImage({
      payload,
      geminiImageService,
    }: AiImageProviderStrategyContext) {
      const inputImageBuffer = Buffer.from(payload.inputImageBase64!, "base64");

      const { imageBuffer, usedTokens } = await geminiImageService.editImage({
        image: inputImageBuffer,
        prompt: payload.promptText!,
        aspectRatio: payload.aspectRatio,
      });

      return { imageBuffer, usedTokens };
    },
  },

  [ModelType.OpenAI]: {
    async generateImage({
      payload,
      openAiImageService,
    }: AiImageProviderStrategyContext) {
      const { imageBuffer, usedTokens } =
        await openAiImageService.generateImage({
          prompt: payload.promptText!,
          quality: "medium",
          aspectRatio: payload.aspectRatio,
        });

      return { imageBuffer, usedTokens };
    },

    async editImage({
      payload,
      openAiImageService,
    }: AiImageProviderStrategyContext) {
      const inputImageBuffer = Buffer.from(payload.inputImageBase64!, "base64");

      const { imageBuffer, usedTokens } = await openAiImageService.editImage({
        image: inputImageBuffer,
        prompt: payload.promptText!,
        imageFilename: payload.inputImageFilename || "input.jpeg",
        aspectRatio: payload.aspectRatio,
        quality: "medium",
        model:
          payload.type === "IMAGE_EDIT_BY_PROMPT_ID"
            ? "gpt-image-1-mini"
            : "gpt-image-1",
      });

      return { imageBuffer, usedTokens };
    },
  },
};
