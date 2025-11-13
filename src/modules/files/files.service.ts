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
import { buildPublicUrl } from "src/common/utils/file-url.util";

type Format = "jpeg" | "png" | "webp";

type UploadOpts = {
  folder?: string;
  publicRead?: boolean;
  ownerId?: string | null;
  meta?: Record<string, any>;
};

@Injectable()
export class FilesService {
  private readonly baseUrl: string;
  private readonly bucket: string;
  private readonly defaultPublic: boolean;

  constructor(
    @Inject(S3_CLIENT) private readonly s3: S3Client,
    private readonly cfg: ConfigService,
    @InjectRepository(FileEntity)
    private readonly repository: Repository<FileEntity>
  ) {
    this.bucket = this.cfg.get<string>("YANDEX_S3_BUCKET")!;
    this.baseUrl = this.cfg.get<string>("YANDEX_S3_ENDPOINT")!;
    this.defaultPublic =
      (this.cfg.get<string>("FILES_DEFAULT_PUBLIC") ?? "false") === "true";
  }

  /**
   * Постоянный публичный URL для объекта в Yandex Object Storage.
   * Работает, если объект доступен public-read.
   */
  getPublicUrl(fileOrKey: FileEntity | string): string {
    const key = typeof fileOrKey === "string" ? fileOrKey : fileOrKey.key;
    return buildPublicUrl(key, this.bucket) || "";
  }

  async getSignedUrl(file: FileEntity, expiresSec = 86400): Promise<string> {
    const cmd = new GetObjectCommand({ Bucket: file.bucket, Key: file.key });
    return getSignedUrl(this.s3, cmd, { expiresIn: expiresSec });
  }

  /**
   * Универсальный метод — сам решаешь, что хочешь использовать в коде.
   * Можно вообще удалить, если не нужен.
   */
  async getFileUrl(file: FileEntity): Promise<string> {
    return this.getPublicUrl(file);
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

    let widthPx: number | null = null;
    let heightPx: number | null = null;

    const mime = file.mimetype ?? "";

    if (mime.startsWith("image/")) {
      try {
        const meta = await sharp(file.buffer).metadata();
        widthPx = meta.width ?? null;
        heightPx = meta.height ?? null;
      } catch (err) {
        console.warn("Не удалось прочитать размеры изображения:", err);
      }
    }

    const entity = this.repository.create({
      bucket: this.bucket,
      key,
      contentType: file.mimetype,
      size: file.size,
      widthPx,
      heightPx,
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
    const file = await this.repository.findOne({ where: { id } });

    if (!file) throw new NotFoundException("File not found");

    return file;
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
}
