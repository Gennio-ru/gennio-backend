import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";
import { OPENAI_CLIENT } from "./openai.constants";

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

  async generateImage(params: {
    prompt: string;
    size?: AllowedSize;
    n?: number;
    quality?: ImageQuality;
  }) {
    const res = await this.client.images.generate({
      model: "gpt-image-1",
      prompt: params.prompt,
      size: params.size,
      n: params.n,
      quality: params.quality ?? "low",
      stream: false,
    });

    return this.toJpegBufferFromImagesResponse(res);
  }

  /** Обработка входного изображения -> JPEG Buffer результата */
  async editImage(params: {
    image: Buffer;
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

    console.log("EDIT");

    const safeName = this.ensureJpegFilename(imageFilename);
    const imageFile = await toFile(image, safeName, {
      type: "image/jpeg",
    });

    const res = await this.client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      size: "auto",
      n: 1,
      quality: params.quality ?? "low",
      stream: false,
      input_fidelity: "high",
    });

    return this.toJpegBufferFromImagesResponse(res);
  }
}
