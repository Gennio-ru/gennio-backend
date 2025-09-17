import { Inject, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ModelJob } from "./model-job.entity";
import { CreateModelJobDto } from "./dto/create-model-job.dto";
import { GenerateImageDto } from "./dto/generate-image.dto";
import { OpenAiImageService } from "./neuromodels/openai/openai-image.service";
import { ClientProxy } from "@nestjs/microservices";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { IModelJobCreate } from "./types/model-job-mutations.interface";

@Injectable()
export class ModelJobService {
  constructor(
    @InjectRepository(ModelJob)
    private readonly repository: Repository<ModelJob>,
    private readonly openaiService: OpenAiImageService,
    @Inject(MODEL_JOB_CLIENT) private readonly client: ClientProxy
  ) {}

  async create(data: IModelJobCreate): Promise<ModelJob> {
    const modelJob = this.repository.create(data);
    await this.repository.save(modelJob);

    this.client.emit("model_job_created", {
      modelJobId: modelJob.id,
      payload: data,
    });

    return modelJob;
  }

  async generate(dto: GenerateImageDto) {
    return this.openaiService.generate({ prompt: dto.prompt });
  }

  async process(params: {
    image: Buffer;
    prompt: string;
    imageFilename?: string;
  }) {
    // Здесь можешь создать/обновить запись ModelJob (status queued → processing → ...)
    return this.openaiService.process({
      image: params.image,
      imageFilename: params.imageFilename,
      prompt: params.prompt,
    });
  }
}
