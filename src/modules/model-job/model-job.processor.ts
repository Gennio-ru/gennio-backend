import { Controller } from "@nestjs/common";
import { Ctx, EventPattern, Payload, RmqContext } from "@nestjs/microservices";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { ModelJobStatusType } from "./types/model-job.enum";
import { ModelJobService } from "./model-job.service";
import { FilesService } from "../files/files.service";
import { CreateModelJobDto } from "./dto/create-model-job.dto";

type JobMessage = {
  modelJobId: string;
  payload: CreateModelJobDto;
};

@Controller()
export class ModelJobsProcessor {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly modelJobServise: ModelJobService,
    private readonly filesService: FilesService
  ) {}

  @EventPattern("model_job_created")
  async handleJob(@Payload() data: JobMessage, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();
    console.log("start");
    if (!data?.modelJobId) {
      channel.ack(msg);
      return;
    }

    try {
      // 1) ставим в processing и фиксируем старт
      await this.repository.update(data.modelJobId, {
        status: ModelJobStatusType.processing,
        startedAt: new Date(),
        error: null,
      });
      console.log("doWork");
      // 2) полезная работа (замени на свою логику)
      const { outputFileId } = await this.doWork(data.payload);

      // 3) успех: пишем outputFileId и время завершения
      await this.repository.update(data.modelJobId, {
        status: ModelJobStatusType.succeeded,
        outputFileId: outputFileId ?? null,
        finishedAt: new Date(),
      });

      channel.ack(msg);
    } catch (e) {
      // 4) ошибка: пишем текст ошибки и время завершения
      await this.repository.update(data.modelJobId, {
        status: ModelJobStatusType.failed,
        error: String(e),
        finishedAt: new Date(),
      });
      // KISS: подтверждаем и не ре-кьюим (без DLQ/ретраев)
      channel.ack(msg);
    }
  }

  private async doWork(
    payload: CreateModelJobDto
  ): Promise<{ outputFileId?: string }> {
    console.log("111");
    const fileBuffer = await this.filesService.getFileBufferById(
      payload.inputFileId
    );
    console.log("222");
    const resultPngBuffer = await this.modelJobServise.process({
      image: fileBuffer,
      prompt: payload.prompt,
    });
    console.log("333");
    const outputFile = await this.filesService.uploadBuffer(
      {
        buffer: resultPngBuffer,
        originalname: "result.png",
        mimetype: "image/png",
        size: resultPngBuffer.length,
      },
      { folder: "jobs", publicRead: true }
    );
    console.log("444");
    return { outputFileId: outputFile.id };
  }
}
