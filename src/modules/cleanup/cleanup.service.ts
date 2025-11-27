import { Injectable, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";

import { ModelJob } from "../model-job/model-job.entity";
import { FileEntity } from "../files/files.entity";
import { FilesService } from "../files/files.service";
import { Prompt } from "../prompts/prompt.entity";
import { Logger } from "nestjs-pino";

@Injectable()
export class CleanupService {
  private readonly orphanTtlHours: number;
  private readonly batchSize: number;

  constructor(
    @InjectRepository(ModelJob)
    private readonly modelJobRepo: Repository<ModelJob>,
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

  private async cleanupExpiredModelJobResults(): Promise<number> {
    const now = new Date();

    const jobs = await this.modelJobRepo
      .createQueryBuilder("job")
      .where("job.resultsExpireAt IS NOT NULL")
      .andWhere("job.resultsExpireAt < :now", { now })
      .andWhere("job.resultsDeletedAt IS NULL")
      .andWhere(
        "(job.outputFileId IS NOT NULL OR job.outputPreviewFileId IS NOT NULL)"
      )
      .orderBy("job.resultsExpireAt", "ASC")
      .limit(this.batchSize)
      .getMany();

    if (!jobs.length) return 0;

    this.logger.log(`Found ${jobs.length} expired ModelJob results`);

    for (const job of jobs) {
      try {
        if (job.inputFileId) {
          await this.safeDeleteFileById(job.inputFileId);
          job.inputFileId = null;
        }

        if (job.outputFileId) {
          await this.safeDeleteFileById(job.outputFileId);
          job.outputFileId = null;
        }

        if (job.outputPreviewFileId) {
          await this.safeDeleteFileById(job.outputPreviewFileId);
          job.outputPreviewFileId = null;
        }

        job.resultsDeletedAt = new Date();
        await this.modelJobRepo.save(job);
      } catch (e) {
        this.logger.error(`Failed to cleanup ModelJob ${job.id}`, e as any);
      }
    }

    return jobs.length;
  }

  //
  // 2) Чистим обособленные файлы
  //    — старше TTL, не привязаны ни к ModelJob, ни к Prompt
  //
  private async cleanupOrphanFiles(): Promise<number> {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - this.orphanTtlHours * 60 * 60 * 1000
    );

    const files = await this.fileRepo
      .createQueryBuilder("file")
      // Привязки к ModelJob
      .leftJoin(ModelJob, "jobInput", "jobInput.inputFileId = file.id")
      .leftJoin(ModelJob, "jobOutput", "jobOutput.outputFileId = file.id")
      .leftJoin(
        ModelJob,
        "jobPreview",
        "jobPreview.outputPreviewFileId = file.id"
      )
      // Привязки к Prompt
      .leftJoin(Prompt, "promptBefore", "promptBefore.beforeImageId = file.id")
      .leftJoin(Prompt, "promptAfter", "promptAfter.afterImageId = file.id")
      // Файл старше TTL
      .where("file.createdAt < :cutoff", { cutoff })
      // Ни одной ссылки из ModelJob
      .andWhere("jobInput.id IS NULL")
      .andWhere("jobOutput.id IS NULL")
      .andWhere("jobPreview.id IS NULL")
      // Ни одной ссылки из Prompt
      .andWhere("promptBefore.id IS NULL")
      .andWhere("promptAfter.id IS NULL")
      // Нам нужен только id файла
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

  //
  // Унифицированное удаление файла по id
  //
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
