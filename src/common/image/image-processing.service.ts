import { Injectable } from "@nestjs/common";
import sharp from "sharp";

type Format = "jpeg" | "png" | "webp";

export type AllowedSize = "1024x1024" | "1024x1536" | "1536x1024" | "auto";
export type ResolvedSize = Exclude<AllowedSize, "auto">;

const SIZE_ASPECT: Record<ResolvedSize, number> = {
  "1024x1024": 1, // 1:1
  "1024x1536": 1024 / 1536, // ~0.666 (портрет)
  "1536x1024": 1536 / 1024, // 1.5 (ландшафт)
};

const SIZE_DIM: Record<ResolvedSize, { width: number; height: number }> = {
  "1024x1024": { width: 1024, height: 1024 },
  "1024x1536": { width: 1024, height: 1536 },
  "1536x1024": { width: 1536, height: 1024 },
};

@Injectable()
export class ImageProcessingService {
  /**
   * Прочитать размеры изображения
   */
  async getDimensions(
    buffer: Buffer
  ): Promise<{ width: number | null; height: number | null }> {
    const meta = await sharp(buffer).metadata();
    return {
      width: meta.width ?? null,
      height: meta.height ?? null,
    };
  }

  /**
   * Уменьшает изображение до указанного лимита по длинной стороне,
   * сохраняя пропорции. Возвращает JPEG.
   */
  async downscaleImageIfNeeded(buffer: Buffer, maxSide = 512): Promise<Buffer> {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Не удалось определить размер изображения");
    }

    const { width, height } = metadata;
    const longerSide = Math.max(width, height);

    if (longerSide <= maxSide) {
      return buffer; // и так маленькая
    }

    const resizeOptions =
      width >= height ? { width: maxSide } : { height: maxSide };

    return image.resize(resizeOptions).toBuffer();
  }

  /**
   * Выбор лучшего размера (из AllowedSize) под аспект картинки
   */
  async pickBestSizeForImage(
    buffer: Buffer,
    requestedSize: AllowedSize = "auto"
  ): Promise<ResolvedSize> {
    if (requestedSize !== "auto") {
      return requestedSize;
    }

    const meta = await sharp(buffer).metadata();
    const w = meta.width ?? 1;
    const h = meta.height ?? 1;
    const aspect = w / h;

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

  /**
   * Центрированный crop под нужный aspect + приведение к каноническому размеру
   * (1024x1024 / 1024x1536 / 1536x1024)
   */
  async cropToSizeAspect(
    buffer: Buffer,
    size: ResolvedSize
  ): Promise<{ buffer: Buffer; width: number; height: number }> {
    let img = sharp(buffer);
    const meta = await img.metadata();
    if (!meta.width || !meta.height) {
      return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
    }

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

    const { width: targetW, height: targetH } = SIZE_DIM[size];

    const out = await img
      .extract({ left, top, width: cropWidth, height: cropHeight })
      .resize(targetW, targetH) // приводим к точному размеру для модели
      .toBuffer();

    return { buffer: out, width: targetW, height: targetH };
  }

  /**
   * Нормализация для нейросети:
   * - даунскейл
   * - выбор подходящего размера
   * - crop + resize под аспект
   */
  async normalizeForModel(
    buffer: Buffer,
    size: AllowedSize = "auto",
    maxSide = 512
  ): Promise<{
    buffer: Buffer;
    resolvedSize: ResolvedSize;
    width: number;
    height: number;
  }> {
    const downscaled = await this.downscaleImageIfNeeded(buffer, maxSide);
    const resolvedSize = await this.pickBestSizeForImage(downscaled, size);
    const cropped = await this.cropToSizeAspect(downscaled, resolvedSize);
    return { ...cropped, resolvedSize };
  }

  /**
   * Сжатие в WebP до ~targetKb
   */
  async compressToWebp(
    inputBuffer: Buffer,
    targetKb: number = 150
  ): Promise<Buffer> {
    let quality = 95;
    let output: Buffer = inputBuffer;

    for (; quality >= 40; quality -= 5) {
      const candidate = await sharp(inputBuffer)
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
          nearLossless: false,
        })
        .toBuffer();

      const sizeKb = candidate.length / 1024;

      if (sizeKb <= targetKb) {
        output = candidate;
        break;
      }

      output = candidate;
    }

    return output;
  }

  /**
   * Сжатие, сохраняя исходный формат (jpeg/png/webp)
   */
  async compressKeepFormat(input: Buffer, targetKb = 150): Promise<Buffer> {
    const meta = await sharp(input).metadata();
    const format0 = (meta.format || "").toLowerCase();
    const format: Format | null =
      format0 === "jpg"
        ? "jpeg"
        : ["jpeg", "png", "webp"].includes(format0)
        ? (format0 as Format)
        : null;

    if (!format) return input; // другие форматы не трогаем

    const needsRotate =
      typeof meta.orientation === "number" && meta.orientation !== 1;

    // уже маленькое — просто нормализуем ориентацию
    if (input.length / 1024 <= targetKb) {
      let img = sharp(input);
      if (needsRotate) img = img.rotate();
      return this.encode(img, format, 80);
    }

    let last: Buffer = input;
    for (let q = 80; q >= 50; q -= 10) {
      let img = sharp(input);
      if (needsRotate) img = img.rotate();
      const buf = await this.encode(img, format, q);
      last = buf;
      if (buf.length / 1024 <= targetKb) break;
    }

    return last;
  }

  private encode(img: sharp.Sharp, format: Format, q: number): Promise<Buffer> {
    if (format === "jpeg") {
      return img
        .jpeg({ quality: q, mozjpeg: true, progressive: true })
        .withMetadata({ orientation: 1 })
        .toBuffer();
    }

    if (format === "webp") {
      return img
        .webp({ quality: q, effort: 5 })
        .withMetadata({ orientation: 1 })
        .toBuffer();
    }

    // PNG
    return img
      .png({ compressionLevel: 9, palette: true, quality: q })
      .withMetadata({ orientation: 1 })
      .toBuffer();
  }

  /**
   * Определить формат картинки по буферу и вернуть формат + mimetype + расширение
   */
  async detectImageFormat(buffer: Buffer): Promise<{
    format: Format; // 'jpeg' | 'png' | 'webp'
    extension: string; // 'jpg' | 'png' | 'webp'
    mimetype: string; // 'image/jpeg' | 'image/png' | 'image/webp'
  }> {
    const meta = await sharp(buffer).metadata();
    const raw = (meta.format || "").toLowerCase();

    let format: Format;

    if (raw === "jpg" || raw === "jpeg") {
      format = "jpeg";
    } else if (raw === "png") {
      format = "png";
    } else if (raw === "webp") {
      format = "webp";
    } else {
      // на всякий случай — если модель/шарп отдали что-то экзотическое
      format = "jpeg";
    }

    const extension =
      format === "jpeg" ? "jpg" : format === "png" ? "png" : "webp";

    const mimetype =
      format === "jpeg"
        ? "image/jpeg"
        : format === "png"
        ? "image/png"
        : "image/webp";

    return { format, extension, mimetype };
  }
}
