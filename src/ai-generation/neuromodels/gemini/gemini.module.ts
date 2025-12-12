import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";

import { GEMINI_CLIENT } from "./gemini.constants";
import { GeminiImageService } from "./gemini-image.service";
import { createGeminiClient } from "./gemini.client.factory";

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiImageService,
    {
      provide: GEMINI_CLIENT,
      useFactory: (config: ConfigService) => createGeminiClient(config),
      inject: [ConfigService],
    },
  ],
  exports: [GeminiImageService],
})
export class GeminiModule {}
