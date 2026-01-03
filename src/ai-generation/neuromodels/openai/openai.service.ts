import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";

import { OPENAI_CLIENT, openAIaspectRatioSizeObject } from "./openai.constants";
import { ImageQuality, OpenAIModel } from "./types";
import { GenerateImageResult } from "../types";
import { isOpenAIAspectRatio } from "./helpers";

@Injectable()
export class OpenAiImageService {
  constructor(@Inject(OPENAI_CLIENT) private readonly client: OpenAI) {}

  private ensureJpegFilename(name?: string) {
    const base = (name || "image").replace(/\.[^.]+$/g, "");
    return `${base}.jpeg`;
  }

  /** Берём первый результат из ImagesResponse и приводим к нужному формату (jpeg/png/webp) */
  private async toImageBufferFromImagesResponse(
    res: OpenAI.ImagesResponse,
    options: {
      format?: "jpeg" | "png" | "webp";
      quality?: number; // для jpeg/webp
    } = {}
  ): Promise<Buffer> {
    const item = res?.data?.[0];
    if (!item) {
      throw new Error("Empty image response (no data)");
    }

    let rawBuffer: Buffer;

    if (item.b64_json) {
      rawBuffer = Buffer.from(item.b64_json, "base64");
    } else if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) {
        throw new Error(`Fetch image failed: ${r.status} ${r.statusText}`);
      }
      const ab = await r.arrayBuffer();
      rawBuffer = Buffer.from(ab);
    } else {
      throw new Error("No b64_json or url in image response item");
    }

    const sharpInstance = sharp(rawBuffer);

    // Если формат не указан — возвращаем как есть (сохраняем прозрачность и исходный формат).
    if (!options.format) {
      return sharpInstance.toBuffer();
    }

    const quality = options.quality ?? 95;

    switch (options.format) {
      case "jpeg":
        // jpeg не поддерживает прозрачность — альфа будет потеряна
        return sharpInstance.jpeg({ quality }).toBuffer();

      case "png":
        // у png нет quality в привычном виде — compressionLevel / palette и т.п.
        return sharpInstance
          .png({
            compressionLevel: 9,
            adaptiveFiltering: true,
            palette: true,
            quality: 85,
          })
          .toBuffer();

      case "webp":
        return sharpInstance
          .webp({
            quality,
            effort: 5,
          })
          .toBuffer();

      default: {
        const _exhaustive: never = options.format;
        throw new Error(`Unsupported output format: ${_exhaustive}`);
      }
    }
  }

  private async prepareImageFile(
    image: Buffer,
    imageFilename = "image.jpeg"
  ): Promise<File> {
    const safeName = this.ensureJpegFilename(imageFilename);
    return await toFile(image, safeName, {
      type: "image/jpeg",
    });
  }

  /** Генерация картинки с учётом AllowedSize */
  async generateImage(params: {
    prompt: string;
    aspectRatio?: string;
    n?: number;
    quality: ImageQuality;
  }): Promise<GenerateImageResult> {
    const size =
      params.aspectRatio && isOpenAIAspectRatio(params.aspectRatio)
        ? openAIaspectRatioSizeObject[params.aspectRatio]
        : "auto";

    const res = await this.client.images.generate({
      model: "gpt-image-1",
      prompt: params.prompt,
      size,
      n: params.n,
      quality: params.quality,
      stream: false,
      output_format: "png",
    });

    const imageBuffer = await this.toImageBufferFromImagesResponse(res, {
      format: "png",
    });

    const usedTokens = {
      ...res?.usage,
      model: "gpt-image-1",
      quality: params.quality,
    };

    return { imageBuffers: [imageBuffer], usedTokens };
  }

  /** Обработка входного изображения -> JPEG Buffer результата */
  async editImage(params: {
    images: Buffer[];
    prompt: string;
    imageFilename?: string;
    aspectRatio?: string;
    quality: ImageQuality;
    model?: OpenAIModel;
  }): Promise<GenerateImageResult> {
    const {
      images,
      prompt,
      imageFilename = "image.jpeg",
      aspectRatio,
      quality,
      model = "gpt-image-1",
    } = params;

    const imageFile = await this.prepareImageFile(images[0], imageFilename);

    const size =
      aspectRatio && isOpenAIAspectRatio(aspectRatio)
        ? openAIaspectRatioSizeObject[aspectRatio]
        : "auto";

    const res = await this.client.images.edit({
      model,
      image: imageFile,
      prompt,
      size,
      n: 1,
      quality,
      stream: false,
    });

    // 3) Приводим результат к JPEG и отдаём буффер
    const imageBuffer = await this.toImageBufferFromImagesResponse(res, {
      format: "jpeg",
      quality: 95,
    });

    const usedTokens = {
      ...res?.usage,
      model,
      quality,
    };

    return { imageBuffers: [imageBuffer], usedTokens };
  }
}
