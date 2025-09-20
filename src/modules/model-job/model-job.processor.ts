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
    private readonly modelJobService: ModelJobService
  ) {}

  @EventPattern("model_job_created")
  async handleJob(@Payload() data: JobMessage, @Ctx() ctx: RmqContext) {
    const channel = ctx.getChannelRef();
    const msg = ctx.getMessage();

    if (!data?.modelJobId) {
      channel.ack(msg);
      return;
    }

    try {
      await this.modelJobService.processJob(data.modelJobId, data.payload);
      channel.ack(msg);
    } catch (e) {
      await this.repository.update(data.modelJobId, {
        status: ModelJobStatusType.failed,
        error: e instanceof Error ? e.message : JSON.stringify(e),
        finishedAt: new Date(),
      });
      channel.ack(msg);
    }
  }
}
