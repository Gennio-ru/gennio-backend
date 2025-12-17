import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
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
import { Logger } from "nestjs-pino";

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
    private readonly repository: Repository<FileEntity>,
    private readonly logger: Logger
  ) {
    this.bucket = this.cfg.get<string>("YANDEX_S3_BUCKET")!;
    this.baseUrl = this.cfg.get<string>("YANDEX_S3_ENDPOINT")!;
    this.defaultPublic =
      (this.cfg.get<string>("FILES_DEFAULT_PUBLIC") ?? "false") === "true";
  }

  /**
   * Достаёт FileEntity по списку id одним запросом.
   * ВАЖНО: порядок в ответе НЕ гарантируется (как обычно при IN()).
   */
  async findByIds(ids: string[]): Promise<FileEntity[]> {
    const unique = Array.from(new Set((ids ?? []).filter(Boolean)));
    if (!unique.length) return [];

    return this.repository.find({
      where: { id: In(unique) },
    });
  }

  /**
   * Удобно для восстановления исходного порядка:
   * const map = await filesService.findByIdsMap(ids)
   * const ordered = ids.map(id => map.get(id) ?? null).filter(Boolean)
   */
  async findByIdsMap(ids: string[]): Promise<Map<string, FileEntity>> {
    const files = await this.findByIds(ids);
    return new Map(files.map((f) => [f.id, f]));
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

    // 1) Пытаемся удалить из БД
    try {
      await this.repository.delete({ id: fileEntity.id });
    } catch (e: any) {
      if (e.code === "23503") {
        throw new Error(
          `Нельзя удалить файл: он всё ещё привязан к другим сущностям (id=${fileEntity.id})`
        );
      }

      throw e;
    }

    // 2) А потом уже пробуем удалить из S3
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: fileEntity.bucket,
          Key: fileEntity.key,
        })
      );
    } catch (e) {
      this.logger.error(
        `Failed to delete file object from S3 (id=${fileEntity.id})`,
        e as any
      );
    }

    return { ok: true, id: fileEntity.id };
  }

  async getMeta(id: string) {
    const file = await this.repository.findOne({ where: { id } });

    if (!file) throw new NotFoundException("File not found");

    return file;
  }

  async getMetaMany(ids: string[]) {
    if (!ids.length) return [];
    return await this.repository.findBy({ id: In(ids) });
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
