import { Controller } from "@nestjs/common";
import { MessagePattern } from "@nestjs/microservices";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { AiImageJobPayload, AiImageJobResult } from "./ai-generation.types";
import { AI_IMAGE_JOB_PATTERN } from "./ai-generation.constants";
import { ConcurrencyGuard } from "./concurrency.guard";

@Controller()
export class AiGenerationController {
  constructor(
    private readonly openai: OpenAiImageService,
    private readonly concurrencyGuard: ConcurrencyGuard
  ) {}

  @MessagePattern(AI_IMAGE_JOB_PATTERN)
  async handleImageJob(payload: AiImageJobPayload): Promise<AiImageJobResult> {
    return this.concurrencyGuard.run<AiImageJobResult>(async () => {
      try {
        switch (payload.type) {
          case "IMAGE_GENERATE_BY_PROMPT_TEXT": {
            if (!payload.promptText) {
              return {
                ok: false,
                error: "promptText is required",
              };
            }

            const { imageBuffer, usedTokens } = await this.openai.generateImage(
              {
                prompt: payload.promptText,
                quality: "medium",
              }
            );

            return {
              ok: true,
              imageBase64: imageBuffer.toString("base64"),
              usedTokens,
            };
          }

          case "IMAGE_EDIT_BY_PROMPT_TEXT":
          case "IMAGE_EDIT_BY_PROMPT_ID": {
            if (
              !payload.promptText ||
              !payload.inputImageBase64 ||
              !payload.resolvedSize
            ) {
              return {
                ok: false,
                error:
                  "promptText, inputImageBase64 and resolvedSize are required",
              };
            }

            const { imageBuffer, usedTokens } = await this.openai.editImage({
              image: Buffer.from(payload.inputImageBase64, "base64"),
              prompt: payload.promptText,
              imageFilename: payload.inputImageFilename || "input.jpeg",
              resolvedSize: payload.resolvedSize,
              quality: "medium",
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
      } catch (e: any) {
        const message =
          e?.message ||
          "Unknown worker error (ai-generation microservice failed)";
        const requestId = e?.requestId ?? e?.request_id ?? null;
        const status = e?.status ?? null;

        return {
          ok: false,
          error: message,
          requestId,
          status,
        };
      }
    });
  }
}
