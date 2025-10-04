import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { ModelJob } from "./model-job.entity";
import { ModelJobService } from "./model-job.service";
import { ModelJobController } from "./model-job.controller";
import { OpenAiModule } from "./neuromodels/openai/openai.module";
import { RabbitmqModule } from "src/rabbitmq/rabbitmq.module";
import { MODEL_JOB_CLIENT } from "./model-job.constants";
import { ModelJobsProcessor } from "./model-job.processor";
import { FilesModule } from "../files/files.module";
import { PromptsModule } from "../prompts/prompts.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forFeature([ModelJob]),
    OpenAiModule,
    RabbitmqModule.register({
      name: MODEL_JOB_CLIENT,
    }),
    FilesModule,
    PromptsModule,
  ],
  controllers: [ModelJobController, ModelJobsProcessor],
  providers: [ModelJobService],
  exports: [ModelJobService],
})
export class ModelJobModule {}
