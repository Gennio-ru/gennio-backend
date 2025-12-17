import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { GeminiImageService } from "./neuromodels/gemini/gemini-image.service";
import { AiImageJobPayload } from "./ai-generation.types";
import { ModelType } from "src/modules/model-job/types/model-job.enum";
import { GeminiImageSizes } from "./neuromodels/gemini/types";

export type AiImageProviderKey = ModelType;

export interface AiImageProviderStrategyContext {
  payload: AiImageJobPayload;
  openAiImageService: OpenAiImageService;
  geminiImageService: GeminiImageService;
}

export interface AiImageProviderStrategy {
  generateImage: (context: AiImageProviderStrategyContext) => Promise<{
    imageBuffers: Buffer[];
    usedTokens: Record<string, any>;
  }>;

  editImage: (context: AiImageProviderStrategyContext) => Promise<{
    imageBuffers: Buffer[];
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
      const { imageBuffers, usedTokens } =
        await geminiImageService.generateImage({
          prompt: payload.promptText!,
          aspectRatio: payload.aspectRatio,
          imageSize: payload.imageSize as GeminiImageSizes,
          model: "gemini-2.5-flash-image",
        });

      return { imageBuffers, usedTokens };
    },

    async editImage({
      payload,
      geminiImageService,
    }: AiImageProviderStrategyContext) {
      const inputImageBase64Items = Array.isArray(payload.inputImageBase64)
        ? payload.inputImageBase64
        : [payload.inputImageBase64];

      const inputImages = inputImageBase64Items
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .map((b64) => Buffer.from(b64, "base64"));

      const { imageBuffers, usedTokens } = await geminiImageService.editImage({
        images: inputImages,
        prompt: payload.promptText!,
        aspectRatio: payload.aspectRatio,
        model:
          payload.type === "IMAGE_EDIT_BY_PROMPT_ID"
            ? "gemini-2.5-flash-image"
            : "gemini-3-pro-image-preview",
        imageSize: payload.imageSize as GeminiImageSizes,
      });

      return { imageBuffers, usedTokens };
    },
  },

  [ModelType.OpenAI]: {
    async generateImage({
      payload,
      openAiImageService,
    }: AiImageProviderStrategyContext) {
      const { imageBuffers, usedTokens } =
        await openAiImageService.generateImage({
          prompt: payload.promptText!,
          quality: "medium",
          aspectRatio: payload.aspectRatio,
        });

      return { imageBuffers, usedTokens };
    },

    async editImage({
      payload,
      openAiImageService,
    }: AiImageProviderStrategyContext) {
      const inputImageBase64Items = Array.isArray(payload.inputImageBase64)
        ? payload.inputImageBase64
        : [payload.inputImageBase64];

      const inputImages = inputImageBase64Items
        .filter((x): x is string => typeof x === "string" && x.length > 0)
        .map((b64) => Buffer.from(b64, "base64"));

      const { imageBuffers, usedTokens } = await openAiImageService.editImage({
        images: inputImages,
        prompt: payload.promptText!,
        aspectRatio: payload.aspectRatio,
        quality: "medium",
        model:
          payload.type === "IMAGE_EDIT_BY_PROMPT_ID"
            ? "gpt-image-1-mini"
            : "gpt-image-1",
      });

      return { imageBuffers, usedTokens };
    },
  },
};
