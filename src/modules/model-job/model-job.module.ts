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
import { ModelJobGateway } from "./model-job.gateway";
import { PricingModule } from "../pricing/pricing.module";
import { UserTokenTransactionsModule } from "../tokens/user-token-transactions.module";
import { ImageModule } from "src/common/image/image.module";
import { ModelJobWatchdogService } from "./model-job-watchdog.service";

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
    UserTokenTransactionsModule,
    PricingModule,
    ImageModule,
  ],
  controllers: [ModelJobController, ModelJobsProcessor],
  providers: [ModelJobService, ModelJobGateway, ModelJobWatchdogService],
  exports: [ModelJobService],
})
export class ModelJobModule {}
