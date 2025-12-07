import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AiGenerationController } from "./ai-generation.controller";
import { OpenAiModule } from "./neuromodels/openai/openai.module";
import { ConcurrencyGuard } from "./concurrency.guard";
import { GeminiModule } from "./neuromodels/gemini/gemini.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    OpenAiModule,
    GeminiModule,
  ],
  controllers: [AiGenerationController],
  providers: [ConcurrencyGuard],
})
export class AiGenerationModule {}
