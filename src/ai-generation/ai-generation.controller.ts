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
    return this.concurrencyGuard.run(async () => {
      switch (payload.type) {
        case "IMAGE_GENERATE_BY_PROMPT_TEXT": {
          if (!payload.promptText) {
            throw new Error("promptText is required");
          }

          const { imageBuffer, usedTokens } = await this.openai.generateImage({
            prompt: payload.promptText,
            quality: "medium",
          });

          return { imageBase64: imageBuffer.toString("base64"), usedTokens };
        }

        case "IMAGE_EDIT_BY_PROMPT_TEXT":
        case "IMAGE_EDIT_BY_PROMPT_ID": {
          if (
            !payload.promptText ||
            !payload.inputImageBase64 ||
            !payload.resolvedSize
          ) {
            throw new Error(
              "promptText, inputImage and resolvedSize are required"
            );
          }

          const { imageBuffer, usedTokens } = await this.openai.editImage({
            image: Buffer.from(payload.inputImageBase64, "base64"),
            prompt: payload.promptText,
            imageFilename: payload.inputImageFilename || "input.jpeg",
            resolvedSize: payload.resolvedSize,
            quality: "medium",
          });

          return { imageBase64: imageBuffer.toString("base64"), usedTokens };
        }

        default:
          throw new Error(`Unsupported AiJob type: ${payload.type}`);
      }
    });
  }
}
