import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
} from "@nestjs/common";
import { ModelJobService } from "./model-job.service";
import { CreateModelJobDto } from "./dto/create-model-job.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../users/user-roles.guard";
import { UserRole } from "../users/types/user-role.enum";
import { Roles } from "../users/user-roles.decorator";
import { ApiOperation, ApiResponse } from "@nestjs/swagger";
import { ModelJobDto } from "./dto/model-job.dto";

@Controller("model-job")
export class ModelJobController {
  constructor(private readonly modelJobService: ModelJobService) {}

  @Get(":id")
  @ApiOperation({ summary: "Получить один процесс по id" })
  @ApiResponse({
    status: 200,
    description: "Найденный процесс",
    type: ModelJobDto,
  })
  @ApiResponse({ status: 404, description: "Процесс не найден" })
  async findOne(@Param("id", ParseUUIDPipe) id: string): Promise<ModelJobDto> {
    return this.modelJobService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiResponse({
    status: 201,
    description: "Генерация запущена",
    type: ModelJobDto,
  })
  async create(@Body() dto: CreateModelJobDto, @UserId() userId: string) {
    const data = await this.modelJobService.create({ ...dto, userId });
    return data;
  }
}
