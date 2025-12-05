import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";
import { ModelJobStatusType, ModelJobType } from "./types/model-job.enum";
import { FilesService } from "../files/files.service";
import { ModelJobDto, ModelJobFullDto } from "./dto/model-job.dto";
import { PromptsService } from "../prompts/prompts.service";
import { ModelJobGateway } from "./model-job.gateway";
import {
  MODEL_JOB_RMQ_EVENTS,
  ModelJobCreatedPayload,
} from "./types/model-job.rmq-events";
import { PricingService } from "../pricing/pricing.service";
import { UserTokenTransactionService } from "../tokens/user-token-transactions.service";
import { TokenTransactionReason } from "../tokens/types/user-token-transactions.enum";
import { Logger } from "nestjs-pino";
import { APIError as OpenAIApiError } from "openai";
import { ErrorCode } from "src/common/errors/error-code.enum";
import { FileEntity } from "../files/files.entity";
import {
  ImageProcessingService,
  ResolvedSize,
} from "src/common/image/image-processing.service";
import { FindModelJobsDto } from "./dto/find-model-jobs.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";
import { ConfigService } from "@nestjs/config";
import { AiGenerationClientService } from "src/ai-generation/client/ai-generation.client.service";
import { AiImageJobPayload } from "src/ai-generation/ai-generation.types";

type ImageJobPayload = IModelJobCreate & {
  type:
    | ModelJobType.ImageEditByPromptId
    | ModelJobType.ImageEditByPromptText
    | ModelJobType.ImageGenerateByPromptText;
};

