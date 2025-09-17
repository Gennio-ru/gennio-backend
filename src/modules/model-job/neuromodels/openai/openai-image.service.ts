import { BadRequestException, Inject, Injectable } from "@nestjs/common";
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

const ALLOWED: readonly Exclude<AllowedSize, "auto">[] = [
  "256x256",
  "512x512",
  "1024x1024",
  "1024x1536",
  "1536x1024",
] as const;

@Injectable()
export class OpenAiImageService {
  constructor(@Inject(OPENAI_CLIENT) private readonly client: OpenAI) {}

  /* ---------- helpers ---------- */

  private parseSizeStr(s?: string): { w: number; h: number } | null {
    if (!s) return null;
    const m = /^(\d{2,5})x(\d{2,5})$/.exec(s);
    if (!m) return null;
    const w = Number(m[1]),
      h = Number(m[2]);
    return w > 0 && h > 0 ? { w, h } : null;
  }

  private pickPresetByAspect(
    w: number,
    h: number
  ): Exclude<AllowedSize, "auto"> {
    const r = w / h;
    if (r > 1.25) return "1536x1024";
    if (r < 0.8) return "1024x1536";
    return "1024x1024";
  }

  private presetDims(preset: Exclude<AllowedSize, "auto">) {
    const [tw, th] = preset.split("x").map(Number);
    return { tw, th };
  }

  private ensurePngFilename(name?: string) {
    const base = (name || "image").replace(/\.[^.]+$/g, "");
    return `${base}.png`;
  }

  /** Любой вход -> PNG буфер + валидный size для OpenAI */
  private async normalizeImageForOpenAI(
    image: Buffer,
    requested?: string,
    {
      mode = "contain",
      background = { r: 0, g: 0, b: 0, alpha: 0 },
    }: { mode?: "contain" | "cover"; background?: sharp.RGBA } = {}
  ): Promise<{ image: Buffer; size: AllowedSize }> {
    const meta = await sharp(image).metadata();
    const srcW = meta.width ?? 0;
    const srcH = meta.height ?? 0;
    if (!srcW || !srcH)
      throw new BadRequestException("Cannot read image metadata");

    if (requested && (ALLOWED as readonly string[]).includes(requested)) {
      const { tw, th } = this.presetDims(
        requested as Exclude<AllowedSize, "auto">
      );
      const out = await sharp(image)
        .resize(tw, th, {
          fit: mode === "cover" ? "cover" : "contain",
          position: "attention",
          background,
        })
        .png()
        .toBuffer();
      return { image: out, size: requested as AllowedSize };
    }

    if (requested === "auto") {
      const preset = this.pickPresetByAspect(srcW, srcH);
      const { tw, th } = this.presetDims(preset);
      const out = await sharp(image)
        .resize(tw, th, {
          fit: mode === "cover" ? "cover" : "contain",
          position: "attention",
          background,
        })
        .png()
        .toBuffer();
      return { image: out, size: "auto" };
    }

    const parsed = this.parseSizeStr(requested);
    const preset = parsed
      ? this.pickPresetByAspect(parsed.w, parsed.h)
      : this.pickPresetByAspect(srcW, srcH);

    const { tw, th } = this.presetDims(preset);
    const out = await sharp(image)
      .resize(tw, th, {
        fit: mode === "cover" ? "cover" : "contain",
        position: "attention",
        background,
      })
      .png()
      .toBuffer();

    return { image: out, size: preset };
  }

  private async toPngBufferFromImagesResponse(res: {
    data: { b64_json?: string; url?: string }[];
  }): Promise<Buffer> {
    const item = res.data?.[0];
    if (!item) throw new Error("Empty image response");

    if (item.b64_json) {
      const buf = Buffer.from(item.b64_json, "base64");
      return sharp(buf).png().toBuffer();
    }
    if (item.url) {
      const r = await fetch(item.url);
      if (!r.ok)
        throw new Error(`Fetch image failed: ${r.status} ${r.statusText}`);
      const ab = await r.arrayBuffer();
      return sharp(Buffer.from(ab)).png().toBuffer();
    }
    throw new Error("No b64_json or url in image response");
  }

  /* ---------- public API (внутри бэка) ---------- */

  async generate(params: {
    prompt: string;
    size?: AllowedSize;
    n?: number;
    quality?: "low" | "high";
  }) {
    const res = await this.client.images.generate({
      model: "gpt-image-1",
      prompt: params.prompt,
      size: params.size,
      n: params.n,
      quality: params.quality ?? "low",
      stream: false,
    });
    // Возвращаем то, что удобно контроллеру: массив объектов с {url?|b64_json?}
    // Типы не светим наружу
    // @ts-ignore
    return "data" in res ? res.data : [];
  }

  /** Обработка входного изображения -> PNG Buffer результата */
  async process(params: {
    image: Buffer;
    prompt: string;
    imageFilename?: string;
    mode?: "contain" | "cover";
  }): Promise<Buffer> {
    const {
      image,
      prompt,
      imageFilename = "image.png",
      mode = "contain",
    } = params;
    if (!image?.byteLength)
      throw new BadRequestException("Image buffer is empty");

    const { image: normalizedImage } = await this.normalizeImageForOpenAI(
      image,
      "auto",
      { mode }
    );

    const safeName = this.ensurePngFilename(imageFilename);
    const imageFile = await toFile(normalizedImage, safeName, {
      type: "image/png",
    });

    const res = await this.client.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      size: "auto",
      n: 1,
      quality: "low",
      stream: false,
    });

    // @ts-ignore
    if ("data" in res) return this.toPngBufferFromImagesResponse(res);
    throw new Error("Unexpected streaming response");
  }
}
