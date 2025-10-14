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

@Injectable()
export class ModelJobService {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly openaiService: OpenAiImageService,
    private readonly filesService: FilesService,
    private readonly promptsService: PromptsService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy
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

    this.client.emit("model_job_created", {
      modelJobId: modelJob.id,
      payload: data,
    });

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
      const { outputFileId, outputPreviewFileId } = await this.fileProcess(
        data
      );

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.succeeded,
        outputFileId,
        outputPreviewFileId,
        finishedAt: new Date(),
      });
    } catch (e) {
      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.failed,
        error: e instanceof Error ? e.message : String(e),
        finishedAt: new Date(),
      });
    }
  }

  private async fileProcess(
    payload: IModelJobCreate
  ): Promise<{ outputFileId: string; outputPreviewFileId: string }> {
    let resultPngBuffer: Buffer<ArrayBufferLike>;

    switch (payload.type) {
      case ModelJobType.ImageEditByPromptId: {
        if (!payload.inputFileId) {
          throw new Error("не указано поле inputFileId");
        }

        const fileBuffer = await this.filesService.getFileBufferById(
          payload.inputFileId
        );

        if (!payload.promptId) {
          throw new Error("не указано поле promptId");
        }

        const promptData = await this.promptsService.findOne(payload.promptId);

        resultPngBuffer = await this.openaiService.editImage({
          image: fileBuffer,
          prompt: promptData.text,
        });
      }
      case ModelJobType.ImageEditByPromptText: {
        if (!payload.inputFileId) {
          throw new Error("не указано поле inputFileId");
        }

        if (!payload.text) {
          throw new Error("не указано поле text");
        }

        const fileBuffer = await this.filesService.getFileBufferById(
          payload.inputFileId
        );

        resultPngBuffer = await this.openaiService.editImage({
          image: fileBuffer,
          prompt: payload.text,
        });
      }
      case ModelJobType.ImageGenerateByPromptText: {
        if (!payload.text) {
          throw new Error("Не указано поле text");
        }

        resultPngBuffer = await this.openaiService.generateImage({
          prompt: payload.text,
        });
      }
    }

    const resultPreviewWebpBuffer = await this.filesService.compressPngToWebp(
      resultPngBuffer
    );

    const outputFile = await this.filesService.uploadBuffer(
      {
        buffer: resultPngBuffer,
        originalname: "result.png",
        mimetype: "image/png",
        size: resultPngBuffer.length,
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
    };
  }
}
