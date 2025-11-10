import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";
import { ModelJobStatusType, ModelJobType } from "./types/model-job.enum";
import { FilesService } from "../files/files.service";
import { ModelJobDto } from "./dto/model-job.dto";
import { PromptsService } from "../prompts/prompts.service";
import sharp from "sharp";
import { ModelJobGateway } from "./model-job.gateway";
import {
  MODEL_JOB_RMQ_EVENTS,
  ModelJobCreatedPayload,
} from "./types/model-job.rmq-events";

@Injectable()
export class ModelJobService {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly openaiService: OpenAiImageService,
    private readonly filesService: FilesService,
    private readonly promptsService: PromptsService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy,
    private readonly gateway: ModelJobGateway
  ) {}

  async findOne(
    id: string
  ): Promise<
    ModelJobDto & { inputFileUrl: string | null; outputFileUrl: string | null }
  > {
    const modelJob = await this.repository.findOne({
      where: { id },
    });

    if (!modelJob) {
      throw new NotFoundException("Model job not found");
    }

    let outputFileUrl: string | null = null;
    let outputPreviewFileUrl: string | null = null;
    let inputFileUrl: string | null = null;

    if (modelJob.outputFileId) {
      try {
        const file = await this.filesService.getMeta(modelJob.outputFileId);
        outputFileUrl = await this.filesService.getFileUrl(file);
      } catch {
        outputFileUrl = null;
      }
    }

    if (modelJob.outputPreviewFileId) {
      try {
        const file = await this.filesService.getMeta(
          modelJob.outputPreviewFileId
        );
        outputPreviewFileUrl = await this.filesService.getFileUrl(file);
      } catch {
        outputPreviewFileUrl = null;
      }
    }

    if (outputFileUrl && outputPreviewFileUrl && modelJob.inputFileId) {
      try {
        const file = await this.filesService.getMeta(modelJob.inputFileId);
        inputFileUrl = await this.filesService.getFileUrl(file);
      } catch {
        inputFileUrl = null;
      }
    }

    return { ...modelJob, outputFileUrl, outputPreviewFileUrl, inputFileUrl };
  }

  async create(data: IModelJobCreate): Promise<ModelJob> {
    const modelJob = this.repository.create(data);

    await this.repository.save(modelJob);

    const payload: ModelJobCreatedPayload = {
      modelJobId: modelJob.id,
      payload: data,
    };

    this.client.emit<ModelJobCreatedPayload>(
      MODEL_JOB_RMQ_EVENTS.CREATED,
      payload
    );

    return modelJob;
  }

  // Обработка изображения
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
      const { outputFileId, outputPreviewFileId, inputFileId } =
        await this.fileProcess(data);

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.succeeded,
        outputFileId,
        outputPreviewFileId,
        inputFileId,
        finishedAt: new Date(),
      });

      const jobWithUrls = await this.findOne(modelJobId);

      this.gateway.sendJobUpdate(modelJobId, jobWithUrls);
    } catch (e) {
      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.failed,
        error: e instanceof Error ? e.message : String(e),
        finishedAt: new Date(),
      });

      this.gateway.sendJobUpdate(modelJobId, {
        status: ModelJobStatusType.failed,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private async fileProcess(payload: IModelJobCreate): Promise<{
    outputFileId: string;
    outputPreviewFileId: string;
    inputFileId: string | undefined;
  }> {
    let resultBuffer: Buffer<ArrayBufferLike>;

    // Обрабатываем изображение пользователя, если оно есть
    if (payload.inputFileId) {
      const inputFileId = payload.inputFileId;

      const inputFileBuffer = await this.filesService.getFileBufferById(
        payload.inputFileId
      );
      const compressedInputFileBuffer = await this.filesService.compressToWebp(
        inputFileBuffer
      );

      const compressedInputFile = await this.filesService.uploadBuffer(
        {
          buffer: compressedInputFileBuffer,
          originalname: "result.webp",
          mimetype: "image/webp",
          size: compressedInputFileBuffer.length,
        },
        { folder: "jobs", publicRead: true }
      );

      payload.inputFileId = compressedInputFile.id;

      // Удаляем исходное изображение пользователя
      await this.filesService.removeById(inputFileId);
    }

    switch (payload.type) {
      case ModelJobType.ImageEditByPromptId:
        {
          if (!payload.inputFileId) {
            throw new Error("не указано поле inputFileId");
          }

          const fileBuffer = await this.filesService.getFileBufferById(
            payload.inputFileId
          );

          if (!payload.promptId) {
            throw new Error("promptId is not found");
          }

          const prompt = await this.promptsService.findOne(payload.promptId);
          const referencedImageFileBuffer =
            await this.filesService.getFileBufferById(prompt.afterImageId);

          if (!payload.promptId) {
            throw new Error("не указано поле promptId");
          }

          const promptData = await this.promptsService.findOne(
            payload.promptId
          );

          resultBuffer = await this.openaiService.editImage({
            image: fileBuffer,
            referencedImages: [referencedImageFileBuffer],
            prompt: promptData.text,
            quality: "medium",
          });
        }
        break;
      case ModelJobType.ImageEditByPromptText:
        {
          if (!payload.inputFileId) {
            throw new Error("не указано поле inputFileId");
          }

          if (!payload.text) {
            throw new Error("не указано поле text");
          }

          const fileBuffer = await this.filesService.getFileBufferById(
            payload.inputFileId
          );

          resultBuffer = await this.openaiService.editImage({
            image: fileBuffer,
            prompt: payload.text,
            quality: "medium",
          });
        }
        break;
      case ModelJobType.ImageGenerateByPromptText:
        {
          if (!payload.text) {
            throw new Error("Не указано поле text");
          }

          resultBuffer = await this.openaiService.generateImage({
            prompt: payload.text,
            quality: "medium",
          });
        }
        break;
    }

    // Конвертируем результат в Jpeg с минимальним сжатием
    const resultJpegBuffer = await sharp(resultBuffer)
      .jpeg({ quality: 90 })
      .toBuffer();

    const resultPreviewWebpBuffer = await this.filesService.compressToWebp(
      resultJpegBuffer
    );

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
}
