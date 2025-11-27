import { Module } from "@nestjs/common";
import { AiGenerationClientService } from "./ai-generation.client.service";
import { RabbitmqModule } from "src/rabbitmq/rabbitmq.module";

export const AI_GENERATION_CLIENT = "AI_GENERATION_CLIENT";

@Module({
  imports: [
    RabbitmqModule.register({
      name: AI_GENERATION_CLIENT,
      queue: "ai-generation",
    }),
  ],
  providers: [AiGenerationClientService],
  exports: [AiGenerationClientService],
})
export class AiGenerationClientModule {}
