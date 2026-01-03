import { Inject, Injectable } from "@nestjs/common";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import sharp from "sharp";

import { GEMINI_CLIENT } from "./gemini.constants";
import { GenerateImageResult } from "../types";
import {
  GEMINI_MODERATION_FINISH_REASONS,
  GeminiModerationBlockedError,
  GeminiModerationFinishReason,
} from "./errors";
import { isGeminiAspectRatio, isGeminiImageSize } from "./helpers";
import { GeminiImageSizes } from "./types";

export type GeminiImageModel =
  | "gemini-2.5-flash-image"
  | "gemini-3-pro-image-preview";

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
    if (imagePart?.inlineData?.data) {
      const buf = Buffer.from(imagePart.inlineData.data, "base64");
      return sharp(buf).jpeg({ quality: 97 }).toBuffer();
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

  /** Генерация картинки (Flash/Pro) */
  async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
    model?: GeminiImageModel;
    imageSize?: GeminiImageSizes;
  }): Promise<GenerateImageResult> {
    const {
      prompt,
      aspectRatio,
      model = "gemini-2.5-flash-image",
      imageSize = GeminiImageSizes.SIZE_1K,
    } = params;

    const response = await this.ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        imageConfig: {
          ...(aspectRatio && isGeminiAspectRatio(aspectRatio)
            ? { aspectRatio }
            : {}),
          ...(imageSize &&
          isGeminiImageSize(imageSize) &&
          model !== "gemini-2.5-flash-image"
            ? { imageSize }
            : {}),
        },
        responseModalities: ["IMAGE"],
      },
    });

    const imageBuffer = await this.imageBufferFromResponse(response);

    const usedTokens: GeminiUsageMetadata = {
      ...response?.usageMetadata,
      model,
    };

    return { imageBuffers: [imageBuffer], usedTokens };
  }

  /** Редактирование входного изображения (prompt + images) (Flash/Pro) */
  async editImage(params: {
    images: Buffer[];
    prompt: string;
    aspectRatio?: string;
    mimeType?: string;
    model?: GeminiImageModel;
    imageSize?: GeminiImageSizes;
  }): Promise<GenerateImageResult> {
    const {
      images,
      prompt,
      aspectRatio,
      mimeType = "image/jpeg",
      model = "gemini-2.5-flash-image",
      imageSize = GeminiImageSizes.SIZE_1K,
    } = params;

    if (!images?.length) {
      throw new Error("Gemini editImage: images is required");
    }

    console.log(params);

    const contents = [
      { text: prompt },
      ...images.map((image) => ({
        inlineData: {
          mimeType,
          data: image.toString("base64"),
        },
      })),
    ];

    const response = await this.ai.models.generateContent({
      model,
      contents,
      config: {
        imageConfig: {
          ...(aspectRatio && isGeminiAspectRatio(aspectRatio)
            ? { aspectRatio }
            : {}),
          ...(imageSize &&
          isGeminiImageSize(imageSize) &&
          model !== "gemini-2.5-flash-image"
            ? { imageSize }
            : {}),
        },
        responseModalities: ["IMAGE"],
      },
    });

    const imageBuffer = await this.imageBufferFromResponse(response);

    const usedTokens: GeminiUsageMetadata = {
      ...response?.usageMetadata,
      model,
    };

    return { imageBuffers: [imageBuffer], usedTokens };
  }
}
