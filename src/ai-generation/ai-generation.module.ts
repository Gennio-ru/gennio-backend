import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AiGenerationController } from "./ai-generation.controller";
import OpenAI from "openai";
import { OpenAiModule } from "./neuromodels/openai/openai.module";
import { OPENAI_CLIENT } from "./neuromodels/openai/openai.constants";
import { OpenAiImageService } from "./neuromodels/openai/openai.service";
import { ConcurrencyGuard } from "./concurrency.guard";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    OpenAiModule,
  ],
  controllers: [AiGenerationController],
  providers: [
    OpenAiImageService,
    {
      provide: OPENAI_CLIENT,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("OPEN_AI_API_SECRET");

        return new OpenAI({
          apiKey,
          timeout: 90_000,
        });
      },
      inject: [ConfigService],
    },
    ConcurrencyGuard,
  ],
})
export class AiGenerationModule {}
