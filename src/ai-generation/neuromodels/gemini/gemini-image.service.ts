import { Inject, Injectable } from "@nestjs/common";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";

import { GEMINI_CLIENT } from "./gemini.constants";
import { GenerateImageResult } from "../types";
import {
  GEMINI_MODERATION_FINISH_REASONS,
  GeminiModerationBlockedError,
  GeminiModerationFinishReason,
} from "./errors";
import { isGeminiAspectRatio } from "./helpers";

type GeminiUsageMetadata = {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
  model?: string;
};

@Injectable()
export class GeminiImageService {
  constructor(@Inject(GEMINI_CLIENT) private readonly ai: GoogleGenAI) {}

  /** Достаём картинку из ответа Gemini и приводим к JPEG Buffer */
  private async imageBufferFromResponse(response: any): Promise<Buffer> {
    const candidate = response?.candidates?.[0];

    const parts = candidate?.content?.parts ?? [];
    const imagePart = parts.find((p: any) => p?.inlineData?.data);

    // Если картинка есть – всё как раньше
    if (imagePart) {
      const buf = Buffer.from(imagePart.inlineData.data, "base64");
      return sharp(buf).toBuffer();
    }

    const finishReason = candidate?.finishReason ?? "UNKNOWN";
    const safety = candidate?.safetyRatings ?? candidate?.safetyFeedback;

    const finishIsModeration = GEMINI_MODERATION_FINISH_REASONS.includes(
      finishReason as GeminiModerationFinishReason
    );

    const safetyBlocked =
      Array.isArray(safety) && safety.some((s: any) => s?.blocked === true);

    if (finishIsModeration || safetyBlocked) {
      throw new GeminiModerationBlockedError(
        `Gemini blocked image by safety. finishReason=${finishReason}, safety=${JSON.stringify(
          safety ?? null
        )}`
      );
    }

    // Любой другой случай – техошибка
    throw new Error(
      `No inlineData image in Gemini response. finishReason=${finishReason}`
    );
  }

  /** Генерация картинки Gemini 2.5 Flash Image */
  async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
  }): Promise<GenerateImageResult> {
    const { prompt, aspectRatio } = params;

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio:
            aspectRatio && isGeminiAspectRatio(aspectRatio)
              ? aspectRatio
              : undefined,
        },
        responseModalities: ["Image"],
      },
    });

    console.dir(response, { depth: null });

    const imageBuffer = await this.imageBufferFromResponse(response);

    const usedTokens: GeminiUsageMetadata = {
      ...response?.usageMetadata,
      model: "gemini-2.5-flash-image",
    };

    return { imageBuffer, usedTokens };
  }

  /** Редактирование входного изображения (prompt + image) */
  async editImage(params: {
    image: Buffer;
    prompt: string;
    aspectRatio?: string;
    mimeType?: string;
  }): Promise<GenerateImageResult> {
    const { image, prompt, aspectRatio, mimeType = "image/jpeg" } = params;

    const base64Image = image.toString("base64");

    const contents = [
      { text: prompt },
      {
        inlineData: {
          mimeType,
          data: base64Image,
        },
      },
    ];

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents,
      config: {
        imageConfig: {
          aspectRatio:
            aspectRatio && isGeminiAspectRatio(aspectRatio)
              ? aspectRatio
              : undefined,
        },
        responseModalities: ["IMAGE"],
      },
    });

    console.dir(response, { depth: null });

    const imageBuffer = await this.imageBufferFromResponse(response);

    const usedTokens: GeminiUsageMetadata = {
      ...response?.usageMetadata,
      model: "gemini-2.5-flash-image",
    };

    return { imageBuffer, usedTokens };
  }
}
