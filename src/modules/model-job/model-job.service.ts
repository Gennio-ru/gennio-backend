import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";
import { ModelJobStatusType, ModelJobType } from "./types/model-job.enum";
import { FilesService } from "../files/files.service";
import { ModelJobDto, ModelJobFullDto } from "./dto/model-job.dto";
import { PromptsService } from "../prompts/prompts.service";
import sharp from "sharp";
import { ModelJobGateway } from "./model-job.gateway";
import {
  MODEL_JOB_RMQ_EVENTS,
  ModelJobCreatedPayload,
} from "./types/model-job.rmq-events";
import { PricingService } from "../pricing/pricing.service";
import { CreditsService } from "../credits/credits.service";
import { CreditTransactionReason } from "../credits/types/credits.enum";
import { Logger, PinoLogger } from "nestjs-pino";
import { APIError as OpenAIApiError } from "openai";
import { ErrorCode } from "src/common/errors/error-code.enum";
import { FileEntity } from "../files/files.entity";
import {
  ImageProcessingService,
  ResolvedSize,
} from "src/common/image/image-processing.service";

type ImageJobPayload = IModelJobCreate & {
  type:
    | ModelJobType.ImageEditByPromptId
    | ModelJobType.ImageEditByPromptText
    | ModelJobType.ImageGenerateByPromptText;
};

@Injectable()
export class ModelJobService {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly openaiService: OpenAiImageService,
    private readonly filesService: FilesService,
    private readonly promptsService: PromptsService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy,
    private readonly gateway: ModelJobGateway,
    private readonly creditsService: CreditsService,
    private readonly pricingService: PricingService,
    private readonly logger: Logger,
    private readonly imageProcessingService: ImageProcessingService
  ) {}

  async findOne(id: string): Promise<ModelJobFullDto> {
    const modelJob = await this.repository.findOne({
      where: { id },
      relations: {
        inputFile: true,
        outputFile: true,
        outputPreviewFile: true,
        user: true,
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

  async create(data: IModelJobCreate): Promise<ModelJobDto> {
    const credits = this.pricingService.getCreditsForJob(data);

    const user = await this.creditsService.chargeForJob({
      userId: data.userId,
      credits,
      reason: CreditTransactionReason.JobCharge,
      meta: { tariffCode: data.tariffCode, type: data.type },
    });

    const modelJob = this.repository.create({
      ...data,
      creditsCharged: credits,
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
      if (data.type === ModelJobType.TextGenerate) {
        throw new BadRequestException({
          handled: true,
          code: ErrorCode.MODEJ_JOB_TYPE_NOT_FOUND,
        });
        // 🔤 текстовая генерация
        // const outputText = await this.processTextJob(data);

        // await this.repository.update(modelJobId, {
        //   status: ModelJobStatusType.succeeded,
        //   outputText,
        //   finishedAt: new Date(),
        // });
      } else {
        // 🖼 все остальные типы — про изображения
        const { outputFileId, outputPreviewFileId, inputFileId } =
          await this.processImageJob(data as ImageJobPayload);

        await this.repository.update(modelJobId, {
          status: ModelJobStatusType.succeeded,
          outputFileId,
          outputPreviewFileId,
          inputFileId,
          finishedAt: new Date(),
        });
      }

      const jobWithUrls = await this.findOne(modelJobId);
      this.gateway.sendJobUpdate(modelJobId, jobWithUrls);
    } catch (e) {
      let errorMessage: string;
      // Отправляем в лог ошибки нейросетей не связанные с модерацией
      let sendToLog: boolean = true;

      if (e instanceof OpenAIApiError) {
        if (e.code === "moderation_blocked") {
          errorMessage = ErrorCode.MODERATION_BLOCKED;
          sendToLog = false;
        } else {
          errorMessage = e.message ?? "Unknown OpenAI error";
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

      // пробуем вернуть кредиты
      try {
        const job = await this.repository.findOne({
          where: { id: modelJobId },
        });

        if (job && job.creditsCharged > 0) {
          await this.creditsService.addCredits({
            userId: job.userId,
            credits: job.creditsCharged,
            modelJobId: job.id,
            reason: CreditTransactionReason.JobRefund,
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

  // 🔤 Текстовая задача
  // private async processTextJob(payload: IModelJobCreate): Promise<string> {
  //   if (!payload.text) {
  //     throw new Error("Не указано поле text");
  //   }

  //   const resultText = await this.openaiService.generateText({
  //     prompt: payload.text,
  //   });

  //   return resultText;
  // }

  private async processImageJob(payload: ImageJobPayload): Promise<{
    outputFileId: string;
    outputPreviewFileId: string;
    inputFileId: string | undefined;
  }> {
    const resultBuffer: Buffer = await (async () => {
      switch (payload.type) {
        case ModelJobType.ImageEditByPromptId: {
          if (!payload.inputFileId) {
            throw new Error("не указано поле inputFileId");
          }
          if (!payload.promptId) {
            throw new Error("promptId is not found");
          }

          const inputFile = await this.filesService.getMeta(
            payload.inputFileId
          );
          const fileBuffer = await this.filesService.getFileBufferById(
            payload.inputFileId
          );
          const resolvedSize = this.getResolvedSizeFromFile(inputFile);

          const promptData = await this.promptsService.findOne(
            payload.promptId
          );

          return this.openaiService.editImage({
            image: fileBuffer,
            prompt: promptData.text,
            quality: "low",
            resolvedSize,
            imageFilename: "input.jpeg",
          });
        }

        case ModelJobType.ImageEditByPromptText: {
          if (!payload.inputFileId) {
            throw new Error("не указано поле inputFileId");
          }
          if (!payload.text) {
            throw new Error("не указано поле text");
          }

          const inputFile = await this.filesService.getMeta(
            payload.inputFileId
          );
          const fileBuffer = await this.filesService.getFileBufferById(
            payload.inputFileId
          );
          const resolvedSize = this.getResolvedSizeFromFile(inputFile);

          return this.openaiService.editImage({
            image: fileBuffer,
            prompt: payload.text,
            quality: "low",
            resolvedSize,
            imageFilename: "input.jpeg",
          });
        }

        case ModelJobType.ImageGenerateByPromptText: {
          if (!payload.text) {
            throw new Error("Не указано поле text");
          }

          return this.openaiService.generateImage({
            prompt: payload.text,
            quality: "low",
          });
        }

        default: {
          const _exhaustive: never = payload.type;
          throw new Error(`Unsupported image job type: ${_exhaustive}`);
        }
      }
    })();

    // post-processing результата
    const resultJpegBuffer = await sharp(resultBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const resultPreviewWebpBuffer =
      await this.imageProcessingService.compressToWebp(resultJpegBuffer);

    const outputFile = await this.filesService.uploadBuffer(
      {
        buffer: resultJpegBuffer,
        originalname: "result.jpeg",
        mimetype: "image/jpeg",
        size: resultJpegBuffer.length,
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
      inputFileId: payload.inputFileId,
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
