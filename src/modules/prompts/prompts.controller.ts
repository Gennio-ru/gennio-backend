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
import { PromptDto, PromptResponseDto } from "./dto/prompt.dto";
import { UpdatePromptDto } from "./dto/update-prompt.dto";
import { ApiPaginatedResponse } from "src/common/swagger/api-paginated-response.decorator";
import {
  paginatePlainToInstance,
  plainModelToInstance,
} from "src/common/helpers/entity.helper";
import { OptionalJwtAuthGuard } from "../auth/guards/optional-jwt-auth.guard";
import { ReqUser } from "src/common/decorators/req-user.decorator";
import { ReqUserData } from "../auth/strategies/jwt-access.strategy";

@ApiTags("prompts")
@Controller("prompts")
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({
    summary: "Получить список промптов с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String, example: "face" })
  @ApiQuery({ name: "categoryId", required: false, type: String })
  @ApiPaginatedResponse(PromptResponseDto, { key: "items" })
  async findMany(
    @Query() query: FindPromptsDto,
    @ReqUser() user: ReqUserData
  ): Promise<PaginationResult<PromptDto>> {
    const page = await this.promptsService.findMany(query);

    return paginatePlainToInstance(PromptResponseDto, page, {
      groups: user ? [user?.role] : [],
    });
  }

  @Get(":id")
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: "Получить один промпт по id" })
  @ApiResponse({
    status: 200,
    description: "Найденный промпт",
    type: PromptDto,
  })
  @ApiResponse({ status: 404, description: "Промпт не найден" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @ReqUser() user: ReqUserData
  ): Promise<PromptDto> {
    const prompt = await this.promptsService.findOne(id);

    return plainModelToInstance(PromptResponseDto, prompt, {
      groups: user ? [user?.role] : [],
    });
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
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromptDto
  ): Promise<PromptDto> {
    const prompt = await this.promptsService.update(id, dto);

    return plainModelToInstance(PromptDto, prompt);
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
