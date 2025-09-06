import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Patch,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  ParseUUIDPipe,
} from "@nestjs/common";
import { PromptsService } from "./prompts.service";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "src/modules/users/user-roles.guard";
import { UserRole } from "src/modules/users/types/user-role.enum";
import { Roles } from "src/modules/users/user-roles.decorator";
import { CreatePromptDto } from "./dto/create-prompt.dto";
import { FindPromptsDto } from "./dto/find-prompts.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { PromptDto } from "./dto/prompt.dto";

@ApiTags("prompts")
@Controller("prompts")
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @ApiOperation({
    summary: "Получить список промптов с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String, example: "face" })
  @ApiResponse({
    status: 200,
    description: "Список промптов с мета-данными",
    type: PromptDto,
    isArray: true,
  })
  findMany(
    @Query() query: FindPromptsDto
  ): Promise<PaginationResult<PromptDto>> {
    return this.promptsService.findMany(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Получить один промпт по id" })
  @ApiResponse({
    status: 200,
    description: "Найденный промпт",
    type: PromptDto,
  })
  @ApiResponse({ status: 404, description: "Промпт не найден" })
  findOne(@Param("id", ParseUUIDPipe) id: string): Promise<PromptDto> {
    return this.promptsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Создать новый промпт (только админ)" })
  @ApiResponse({ status: 201, description: "Промпт создан", type: PromptDto })
  create(@Body() dto: CreatePromptDto): Promise<PromptDto> {
    return this.promptsService.create(dto);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({ summary: "Обновить промпт (только админ)" })
  @ApiResponse({
    status: 200,
    description: "Обновлённый промпт",
    type: PromptDto,
  })
  @ApiResponse({ status: 404, description: "Промпт не найден" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Partial<PromptDto>
  ): Promise<PromptDto> {
    return this.promptsService.update(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @HttpCode(204)
  @ApiOperation({ summary: "Удалить промпт (только админ)" })
  @ApiResponse({ status: 204, description: "Промпт удалён" })
  @ApiResponse({ status: 404, description: "Промпт не найден" })
  async remove(@Param("id", ParseUUIDPipe) id: string): Promise<void> {
    await this.promptsService.remove(id);
  }
}