@Injectable()
export class ModelJobService {
  private readonly resultsTtlHours: number;

  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly aiGenerationClientService: AiGenerationClientService,
    private readonly filesService: FilesService,
    private readonly promptsService: PromptsService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy,
    private readonly gateway: ModelJobGateway,
    private readonly userTokenTransactionService: UserTokenTransactionService,
    private readonly pricingService: PricingService,
    private readonly logger: Logger,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly configService: ConfigService
  ) {
    const raw = this.configService.get<string>("MODEL_JOB_RESULTS_TTL_HOURS");

    const parsed = raw ? Number(raw) : 24;
    this.resultsTtlHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  }

  async findOne(id: string): Promise<ModelJobFullDto> {
    const modelJob = await this.repository.findOne({
      where: { id },
      relations: {
        inputFile: true,
        outputFile: true,
        outputPreviewFile: true,
        user: true,
        prompt: true,
      },
    });

    if (!modelJob) {
      throw new NotFoundException("Model job not found");
    }

    const safeUrl = (file?: FileEntity | null) =>
      file
        ? this.filesService.getFileUrl(file).catch(() => null)
        : Promise.resolve(null);

    const [outputFileUrl, outputPreviewFileUrl, inputFileUrl] =
      await Promise.all([
        safeUrl(modelJob.outputFile),
        safeUrl(modelJob.outputPreviewFile),
        safeUrl(modelJob.inputFile),
      ]);

    return {
      ...modelJob,
      outputFileUrl,
      outputPreviewFileUrl,
      inputFileUrl,
    };
  }

  //
  // Поиск / список
  //
  async findMany(
    query: FindModelJobsDto
  ): Promise<PaginationResult<ModelJobDto>> {
    return paginate<ModelJob>(this.repository, query, "modelJob", (qb) => {
      qb.leftJoinAndSelect("modelJob.user", "user");

      if (query.search) {
        const s = `%${query.search.toLowerCase()}%`;

        qb.andWhere(
          `(LOWER(modelJob.text) LIKE :s
                OR LOWER(user.email) LIKE :s)`,
          { s }
        );
      }

      if (query.status) {
        qb.andWhere("modelJob.status = :status", {
          status: query.status,
        });
      }

      if (query.type) {
        qb.andWhere("modelJob.type = :type", {
          type: query.type,
        });
      }

      if (query.createdFrom) {
        qb.andWhere(
          `(modelJob.createdAt AT TIME ZONE 'Europe/Moscow')::date >= :fromDate`,
          { fromDate: query.createdFrom }
        );
      }

      if (query.createdTo) {
        qb.andWhere(
          `(modelJob.createdAt AT TIME ZONE 'Europe/Moscow')::date <= :toDate`,
          { toDate: query.createdTo }
        );
      }

      qb.orderBy("modelJob.createdAt", "DESC");
    });
  }

  async lastModelJobs(userId: string): Promise<ModelJob[]> {
    return this.repository.find({
      where: {
        userId,
        status: ModelJobStatusType.succeeded,
        resultsDeletedAt: IsNull(),
      },
      take: 30,
      order: { createdAt: "DESC" },
      relations: { outputPreviewFile: true },
    });
  }

  async create(data: IModelJobCreate): Promise<ModelJobDto> {
    const tokens = this.pricingService.getTokensForJob(data);

    const user = await this.userTokenTransactionService.chargeForJob({
      userId: data.userId,
      tokens,
      reason: TokenTransactionReason.JobCharge,
      meta: { tariffCode: data.tariffCode, type: data.type },
    });

    // считаем срок жизни результата
    const resultsExpireAt =
      this.resultsTtlHours > 0
        ? new Date(Date.now() + this.resultsTtlHours * 60 * 60 * 1000)
        : null;

    const modelJob = this.repository.create({
      ...data,
      tokensCharged: tokens,
      resultsExpireAt,
    });

    await this.repository.save(modelJob);

    const payload: ModelJobCreatedPayload = {
      modelJobId: modelJob.id,
      payload: data,
    };

    this.client.emit<ModelJobCreatedPayload>(
      MODEL_JOB_RMQ_EVENTS.CREATED,
      payload
    );

    return { ...modelJob, user };
  }

  // Обработка задачи (универсально для всех типов)
  async modelJobProcess(modelJobId: string, data: IModelJobCreate) {
    const startRes = await this.repository.update(
      { id: modelJobId, status: ModelJobStatusType.queued },
      {
        status: ModelJobStatusType.processing,
        startedAt: new Date(),
        error: null,
      }
    );

    if (startRes.affected !== 1) {
      // уже забрал другой воркер или статус не тот — выходим
      return;
    }

    try {
      const { outputFileId, outputPreviewFileId, usedTokens } =
        await this.processImageJob(data as ImageJobPayload);

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.succeeded,
        outputFileId,
        outputPreviewFileId,
        usedTokens,
        finishedAt: new Date(),
      });

      const jobWithUrls = await this.findOne(modelJobId);
      this.gateway.sendJobUpdate(modelJobId, jobWithUrls);
    } catch (e) {
      let errorMessage: string;
      let sendToLog: boolean = true;

      if (e instanceof OpenAIApiError) {
        if (e.code === "moderation_blocked") {
          errorMessage = ErrorCode.MODERATION_BLOCKED;
          sendToLog = false;
        } else {
          errorMessage = e.message ?? "Unknown OpenAI error";
        }
      } else if (e instanceof BadRequestException) {
        const resp = e.getResponse() as any;

        if (resp?.handled) {
          sendToLog = false;

          if (resp.code === ErrorCode.MODERATION_BLOCKED) {
            errorMessage = ErrorCode.MODERATION_BLOCKED;
          } else if (resp.message) {
            errorMessage = resp.message;
          } else {
            errorMessage = e.message;
          }
        } else {
          errorMessage = e.message;
        }
      } else if (e instanceof Error) {
        errorMessage = e.message;
      } else {
        errorMessage = String(e);
      }

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.failed,
        error: errorMessage,
        finishedAt: new Date(),
      });

      // пробуем вернуть токены
      try {
        const job = await this.repository.findOne({
          where: { id: modelJobId },
        });

        if (job && job.tokensCharged > 0) {
          await this.userTokenTransactionService.addTokens({
            userId: job.userId,
            tokens: job.tokensCharged,
            modelJobId: job.id,
            reason: TokenTransactionReason.JobRefund,
            meta: { error: errorMessage },
          });
        }
      } catch (refundError) {
        this.logger.error({ msg: "Refund failed", refundError, modelJobId });
      }

      const jobWithUrls = await this.findOne(modelJobId);
      this.gateway.sendJobUpdate(modelJobId, jobWithUrls);

      if (sendToLog) {
        const openai = e as any;
        this.logger.error({
          msg: "ModelJob failed",
          service: "backend",
          modelJobId,
          userId: data.userId,
          type: data.type,
          tariffCode: (data as any).tariffCode,
          provider: "openai",
          errorCode: openai?.code ?? openai?.error?.code,
          errorType: openai?.type ?? openai?.error?.type,
          requestId: openai?.requestID, // из SDK
          status: openai?.status,
          errorMessage: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  private async processImageJob(payload: ImageJobPayload): Promise<{
    outputFileId: string;
    outputPreviewFileId: string;
    usedTokens: Record<string, any>;
  }> {
    // 1) готовим входные данные (файл и prompt)
    let aiGenearationPayloadBase: Partial<AiImageJobPayload> = {};

    switch (payload.type) {
      case ModelJobType.ImageEditByPromptId: {
        if (!payload.inputFileId)
          throw new Error("не указано поле inputFileId");

        if (!payload.promptId) throw new Error("promptId is not found");

        const inputFile = await this.filesService.getMeta(payload.inputFileId);
        const fileBuffer = await this.filesService.getFileBufferById(
          payload.inputFileId
        );
        const resolvedSize = this.getResolvedSizeFromFile(inputFile);
        const promptData = await this.promptsService.findOne(payload.promptId);

        const finalPrompt =
          `${promptData.text}
          If the image contains a person and the description does not clearly ask to make them older or scarier, keep them about the same age and at least as visually pleasant as in the original photo. Do not add wrinkles, aging, distort or exaggerate facial features, and do not make them look older or less attractive. If there is no person in the image, ignore these instructions completely and do not invent people.

          The visual style and mood described above should stay the same; only the content may be adjusted.` +
          (payload.text
            ? `\n\n### Additional instructions\n${payload.text}`
            : "");

        aiGenearationPayloadBase = {
          type: "IMAGE_EDIT_BY_PROMPT_ID",
          promptText: finalPrompt,
          inputImageBase64: fileBuffer.toString("base64"),
          inputImageFilename: "input.jpeg",
          resolvedSize,
        };
        break;
      }

      case ModelJobType.ImageEditByPromptText: {
        if (!payload.inputFileId)
          throw new Error("не указано поле inputFileId");
        if (!payload.text) throw new Error("не указано поле text");

        const inputFile = await this.filesService.getMeta(payload.inputFileId);
        const fileBuffer = await this.filesService.getFileBufferById(
          payload.inputFileId
        );
        const resolvedSize = this.getResolvedSizeFromFile(inputFile);

        aiGenearationPayloadBase = {
          type: "IMAGE_EDIT_BY_PROMPT_TEXT",
          promptText: payload.text,
          inputImageBase64: fileBuffer.toString("base64"),
          inputImageFilename: "input.jpeg",
          resolvedSize,
        };
        break;
      }

      case ModelJobType.ImageGenerateByPromptText: {
        if (!payload.text) {
          throw new Error("Не указано поле text");
        }

        aiGenearationPayloadBase = {
          type: "IMAGE_GENERATE_BY_PROMPT_TEXT",
          promptText: payload.text,
        };
        break;
      }

      default: {
        const _exhaustive: never = payload.type;
        throw new Error(`Unsupported image job type: ${_exhaustive}`);
      }
    }

    const res = await this.aiGenerationClientService.sendJob(
      aiGenearationPayloadBase as AiImageJobPayload
    );

    //
    // разруливаем ошибки воркера
    //
    if (!res.ok) {
      const message = res.error || "ai-generation worker error";
      const status = res.status ?? 400;

      const isSafety = status === 400 && /safety system/i.test(message); // твой кейс "Your request was rejected by the safety system"

      // Всё, что < 500 — считаем бизнес-ошибкой OpenAI → 400
      if (status < 500) {
        throw new BadRequestException({
          handled: true, // чтобы наверху понять, что это не "сломалось", а ожидаемая бизнес-ошибка
          code: isSafety ? ErrorCode.MODERATION_BLOCKED : undefined,
          provider: "openai",
          status,
          requestId: res.requestId,
          message,
        });
      }

      // 5xx — уже что-то серьёзное → 500, чтобы улетело в телегу
      throw new Error(
        `ai-generation failed with status ${status}: ${message} (requestId=${
          res.requestId ?? "n/a"
        })`
      );
    }

    const imageBuffer = Buffer.from(res.imageBase64, "base64");

    const resultPreviewWebpBuffer =
      await this.imageProcessingService.compressToWebp(imageBuffer, 80);

    const outputFile = await this.filesService.uploadBuffer(
      {
        buffer: imageBuffer,
        originalname: "result.jpeg",
        mimetype: "image/jpeg",
        size: imageBuffer.length,
      },
      { folder: "jobs", publicRead: true }
    );

    const outputPreviewFile = await this.filesService.uploadBuffer(
      {
        buffer: resultPreviewWebpBuffer,
        originalname: "resultPreview.webp",
        mimetype: "image/webp",
        size: resultPreviewWebpBuffer.length,
      },
      { folder: "jobs", publicRead: true }
    );

    return {
      outputFileId: outputFile.id,
      outputPreviewFileId: outputPreviewFile.id,
      usedTokens: res.usedTokens,
    };
  }

  private getResolvedSizeFromFile(file: FileEntity): ResolvedSize {
    const fromMeta = file.meta?.modelResolvedSize as ResolvedSize | undefined;
    if (fromMeta) return fromMeta;

    // fallback по размерам — на всякий случай
    const w = file.widthPx ?? 0;
    const h = file.heightPx ?? 0;

    if (w === 1024 && h === 1024) return "1024x1024";
    if (w === 1024 && h === 1536) return "1024x1536";
    if (w === 1536 && h === 1024) return "1536x1024";

    // если вдруг что-то необычное — выбираем ближнее
    if (w > h) return "1536x1024";
    if (h > w) return "1024x1536";
    return "1024x1024";
  }
}
