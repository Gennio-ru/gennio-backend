import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";

import { OPENAI_CLIENT } from "./openai.constants";
import {
  AllowedSize,
  ResolvedSize,
} from "src/common/image/image-processing.service";

type ImageQuality = "low" | "medium" | "high";

@Injectable()
export class OpenAiImageService {
  constructor(@Inject(OPENAI_CLIENT) private readonly client: OpenAI) {}

  private ensureJpegFilename(name?: string) {
    const base = (name || "image").replace(/\.[^.]+$/g, "");
    return `${base}.jpeg`;
  }

  /** Берём первый результат из ImagesResponse и приводим к JPEG Buffer */
  private async toJpegBufferFromImagesResponse(
    res: OpenAI.ImagesResponse
  ): Promise<Buffer> {
    const item = res?.data?.[0];
    if (!item) {
      throw new Error("Empty image response (no data)");
    }

    if (item.b64_json) {
      const buf = Buffer.from(item.b64_json, "base64");
      return sharp(buf).jpeg().toBuffer();
    }

    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok) {
        throw new Error(`Fetch image failed: ${r.status} ${r.statusText}`);
      }
      const ab = await r.arrayBuffer();
      return sharp(Buffer.from(ab)).jpeg().toBuffer();
    }

    throw new Error("No b64_json or url in image response item");
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
    size?: AllowedSize;
    n?: number;
    quality: ImageQuality;
  }) {
    const resolvedSize: ResolvedSize =
      params.size && params.size !== "auto" ? params.size : "1024x1024";

    const res = await this.client.images.generate({
      model: "gpt-image-1-mini",
      prompt: params.prompt,
      size: resolvedSize,
      n: params.n,
      quality: params.quality ?? "low",
      stream: false,
    });

    console.log("GENERATE_IMAGE_USAGE", res.usage);

    return this.toJpegBufferFromImagesResponse(res);
  }

  /** Обработка входного изображения -> JPEG Buffer результата */
  async editImage(params: {
    image: Buffer;
    prompt: string;
    imageFilename?: string;
    resolvedSize: ResolvedSize;
    quality: ImageQuality;
  }): Promise<Buffer> {
    const {
      image,
      prompt,
      imageFilename = "image.jpeg",
      resolvedSize,
      quality,
    } = params;

    const imageFile = await this.prepareImageFile(image, imageFilename);

    const res = await this.client.images.edit({
      model: "gpt-image-1-mini",
      image: imageFile,
      prompt,
      size: resolvedSize,
      n: 1,
      quality,
      stream: false,
    });

    console.log("EDIT_IMAGE_USAGE", res.usage);

    // 3) Приводим результат к JPEG и отдаём буффер
    return this.toJpegBufferFromImagesResponse(res);
  }
}
