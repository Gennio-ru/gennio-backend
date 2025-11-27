import { Inject, Injectable } from "@nestjs/common";
import { ClientProxy } from "@nestjs/microservices";
import { AiImageJobPayload, AiImageJobResult } from "../ai-generation.types";
import { lastValueFrom } from "rxjs";
import { AI_IMAGE_JOB_PATTERN } from "../ai-generation.constants";
import { AI_GENERATION_CLIENT } from "./ai-generation.client.constants";

@Injectable()
export class AiGenerationClientService {
  constructor(
    @Inject(AI_GENERATION_CLIENT) private readonly client: ClientProxy
  ) {}

  async sendJob(payload: AiImageJobPayload): Promise<AiImageJobResult> {
    return await lastValueFrom(
      this.client.send<AiImageJobResult>(AI_IMAGE_JOB_PATTERN, payload)
    );
  }
}
