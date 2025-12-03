import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { PromptsService } from "./prompts.service";

@Injectable()
export class PromptsPreviewBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(PromptsPreviewBootstrapService.name);

  constructor(private readonly promptsService: PromptsService) {}

  async onApplicationBootstrap() {
    this.logger.log("Running prompts preview backfill on bootstrap...");
    await this.promptsService.backfillPreviews();
    this.logger.log("Prompts preview backfill on bootstrap completed");
  }
}
