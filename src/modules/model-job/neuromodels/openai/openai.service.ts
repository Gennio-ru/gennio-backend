import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";

import { OPENAI_CLIENT } from "./openai.constants";
import { FilesService } from "src/modules/files/files.service";
import { GenerateTextOptions } from "./types";

// НЕ светим типы SDK наружу — свои юнионы/интерфейсы
type AllowedSize =
  | "256x256"
  | "512x512"
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "auto";

type ImageQuality = "low" | "medium" | "high";

@Injectable()
export class OpenAiImageService {
  constructor(
    @Inject(OPENAI_CLIENT) private readonly client: OpenAI,
    private readonly filesService: FilesService
  ) {}

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

  async generateImage(params: {
    prompt: string;
    size?: AllowedSize;
    n?: number;
    quality?: ImageQuality;
  }) {
    const res = await this.client.images.generate({
      model: "gpt-image-1",
      prompt: params.prompt,
      size: "1024x1024",
      n: params.n,
      quality: params.quality ?? "low",
      stream: false,
    });

    return this.toJpegBufferFromImagesResponse(res);
  }

  /** Обработка входного изображения -> JPEG Buffer результата */
  async editImage(params: {
    image: Buffer;
    referencedImages?: Buffer[];
    prompt: string;
    imageFilename?: string;
    mode?: "contain" | "cover";
    quality?: ImageQuality;
  }): Promise<Buffer> {
    const {
      image,
      prompt,
      imageFilename = "image.jpeg",
      mode = "contain",
    } = params;

    const optimizedImage = await this.filesService.downscaleImageIfNeeded(
      image,
      512
    );
    const imageFile = await this.prepareImageFile(
      optimizedImage,
      imageFilename
    );

    const res = await this.client.images.edit({
      model: "gpt-image-1-mini",
      image: imageFile,
      prompt,
      size: "1024x1024",
      n: 1,
      quality: params.quality ?? "low",
      stream: false,
      // input_fidelity: "high",
    });

    return this.toJpegBufferFromImagesResponse(res);
  }

  async generateText(options: GenerateTextOptions): Promise<string> {
    const {
      prompt,
      system = "You are a helpful assistant.",
      maxTokens = 700,
      // temperature = 0.7,
    } = options;

    const response = await this.client.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      max_completion_tokens: maxTokens,
      // temperature,
    });

    return response.choices[0]?.message?.content?.trim() ?? "";
  }
}
