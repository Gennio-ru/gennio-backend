import { Inject, Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { toFile } from "openai";
import sharp from "sharp";

import { OPENAI_CLIENT } from "./openai.constants";
import { FilesService } from "src/modules/files/files.service";
import { GenerateTextOptions } from "./types";

// НЕ светим типы SDK наружу — свои юнионы/интерфейсы
type AllowedSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
type ImageQuality = "low" | "medium" | "high";

type ResolvedSize = Exclude<AllowedSize, "auto">;

const SIZE_ASPECT: Record<ResolvedSize, number> = {
  "1024x1024": 1, // 1:1
  "1024x1536": 1024 / 1536, // ~0.666 (портрет)
  "1536x1024": 1536 / 1024, // 1.5 (ландшафт)
};

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

  /** Выбор лучшего размера (из AllowedSize) под аспект картинки */
  private async pickBestSizeForImage(
    buffer: Buffer,
    requestedSize: AllowedSize = "auto"
  ): Promise<ResolvedSize> {
    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const aspect = w / h;

    if (requestedSize !== "auto") {
      return requestedSize;
    }

    // auto: выбираем тот размер, у которого aspect ближе всего к исходному
    let best: ResolvedSize = "1024x1024";
    let bestDiff = Infinity;

    (Object.entries(SIZE_ASPECT) as [ResolvedSize, number][]).forEach(
      ([size, sizeAspect]) => {
        const diff = Math.abs(aspect - sizeAspect);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = size;
        }
      }
    );

    return best;
  }

  /** Центрированный crop под нужный aspect (по одному из ResolvedSize) */
  private async cropToSizeAspect(
    buffer: Buffer,
    size: ResolvedSize
  ): Promise<Buffer> {
    const img = sharp(buffer);
    const meta = await img.metadata();
    if (!meta.width || !meta.height) return buffer;

    const w = meta.width;
    const h = meta.height;
    const targetAspect = SIZE_ASPECT[size];
    const currentAspect = w / h;

    let cropWidth = w;
    let cropHeight = h;

    if (currentAspect > targetAspect) {
      // Слишком широкое — режем по бокам
      cropWidth = Math.round(h * targetAspect);
    } else {
      // Слишком высокое — режем сверху/снизу
      cropHeight = Math.round(w / targetAspect);
    }

    const left = Math.floor((w - cropWidth) / 2);
    const top = Math.floor((h - cropHeight) / 2);

    return img
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .jpeg({ quality: 90 })
      .toBuffer();
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
    referencedImages?: Buffer[]; // пока не используем, можно будет прикрутить
    prompt: string;
    imageFilename?: string;
    mode?: "contain" | "cover"; // сейчас не используется, можно потом учесть
    size?: AllowedSize;
    quality: ImageQuality;
  }): Promise<Buffer> {
    const {
      image,
      prompt,
      imageFilename = "image.jpeg",
      mode = "contain", // пока просто сохраняем, на будущее
      size = "auto",
    } = params;

    // 1) Даунскейл (без изменения пропорций)
    const optimizedImage = await this.filesService.downscaleImageIfNeeded(
      image,
      512
    );

    // 2) Определяем лучший размер (aspect) из трёх доступных
    const resolvedSize = await this.pickBestSizeForImage(optimizedImage, size);
    console.log("resolvedSize", resolvedSize);

    // 3) Делаем центрированный crop под выбранное соотношение сторон
    const cropped = await this.cropToSizeAspect(optimizedImage, resolvedSize);

    // 4) Готовим файл для OpenAI
    const imageFile = await this.prepareImageFile(cropped, imageFilename);

    // 5) Отправляем в OpenAI с тем же размером
    const res = await this.client.images.edit({
      model: "gpt-image-1-mini",
      image: imageFile,
      prompt,
      size: resolvedSize,
      n: 1,
      quality: params.quality ?? "low",
      stream: false,
      // input_fidelity: "high",
    });

    console.log("EDIT_IMAGE_USAGE", res.usage);

    return this.toJpegBufferFromImagesResponse(res);
  }

  // async generateText(options: GenerateTextOptions): Promise<string> {
  //   const {
  //     prompt,
  //     system = "You are a helpful assistant.",
  //     maxTokens = 700,
  //   } = options;

  //   const res = await this.client.responses.create({
  //     model: "gpt-5-mini",
  //     input: prompt,
  //     max_output_tokens: maxTokens,
  //     reasoning: { effort: "low" },
  //   });

  //   console.log("GENERATE_TEXT_USAGE", res.usage);

  //   return res.output_text;
  // }
}
