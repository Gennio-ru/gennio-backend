import { Controller, Post, Body, UseGuards } from "@nestjs/common";
import { ModelJobService } from "./model-job.service";
import { CreateModelJobDto } from "./dto/create-model-job.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

@Controller("model-job")
export class ModelJobController {
  constructor(private readonly modelJobService: ModelJobService) {}

  @Post("create")
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateModelJobDto, @UserId() userId: string) {
    const data = await this.modelJobService.create({ ...dto, userId });
    return { data };
  }
}
