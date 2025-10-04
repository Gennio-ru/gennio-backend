import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { CreateModelJobDto } from "./dto/create-model-job.dto";
import { GenerateImageDto } from "./dto/generate-image.dto";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";
import { ModelJobStatusType } from "./types/model-job.enum";
import { FilesService } from "../files/files.service";
import { ModelJobDto } from "./dto/model-job.dto";

@Injectable()
export class ModelJobService {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly openaiService: OpenAiImageService,
    private readonly filesService: FilesService,
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
    let inputFileUrl: string | null = null;

    if (modelJob.outputFileId) {
      try {
        const file = await this.filesService.getMeta(modelJob.outputFileId);
        outputFileUrl = await this.filesService.getFileUrl(file);
      } catch {
        outputFileUrl = null;
      }
    }

    if (outputFileUrl && modelJob.inputFileId) {
      try {
        const file = await this.filesService.getMeta(modelJob.inputFileId);
        inputFileUrl = await this.filesService.getFileUrl(file);
      } catch {
        inputFileUrl = null;
      }
    }

    return { ...modelJob, outputFileUrl, inputFileUrl };
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
  async modelJobProcess(modelJobId: string, dto: CreateModelJobDto) {
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
      const { outputFileId } = await this.fileProcess(dto);

      await this.repository.update(modelJobId, {
        status: ModelJobStatusType.succeeded,
        outputFileId,
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
    payload: CreateModelJobDto
  ): Promise<{ outputFileId: string }> {
    let resultPngBuffer: Buffer<ArrayBufferLike>;

    if (payload.inputFileId) {
      const fileBuffer = await this.filesService.getFileBufferById(
        payload.inputFileId
      );

      resultPngBuffer = await this.openaiService.editImage({
        image: fileBuffer,
        prompt: payload.prompt,
      });
    } else {
      resultPngBuffer = await this.openaiService.generateImage({
        prompt: payload.prompt,
      });
    }

    const outputFile = await this.filesService.uploadBuffer(
      {
        buffer: resultPngBuffer,
        originalname: "result.png",
        mimetype: "image/png",
        size: resultPngBuffer.length,
      },
      { folder: "jobs", publicRead: true }
    );

    return { outputFileId: outputFile.id };
  }
}
