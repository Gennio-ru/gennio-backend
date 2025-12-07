import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { GoogleGenAI } from "@google/genai";

import { GEMINI_CLIENT } from "./gemini.constants";
import { GeminiImageService } from "./gemini-image.service";

@Module({
  imports: [ConfigModule],
  providers: [
    GeminiImageService,
    {
      provide: GEMINI_CLIENT,
      useFactory: (config: ConfigService) => {
        const apiKey = config.get<string>("GEMINI_API_SECRET");

        return new GoogleGenAI({ apiKey });
      },
      inject: [ConfigService],
    },
  ],
  exports: [GeminiImageService],
})
export class GeminiModule {}
