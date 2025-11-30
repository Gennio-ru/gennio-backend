import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { ModelJobStatusType } from "./types/model-job.enum";
import { UserTokenTransactionService } from "../tokens/user-token-transactions.service";
import { TokenTransactionReason } from "../tokens/types/user-token-transactions.enum";
import { ModelJobGateway } from "./model-job.gateway";
import { Logger } from "nestjs-pino";
import { ConfigService } from "@nestjs/config";
import { ModelJobService } from "./model-job.service";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Injectable()
export class ModelJobWatchdogService {
  private readonly queuedTtlMs: number;
  private readonly processingTtlMs: number;

  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly userTokenTransactionService: UserTokenTransactionService,
    private readonly gateway: ModelJobGateway,
    private readonly logger: Logger,
    private readonly configService: ConfigService,
    private readonly modelJobService: ModelJobService
  ) {
    const queuedSec =
      Number(this.configService.get<string>("MODEL_JOB_QUEUED_TTL_SEC")) || 600;
    const processingSec =
      Number(this.configService.get<string>("MODEL_JOB_PROCESSING_TTL_SEC")) ||
      240;

    this.queuedTtlMs = queuedSec * 1000;
    this.processingTtlMs = processingSec * 1000;
  }

  //
  // 1) Гасим задачи, которые зависли в queued
  //
  @Cron("*/1 * * * *") // раз в минуту
  async markStuckQueuedAsFailed() {
    const threshold = new Date(Date.now() - this.queuedTtlMs);

    const stuckJobs = await this.repository.find({
      where: {
        status: ModelJobStatusType.queued,
        createdAt: LessThan(threshold),
      },
    });

    if (!stuckJobs.length) return;

    this.logger.warn({
      msg: "Found stuck queued model jobs",
      count: stuckJobs.length,
      ids: stuckJobs.map((j) => j.id),
    });

    for (const job of stuckJobs) {
      await this.failJobWithRefund(
        job,
        ErrorCode.JOB_STALLED,
        "queued_timeout"
      );
    }
  }

  //
  // 2) Гасим задачи, которые зависли в processing
  //
  @Cron("*/2 * * * *") // раз в 2 минуты, можно по-другому
  async markStuckProcessingAsFailed() {
    const threshold = new Date(Date.now() - this.processingTtlMs);

    const stuckJobs = await this.repository.find({
      where: {
        status: ModelJobStatusType.processing,
        startedAt: LessThan(threshold),
      },
    });

    if (!stuckJobs.length) return;

    this.logger.warn({
      msg: "Found stuck processing model jobs",
      count: stuckJobs.length,
      ids: stuckJobs.map((j) => j.id),
    });

    for (const job of stuckJobs) {
      await this.failJobWithRefund(
        job,
        ErrorCode.PROCESSING_TIMEOUT,
        "processing_timeout"
      );
    }
  }

  //
  // Общий хелпер: пометить failed + вернуть токены + пушнуть в сокеты
  //
  private async failJobWithRefund(
    job: ModelJob,
    userErrorMessage: string,
    metaErrorCode: string
  ) {
    // оптимистично: не трогаем, если кто-то уже успел сменить статус
    const res = await this.repository.update(
      { id: job.id, status: job.status },
      {
        status: ModelJobStatusType.failed,
        error: userErrorMessage,
        finishedAt: new Date(),
      }
    );

    if (res.affected !== 1) return;

    try {
      if (job.tokensCharged > 0) {
        await this.userTokenTransactionService.addTokens({
          userId: job.userId,
          tokens: job.tokensCharged,
          modelJobId: job.id,
          reason: TokenTransactionReason.JobRefund,
          meta: { error: metaErrorCode },
        });
      }
    } catch (refundError) {
      this.logger.error({
        msg: "Refund failed in watchdog",
        refundError,
        modelJobId: job.id,
      });
    }

    try {
      const jobWithUrls = await this.modelJobService.findOne(job.id);
      this.gateway.sendJobUpdate(job.id, jobWithUrls);
    } catch (e) {
      this.logger.error({
        msg: "Failed to send job update from watchdog",
        modelJobId: job.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
}
