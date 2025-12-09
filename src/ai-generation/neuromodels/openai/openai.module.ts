import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { OPENAI_CLIENT } from "./openai.constants";
import { OpenAiImageService } from "./openai.service";

@Module({
  imports: [ConfigModule],
  providers: [
    OpenAiImageService,
    {
      provide: OPENAI_CLIENT,
      useFactory: (config: ConfigService) =>
        new OpenAI({
          apiKey: config.get<string>("OPEN_AI_API_SECRET"),
          maxRetries: 2,
          timeout: 300_000,
        }),
      inject: [ConfigService],
    },
  ],
  exports: [OpenAiImageService],
})
export class OpenAiModule {}
