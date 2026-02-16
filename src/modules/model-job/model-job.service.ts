import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, IsNull, Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT, styleReferencePrompt } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";
import {
  ModelJobFileKind,
  ModelJobStatusType,
  ModelJobTariffCode,
  ModelJobType,
  ModelType,
} from "./types/model-job.enum";
import { FilesService } from "../files/files.service";
import {
  ModelJobDto,
  ModelJobFullDto,
  ModelJobWithPreviewFileDto,
} from "./dto/model-job.dto";
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
import { ImageProcessingService } from "src/common/image/image-processing.service";
import { FindModelJobsDto } from "./dto/find-model-jobs.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { paginate } from "src/common/pagination/pagination.util";
import { ConfigService } from "@nestjs/config";
import { AiGenerationClientService } from "src/ai-generation/client/ai-generation.client.service";
import {
  AiImageJobPayload,
  AiImageJobResult,
} from "src/ai-generation/ai-generation.types";
import { User } from "../users/user.entity";
import { UsersService } from "../users/users.service";
import { ModelJobFile } from "./model-job-file.entity";

@Injectable()
export class ModelJobService {
  private readonly resultsTtlHours: number;

  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    @InjectRepository(ModelJobFile)
    private readonly modelJobFileRepo: Repository<ModelJobFile>,
    private readonly aiGenerationClientService: AiGenerationClientService,
    private readonly filesService: FilesService,
    private readonly promptsService: PromptsService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy,
    private readonly gateway: ModelJobGateway,
    private readonly userTokenTransactionService: UserTokenTransactionService,
    private readonly pricingService: PricingService,
    private readonly logger: Logger,
    private readonly imageProcessingService: ImageProcessingService,
    private readonly configService: ConfigService,
    private readonly usersService: UsersService,
  ) {
    const raw = this.configService.get<string>("MODEL_JOB_RESULTS_TTL_HOURS");

    const parsed = raw ? Number(raw) : 24;
    this.resultsTtlHours = Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
  }

  private normalizeInputIds(payload: IModelJobCreate): string[] {
    const ids: string[] = Array.isArray(payload.inputFileIds)
      ? payload.inputFileIds
      : [];

    const seen = new Set<string>();
    return ids.filter((id) => !!id && !seen.has(id) && (seen.add(id), true));
  }

  private async replaceJobFiles(params: {
    modelJobId: string;
    kind: ModelJobFileKind;
    fileIds: string[];
  }) {
    const { modelJobId, kind, fileIds } = params;

    await this.modelJobFileRepo.delete({ modelJobId, kind });

    if (!fileIds.length) return;

    const rows = fileIds.map((fileId, idx) =>
      this.modelJobFileRepo.create({
        modelJobId,
        fileId,
        kind,
        position: idx,
      }),
    );

    await this.modelJobFileRepo.save(rows);
  }

  async findOne(id: string): Promise<ModelJobFullDto> {
    const job = await this.repository
      .createQueryBuilder("job")
      .leftJoinAndSelect("job.user", "user")
      .leftJoinAndSelect("job.prompt", "prompt")
      .leftJoinAndSelect("job.files", "jf")
      .leftJoinAndSelect("jf.file", "file")
      .where("job.id = :id", { id })
      .orderBy("jf.kind", "ASC")
      .addOrderBy("jf.position", "ASC")
      .getOne();

    if (!job) throw new NotFoundException("Model job not found");

    const byKind = (kind: ModelJobFileKind) =>
      (job.files ?? [])
        .filter((x) => x.kind === kind)
        .sort((a, b) => a.position - b.position)
        .map((x) => x.file)
        .filter(Boolean);

    const inputFiles = byKind(ModelJobFileKind.Input);
    const outputFiles = byKind(ModelJobFileKind.Output);
    const outputPreviewFiles = byKind(ModelJobFileKind.Preview);

    const [inputFileUrls, outputFileUrls, outputPreviewFileUrls] =
      await Promise.all([
        Promise.all(
          inputFiles.map((f) =>
            this.filesService.getFileUrl(f).catch(() => null),
          ),
        ),
        Promise.all(
          outputFiles.map((f) =>
            this.filesService.getFileUrl(f).catch(() => null),
          ),
        ),
        Promise.all(
          outputPreviewFiles.map((f) =>
            this.filesService.getFileUrl(f).catch(() => null),
          ),
        ),
      ]);

    return {
      ...(job as any),

      inputFiles,
      outputFiles,
      outputPreviewFiles,

      inputFileUrls: inputFileUrls.filter((u): u is string => !!u),
      outputFileUrls: outputFileUrls.filter((u): u is string => !!u),
      outputPreviewFileUrls: outputPreviewFileUrls.filter(
        (u): u is string => !!u,
      ),
    };
  }

  //
  // Поиск / список
  //
  async findMany(
    query: FindModelJobsDto,
  ): Promise<PaginationResult<ModelJobDto>> {
    return paginate<ModelJob>(this.repository, query, "modelJob", (qb) => {
      qb.leftJoinAndSelect("modelJob.user", "user");

      if (query.search) {
        const s = `%${query.search.toLowerCase()}%`;

        qb.andWhere(
          `(LOWER(modelJob.text) LIKE :s
                OR LOWER(user.email) LIKE :s)`,
          { s },
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
          { fromDate: query.createdFrom },
        );
      }

      if (query.createdTo) {
        qb.andWhere(
          `(modelJob.createdAt AT TIME ZONE 'Europe/Moscow')::date <= :toDate`,
          { toDate: query.createdTo },
        );
      }

      qb.orderBy("modelJob.createdAt", "DESC");
    });
  }

  async lastModelJobsWithPreviews(
    userId: string,
  ): Promise<ModelJobWithPreviewFileDto[]> {
    const jobs = await this.repository.find({
      where: {
        userId,
        status: ModelJobStatusType.succeeded,
        resultsDeletedAt: IsNull(),
      },
      take: 30,
      order: { createdAt: "DESC" },
      relations: { prompt: true },
    });

    const jobIds = jobs.map((j) => j.id);
    if (!jobIds.length) return [];

    const previewLinks = await this.modelJobFileRepo.find({
      where: {
        modelJobId: In(jobIds),
        kind: ModelJobFileKind.Preview,
      },
      relations: { file: true },
      order: { position: "ASC" },
    });

    const byJob = new Map<string, FileEntity[]>();
    for (const link of previewLinks) {
      const arr = byJob.get(link.modelJobId) ?? [];
      arr.push(link.file);
      byJob.set(link.modelJobId, arr);
    }

    const out = await Promise.all(
      jobs.map(async (job) => {
        const outputPreviewFiles = byJob.get(job.id) ?? [];
        const urls = await Promise.all(
          outputPreviewFiles.map((f) =>
            this.filesService.getFileUrl(f).catch(() => null),
          ),
        );

        return {
          ...(job as any),
          outputPreviewFiles,
          outputPreviewFileUrls: urls.filter((u): u is string => !!u),
          outputPreviewFileIds: outputPreviewFiles.map((f) => f.id),
        };
      }),
    );

    return out as any;
  }

  async create(data: IModelJobCreate): Promise<ModelJobDto> {
    const tokens = this.pricingService.getTokensForJob(data);

    let user: User;

    if (data.tariffCode === ModelJobTariffCode.Admin) {
      user = await this.usersService.findById(data.userId);
    } else {
      user = await this.userTokenTransactionService.chargeForJob({
        userId: data.userId,
        tokens,
        reason: TokenTransactionReason.JobCharge,
        meta: { tariffCode: data.tariffCode, type: data.type },
      });
    }

    // считаем срок жизни результата
    const resultsExpireAt =
      this.resultsTtlHours > 0
        ? new Date(Date.now() + this.resultsTtlHours * 60 * 60 * 1000)
        : null;

    const modelJob = this.repository.create({
      ...data,
      model: data.model || ModelType.OpenAI,
      tokensCharged: tokens,
      resultsExpireAt,
    });

    await this.repository.save(modelJob);

    const inputIds = this.normalizeInputIds(data);
    await this.replaceJobFiles({
      modelJobId: modelJob.id,
      kind: ModelJobFileKind.Input,
      fileIds: inputIds,
    });

    const payload: ModelJobCreatedPayload = {
      modelJobId: modelJob.id,
      payload: data,
    };

    this.client.emit<ModelJobCreatedPayload>(
      MODEL_JOB_RMQ_EVENTS.CREATED,
      payload,
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
      },
    );

    if (startRes.affected !== 1) {
      // уже забрал другой воркер или статус не тот — выходим
      return;
    }

    try {
      const { outputFileIds, outputPreviewFileIds, usedTokens } =
        await this.processImageJob(data as IModelJobCreate);

      await this.replaceJobFiles({
        modelJobId,
        kind: ModelJobFileKind.Output,
        fileIds: outputFileIds,
      });
      await this.replaceJobFiles({
        modelJobId,
        kind: ModelJobFileKind.Preview,
        fileIds: outputPreviewFileIds,
      });

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.succeeded,
        usedTokens,
        finishedAt: new Date(),
      });

      const jobWithUrls = await this.findOne(modelJobId);
      this.gateway.sendJobUpdate(modelJobId, jobWithUrls);
    } catch (e) {
      let errorMessage: string;
      let sendToLog = true;

      const anyError = e as any;

      if (anyError?.code === "moderation_blocked") {
        errorMessage = ErrorCode.MODERATION_BLOCKED;
        sendToLog = false;
      } else if (e instanceof OpenAIApiError) {
        errorMessage = e.message ?? "Unknown OpenAI error";
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

        if (
          job &&
          job.tariffCode !== ModelJobTariffCode.Admin &&
          job.tokensCharged > 0
        ) {
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

  private async processImageJob(payload: IModelJobCreate): Promise<{
    outputFileIds: string[];
    outputPreviewFileIds: string[];
    usedTokens: Record<string, any>;
  }> {
    const normalizeBase64Items = (v?: string | string[] | null) =>
      (Array.isArray(v) ? v : v ? [v] : []).filter(
        (x): x is string => typeof x === "string" && x.length > 0,
      );

    const inputIds = this.normalizeInputIds(payload);

    const assertAiResult = (res: AiImageJobResult) => {
      if (res.ok) return res;

      const message = res.error || "ai-generation worker error";
      const status = res.status ?? 400;
      const isModerationBlocked = res.code === "moderation_blocked";

      if (status < 500) {
        throw new BadRequestException({
          handled: true,
          code: isModerationBlocked ? ErrorCode.MODERATION_BLOCKED : undefined,
          status,
          requestId: res.requestId,
          message,
        });
      }

      throw new Error(
        `ai-generation failed with status ${status}: ${message} (requestId=${
          res.requestId ?? "n/a"
        })`,
      );
    };

    const uploadBase64Items = async (base64Items: string[]) => {
      const outputFileIds: string[] = [];
      const outputPreviewFileIds: string[] = [];

      for (const imageBase64 of base64Items) {
        const imageBuffer = Buffer.from(imageBase64, "base64");
        const { extension, mimetype } =
          await this.imageProcessingService.detectImageFormat(imageBuffer);

        const previewWebp = await this.imageProcessingService.compressToWebp(
          imageBuffer,
          80,
        );

        const outputFile = await this.filesService.uploadBuffer(
          {
            buffer: imageBuffer,
            originalname: `gennio-result.${extension}`,
            mimetype,
            size: imageBuffer.length,
          },
          { folder: "jobs", publicRead: true },
        );

        const outputPreviewFile = await this.filesService.uploadBuffer(
          {
            buffer: previewWebp,
            originalname: "resultPreview.webp",
            mimetype: "image/webp",
            size: previewWebp.length,
          },
          { folder: "jobs", publicRead: true },
        );

        outputFileIds.push(outputFile.id);
        outputPreviewFileIds.push(outputPreviewFile.id);
      }

      return { outputFileIds, outputPreviewFileIds };
    };

    const extractBase64Items = (res: AiImageJobResult) => {
      const base64Items = normalizeBase64Items(res.imageBase64);
      if (!base64Items.length)
        throw new Error("ai-generation returned no image");
      return base64Items;
    };

    switch (payload.type) {
      case ModelJobType.ImageGenerateByPromptText: {
        if (!payload.text) throw new Error("Не указано поле text");

        const res = assertAiResult(
          await this.aiGenerationClientService.sendJob({
            type: payload.type,
            promptText: payload.text,
            provider: payload.model,
            aspectRatio: payload.aspectRatio,
          } as AiImageJobPayload),
        );

        const base64Items = extractBase64Items(res);
        const { outputFileIds, outputPreviewFileIds } =
          await uploadBase64Items(base64Items);

        return {
          outputFileIds,
          outputPreviewFileIds,
          usedTokens: res.usedTokens ?? {},
        };
      }

      case ModelJobType.ImageEditByPromptId:
      case ModelJobType.ImageEditByPromptText: {
        if (inputIds.length === 0) {
          throw new Error("не указано поле inputFileIds");
        }

        let promptTextBase: string;
        let provider: ModelType | undefined = payload.model;

        if (payload.type === ModelJobType.ImageEditByPromptId) {
          if (!payload.promptId) throw new Error("promptId is not found");

          const promptData = await this.promptsService.findOne(
            payload.promptId,
          );
          provider = promptData.model;

          promptTextBase =
            `${promptData.text}\n\n` +
            `The visual style and mood described above should stay the same; only the content may be adjusted.` +
            (payload.text
              ? `\n\n### Additional instructions\n${payload.text}`
              : "");
        } else {
          if (!payload.text) throw new Error("не указано поле text");
          promptTextBase = payload.text;
        }

        // aspect ratio: если не задан — можно попробовать взять из меты первого файла
        let aspectRatio = payload.aspectRatio;
        if (!aspectRatio && inputIds.length > 0) {
          const meta = await this.filesService.getMeta(inputIds[0]);
          aspectRatio = this.getAspectRatioFromFile(meta);
        }

        const inputFileBuffers = await Promise.all(
          inputIds.map((id) => this.filesService.getFileBufferById(id)),
        );

        const res = assertAiResult(
          await this.aiGenerationClientService.sendJob({
            type: payload.type,
            promptText: promptTextBase,
            inputImageBase64: inputFileBuffers.map((b) => b.toString("base64")),
            provider,
            aspectRatio,
            imageSize: payload.imageSize,
          } as AiImageJobPayload),
        );

        const base64Items = extractBase64Items(res);
        const { outputFileIds, outputPreviewFileIds } =
          await uploadBase64Items(base64Items);

        return {
          outputFileIds,
          outputPreviewFileIds,
          usedTokens: { items: [res.usedTokens ?? {}] },
        };
      }

      case ModelJobType.ImageEditByStyleReference: {
        if (inputIds.length === 0) {
          throw new Error("не указано поле inputFileIds");
        }

        const inputFileBuffers = await Promise.all(
          inputIds.map((id) => this.filesService.getFileBufferById(id)),
        );

        const res = assertAiResult(
          await this.aiGenerationClientService.sendJob({
            type: payload.type,
            promptText: styleReferencePrompt,
            inputImageBase64: inputFileBuffers.map((b) => b.toString("base64")),
            provider: payload.model,
            aspectRatio: payload.aspectRatio,
            imageSize: payload.imageSize,
          } as AiImageJobPayload),
        );

        const base64Items = extractBase64Items(res);
        const { outputFileIds, outputPreviewFileIds } =
          await uploadBase64Items(base64Items);

        return {
          outputFileIds,
          outputPreviewFileIds,
          usedTokens: { items: [res.usedTokens ?? {}] },
        };
      }

      default:
        throw new Error(`Unsupported image job type: ${payload.type}`);
    }
  }

  private getAspectRatioFromFile(
    file: FileEntity,
  ): AspectRatioString | undefined {
    const w = file.widthPx;
    const h = file.heightPx;

    if (!w || !h || w <= 0 || h <= 0) {
      return undefined;
    }

    const actual = w / h;

    let best: AspectRatioString = "1:1";
    let bestDiff = Number.POSITIVE_INFINITY;

    for (const ar of KNOWN_ASPECT_RATIOS) {
      const ratio = parseAspectRatioString(ar);
      const diff = Math.abs(actual - ratio);

      if (diff < bestDiff) {
        bestDiff = diff;
        best = ar;
      }
    }

    // Если совсем мимо (очень нестандартный формат) — можно вернуть null
    if (bestDiff > 0.2) {
      return undefined;
    }

    return best;
  }
}

const KNOWN_ASPECT_RATIOS = [
  "1:1",
  "2:3",
  "3:2",
  "3:4",
  "4:3",
  "9:16",
  "16:9",
] as const;

type AspectRatioString = (typeof KNOWN_ASPECT_RATIOS)[number];

function parseAspectRatioString(r: AspectRatioString): number {
  const [w, h] = r.split(":").map(Number);
  return w / h;
}
