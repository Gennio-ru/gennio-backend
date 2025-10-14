import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { FileEntity } from "./files.entity";
import { S3_CLIENT } from "./s3.module";
import { DeleteFileResponseDto } from "./dto/delete-file-response.dto";
import { Readable } from "typeorm/platform/PlatformTools";
import sharp from "sharp";

type UploadOpts = {
  folder?: string;
  publicRead?: boolean;
  ownerId?: string | null;
  meta?: Record<string, any>;
};

@Injectable()
export class FilesService {
  private readonly bucket: string;
  private readonly publicBase?: string;
  private readonly defaultPublic: boolean;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly cfg: ConfigService,
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>
  ) {
    this.bucket = this.cfg.get<string>("YANDEX_S3_BUCKET")!;
    this.publicBase =
      this.cfg.get<string>("YANDEX_S3_PUBLIC_BASE") || undefined;
    this.defaultPublic =
      (this.cfg.get<string>("FILES_DEFAULT_PUBLIC") ?? "false") === "true";
  }

  /**
   * Собирает публичный URL (если `publicBase` указан в .env).
   */
  private buildPublicUrl(key: string): string | null {
    return this.publicBase
      ? `${this.publicBase.replace(/\/$/, "")}/${key}`
      : null;
  }

  /**
   * Универсальный метод для получения URL (public или signed).
   */
  async getFileUrl(
    file: FileEntity,
    expiresSec = 86400
  ): Promise<string | null> {
    // если явно сохранён url (публичный) → возвращаем его
    if (file.url) return file.url;

    // если `publicBase` настроен → собираем линк
    if (this.publicBase) return this.buildPublicUrl(file.key);

    // иначе генерим временный signed URL
    const cmd = new GetObjectCommand({ Bucket: file.bucket, Key: file.key });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresSec });
  }

  private buildKey(originalName: string, folder?: string): string {
    const ext = (originalName.split(".").pop() || "bin").toLowerCase();
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(now.getUTCDate()).padStart(2, "0");
    const base = folder?.replace(/^\/|\/$/g, "") || "uploads";
    return `${base}/${yyyy}/${mm}/${dd}/${randomUUID()}.${ext}`;
  }

  async uploadBuffer(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype?: string;
      size?: number;
    },
    opts: UploadOpts = {}
  ): Promise<FileEntity> {
    const key = this.buildKey(file.originalname, opts.folder);
    const publicRead = opts.publicRead ?? this.defaultPublic;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ACL: publicRead ? "public-read" : undefined,
        Metadata: opts.meta as any,
      })
    );

    const entity = this.repository.create({
      bucket: this.bucket,
      key,
      // тут заменил на buildPublicUrl
      url: publicRead ? this.buildPublicUrl(key) : null,
      contentType: file.mimetype ?? null,
      size: file.size ?? null,
      ownerId: opts.ownerId ?? null,
      meta: opts.meta ?? null,
    });

    return this.repository.save(entity);
  }

  // Генерирует ссылку на ограниченное время
  async getSignedGetUrl(key: string, expiresSec = 3600) {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresSec });
  }

  // Удаляет объект из S3 и запись из БД
  async removeById(fileId: string): Promise<DeleteFileResponseDto> {
    const fileEntity = await this.repository.findOne({ where: { id: fileId } });
    if (!fileEntity) {
      throw new NotFoundException("File not found");
    }

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: fileEntity.bucket,
        Key: fileEntity.key,
      })
    );

    await this.repository.delete({ id: fileEntity.id });

    return { ok: true, id: fileEntity.id };
  }

  async getMeta(id: string) {
    const f = await this.repository.findOne({ where: { id } });
    if (!f) throw new NotFoundException("File not found");
    return f;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async getFileBuffer(key: string): Promise<Buffer> {
    const cmd = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const res = await this.s3.send(cmd);
    console.log({ Bucket: this.bucket, Key: key });
    if (!res.Body) {
      throw new NotFoundException("File body is empty");
    }

    return this.streamToBuffer(res.Body as Readable);
  }

  async getFileBufferById(fileId: string): Promise<Buffer> {
    const fileEntity = await this.repository.findOne({ where: { id: fileId } });

    if (!fileEntity) throw new NotFoundException("File not found");

    return this.getFileBuffer(fileEntity.key);
  }

  async clearOldUserFile(userId: string): Promise<void> {
    const oldFile = await this.repository.findOne({
      where: { ownerId: userId },
      order: { createdAt: "DESC" },
    });

    if (oldFile) {
      try {
        // сначала удаляем из S3
        await this.s3.send(
          new DeleteObjectCommand({
            Bucket: oldFile.bucket,
            Key: oldFile.key,
          })
        );

        // потом убираем из базы
        await this.repository.delete({ id: oldFile.id });
      } catch (err) {
        console.warn(`Не удалось удалить старый файл ${oldFile.id}`, err);
      }
    }
  }

  async compressPngToWebp(
    inputBuffer: Buffer,
    targetKb: number = 150
  ): Promise<Buffer> {
    let quality = 75;
    let output: Buffer = inputBuffer;

    // Итеративно уменьшаем качество, пока не достигнем целевого размера
    for (; quality >= 40; quality -= 5) {
      const candidate = await sharp(inputBuffer)
        .webp({
          quality,
          effort: 6, // максимум качества сжатия
          smartSubsample: true,
          nearLossless: false,
        })
        .toBuffer();

      const sizeKb = candidate.length / 1024;
      if (sizeKb <= targetKb) {
        output = candidate;
        break;
      }

      output = candidate; // если не достигли — запоминаем последнее
    }

    return output;
  }
}
