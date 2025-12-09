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

            const { imageBuffer, usedTokens } =
              await providerStrategy.generateImage({
                payload,
                openAiImageService: this.openAiImageService,
                geminiImageService: this.geminiImageService,
              });

            return {
              ok: true,
              imageBase64: imageBuffer.toString("base64"),
              usedTokens,
            };
          }

          case "IMAGE_EDIT_BY_PROMPT_TEXT":
          case "IMAGE_EDIT_BY_PROMPT_ID": {
            if (!payload.promptText || !payload.inputImageBase64) {
              return {
                ok: false,
                error: "promptText and inputImageBase64 are required",
              };
            }

            const { imageBuffer, usedTokens } =
              await providerStrategy.editImage({
                payload,
                openAiImageService: this.openAiImageService,
                geminiImageService: this.geminiImageService,
              });

            return {
              ok: true,
              imageBase64: imageBuffer.toString("base64"),
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
