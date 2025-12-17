import { Injectable } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { ModelJob } from "../model-job/model-job.entity";
import { FileEntity } from "../files/files.entity";
import { FilesService } from "../files/files.service";
import { Prompt } from "../prompts/prompt.entity";
import { Logger } from "nestjs-pino";
import { ModelJobFile } from "../model-job/model-job-file.entity"; // <-- поправь путь под свой проект

@Injectable()
export class CleanupService {
  private readonly orphanTtlHours: number;
  private readonly batchSize: number;

  constructor(
    @InjectRepository(ModelJob)
    private readonly modelJobRepo: Repository<ModelJob>,

    @InjectRepository(ModelJobFile)
    private readonly modelJobFileRepo: Repository<ModelJobFile>,

    @InjectRepository(FileEntity)
    private readonly fileRepo: Repository<FileEntity>,

    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
    private readonly logger: Logger
  ) {
    const orphanRaw = this.configService.get<string>("FILE_ORPHAN_TTL_HOURS");
    const orphanParsed = orphanRaw ? Number(orphanRaw) : 24;
    this.orphanTtlHours =
      Number.isFinite(orphanParsed) && orphanParsed > 0 ? orphanParsed : 24;

    const batchRaw = this.configService.get<string>("CLEANUP_BATCH_SIZE");
    const batchParsed = batchRaw ? Number(batchRaw) : 200;
    this.batchSize =
      Number.isFinite(batchParsed) && batchParsed > 0 ? batchParsed : 200;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async handleCleanup() {
    this.logger.log("Starting cleanup job...");

    try {
      const expiredJobs = await this.cleanupExpiredModelJobResults();
      const orphanFiles = await this.cleanupOrphanFiles();

      this.logger.log(
        `Cleanup finished: expiredJobs=${expiredJobs}, orphanFiles=${orphanFiles}`
      );
    } catch (e) {
      this.logger.error("Cleanup failed", e as any);
    }
  }

  /**
   * 1) Чистим результаты ModelJob по TTL
   * - находим job-ы, у которых истёк resultsExpireAt и resultsDeletedAt IS NULL
   * - находим все связи файлов из model_job_files для этих job-ов
   * - удаляем файлы (safe)
   * - удаляем связи
   * - ставим resultsDeletedAt
   */
  private async cleanupExpiredModelJobResults(): Promise<number> {
    const now = new Date();

    // Берём батч job-ов по TTL
    const jobs = await this.modelJobRepo
      .createQueryBuilder("job")
      .where("job.resultsExpireAt IS NOT NULL")
      .andWhere("job.resultsExpireAt < :now", { now })
      .andWhere("job.resultsDeletedAt IS NULL")
      .orderBy("job.resultsExpireAt", "ASC")
      .limit(this.batchSize)
      .getMany();

    if (!jobs.length) return 0;

    const jobIds = jobs.map((j) => j.id);

    // Подтягиваем все связи файлов для этих job-ов
    const links = await this.modelJobFileRepo.find({
      where: { modelJobId: In(jobIds) },
      select: ["id", "modelJobId", "fileId"],
    });

    // Если связей нет — всё равно отметим jobs как очищенные (чтобы не гонять их дальше)
    if (!links.length) {
      await this.modelJobRepo.update(
        { id: In(jobIds) },
        { resultsDeletedAt: new Date() }
      );
      this.logger.log(
        `Found ${jobs.length} expired ModelJob results (no linked files)`
      );
      return jobs.length;
    }

    this.logger.log(
      `Found ${jobs.length} expired ModelJob results, links=${links.length}`
    );

    // Чтобы не дёргать удаление одного и того же fileId несколько раз
    const uniqueFileIds = Array.from(new Set(links.map((l) => l.fileId)));

    // Удаляем файлы (safeDelete глотает ошибки)
    for (const fileId of uniqueFileIds) {
      await this.safeDeleteFileById(fileId);
    }

    // Удаляем связи (на случай если removeById не удаляет FileEntity или FK не каскадит)
    try {
      await this.modelJobFileRepo.delete({ modelJobId: In(jobIds) } as any);
    } catch (e) {
      this.logger.error(
        "Failed to delete model_job_files links batch",
        e as any
      );
    }

    // Ставим resultsDeletedAt разом
    try {
      await this.modelJobRepo.update(
        { id: In(jobIds) },
        { resultsDeletedAt: new Date() }
      );
    } catch (e) {
      this.logger.error("Failed to update resultsDeletedAt batch", e as any);
    }

    return jobs.length;
  }

  /**
   * 2) Чистим осиротевшие файлы:
   *  - старше TTL
   *  - не привязаны ни к Prompt (основные/превью)
   *  - не привязаны к ModelJob через model_job_files
   */
  private async cleanupOrphanFiles(): Promise<number> {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.orphanTtlHours * 60 * 60 * 1000
    );

    const files = await this.fileRepo
      .createQueryBuilder("file")
      // Привязки к ModelJob через отдельную таблицу
      .leftJoin(ModelJobFile, "mjf", "mjf.fileId = file.id")
      // Привязки к Prompt (основные картинки)
      .leftJoin(Prompt, "promptBefore", "promptBefore.beforeImageId = file.id")
      .leftJoin(Prompt, "promptAfter", "promptAfter.afterImageId = file.id")
      // Привязки к Prompt (превью)
      .leftJoin(
        Prompt,
        "promptBeforePreview",
        "promptBeforePreview.beforePreviewImageId = file.id"
      )
      .leftJoin(
        Prompt,
        "promptAfterPreview",
        "promptAfterPreview.afterPreviewImageId = file.id"
      )
      // Файл старше TTL
      .where("file.createdAt < :cutoff", { cutoff })
      // Нет ссылок из ModelJob
      .andWhere("mjf.id IS NULL")
      // Нет ссылок из Prompt
      .andWhere("promptBefore.id IS NULL")
      .andWhere("promptAfter.id IS NULL")
      .andWhere("promptBeforePreview.id IS NULL")
      .andWhere("promptAfterPreview.id IS NULL")
      .select(["file.id"])
      .orderBy("file.createdAt", "ASC")
      .limit(this.batchSize)
      .getMany();

    if (!files.length) return 0;

    this.logger.log(`Found ${files.length} orphan files to cleanup`);

    let cleaned = 0;

    for (const file of files) {
      try {
        await this.safeDeleteFileById(file.id);
        cleaned += 1;
      } catch (e) {
        this.logger.error(
          `Failed to cleanup orphan FileEntity ${file.id}`,
          e as any
        );
      }
    }

    return cleaned;
  }

  /**
   * Унифицированное удаление файла по id
   */
  private async safeDeleteFileById(fileId: string): Promise<void> {
    try {
      await this.filesService.removeById(fileId);
    } catch (e) {
      this.logger.error(
        `Failed to delete file from storage (id=${fileId})`,
        e as any
      );
      // Не пробрасываем исключение, чтобы не уронить весь батч
    }
  }
}
