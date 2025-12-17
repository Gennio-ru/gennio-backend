import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { AiImageJobPayload, AiImageJobResult } from "./ai-generation.types";
import { AI_IMAGE_JOB_PATTERN } from "./ai-generation.constants";
import { ConcurrencyGuard } from "./concurrency.guard";
import { GeminiImageService } from "./neuromodels/gemini/gemini-image.service";
import {
  AI_IMAGE_PROVIDER_STRATEGIES,
  AiImageProviderKey,
} from "./ai-image-provider.strategies";

@Controller()
export class AiGenerationController {
  constructor(
    private readonly openAiImageService: OpenAiImageService,
    private readonly geminiImageService: GeminiImageService,
    private readonly concurrencyGuard: ConcurrencyGuard
  ) {}

  @MessagePattern(AI_IMAGE_JOB_PATTERN)
  async handleImageJob(payload: AiImageJobPayload): Promise<AiImageJobResult> {
    return this.concurrencyGuard.run<AiImageJobResult>(async () => {
      const providerKey: AiImageProviderKey = payload.provider;

      const providerStrategy = AI_IMAGE_PROVIDER_STRATEGIES[providerKey];

      if (!providerStrategy) {
        return {
          ok: false,
          error: `Unsupported provider: ${providerKey}`,
        };
      }

      try {
        switch (payload.type) {
          case "IMAGE_GENERATE_BY_PROMPT_TEXT": {
            if (!payload.promptText) {
              return {
                ok: false,
                error: "promptText is required",
              };
            }

            const { imageBuffers, usedTokens } =
              await providerStrategy.generateImage({
                payload,
                openAiImageService: this.openAiImageService,
                geminiImageService: this.geminiImageService,
              });

            const imageBase64Items = imageBuffers.map((b) =>
              b.toString("base64")
            );

            return {
              ok: true,
              imageBase64:
                imageBase64Items.length <= 1
                  ? imageBase64Items[0] ?? ""
                  : imageBase64Items,
              usedTokens,
            };
          }

          case "IMAGE_EDIT_BY_PROMPT_TEXT":
          case "IMAGE_EDIT_BY_PROMPT_ID": {
            const inputImageBase64Items = Array.isArray(payload.inputImageBase64)
              ? payload.inputImageBase64
              : payload.inputImageBase64
              ? [payload.inputImageBase64]
              : [];

            const inputImagesCount = inputImageBase64Items.filter(
              (x): x is string => typeof x === "string" && x.length > 0
            ).length;

            if (!payload.promptText || inputImagesCount === 0) {
              return {
                ok: false,
                error: "promptText and inputImageBase64 are required",
              };
            }

            const { imageBuffers, usedTokens } =
              await providerStrategy.editImage({
                payload,
                openAiImageService: this.openAiImageService,
                geminiImageService: this.geminiImageService,
              });

            const imageBase64Items = imageBuffers.map((b) =>
              b.toString("base64")
            );

            return {
              ok: true,
              imageBase64:
                imageBase64Items.length <= 1
                  ? imageBase64Items[0] ?? ""
                  : imageBase64Items,
              usedTokens,
            };
          }

          default:
            return {
              ok: false,
              error: `Unsupported AiJob type: ${payload.type}`,
            };
        }
      } catch (error: any) {
        const message =
          error?.message ||
          "Unknown worker error (ai-generation microservice failed)";
        const requestId = error?.requestId ?? error?.request_id ?? null;
        const status = error?.status ?? 400;

        const isModerationBlocked = error?.code === "moderation_blocked";

        return {
          ok: false,
          error: message,
          requestId,
          status,
          code: isModerationBlocked ? "moderation_blocked" : null,
        };
      }
    });
  }
}
