import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  BadRequestException,
} from "@nestjs/common";
import { ModelJobService } from "./model-job.service";
import {
  StartAdminGenerateDto,
  StartImageEditByPromptIdDto,
  StartImageEditByPromptTextDto,
  StartImageGenerateByPromptTextDto,
} from "./dto/create-model-job.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from "@nestjs/swagger";
import {
  ModelJobDto,
  ModelJobFullDto,
  ModelJobWithPreviewFileDto,
} from "./dto/model-job.dto";
import {
  ModelJobStatusType,
  ModelJobType,
  ModelType,
} from "./types/model-job.enum";
import { ModelTariffCode } from "../pricing/types/pricing.enum";
import { ErrorResponseDto } from "src/common/errors/error-response.dto";
import { RequireTokens } from "src/common/decorators/require-tokens.decorator";
import { RequireTokensGuard } from "src/common/guards/require-tokens.guard";
import {
  paginatePlainToInstance,
  plainModelToInstance,
  plainModelToInstanceArray,
} from "src/common/helpers/entity.helper";
import { RolesGuard } from "../users/user-roles.guard";
import { Roles } from "../users/user-roles.decorator";
import { UserRole } from "../users/types/user-role.enum";
import { ApiPaginatedResponse } from "src/common/swagger/api-paginated-response.decorator";
import { FindModelJobsDto } from "./dto/find-model-jobs.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { ReqUser } from "src/common/decorators/req-user.decorator";
import { ReqUserData } from "../auth/strategies/jwt-access.strategy";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Controller("model-job")
export class ModelJobController {
  constructor(private readonly modelJobService: ModelJobService) {}

  // Список генераций с фильтрами и пагинацией
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiOperation({
    summary: "Получить список генераций с фильтрами и пагинацией",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 10 })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "status", required: false, enum: ModelJobStatusType })
  @ApiQuery({ name: "type", required: false, enum: ModelJobType })
  @ApiQuery({ name: "createdFrom", required: false, type: String })
  @ApiQuery({ name: "createdTo", required: false, type: String })
  @ApiPaginatedResponse(ModelJobDto, { key: "items" })
  async findMany(
    @Query() query: FindModelJobsDto
  ): Promise<PaginationResult<ModelJobDto>> {
    const page = await this.modelJobService.findMany(query);

    return paginatePlainToInstance(ModelJobDto, page);
  }

  @Get("last-generations")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Получить последние несколько генераций запросившего пользователя",
  })
  @ApiResponse({ status: 200, type: [ModelJobWithPreviewFileDto] })
  async lastGenerations(
    @UserId() userId: string
  ): Promise<ModelJobWithPreviewFileDto[]> {
    const modelJobs = await this.modelJobService.lastModelJobs(userId);

    return plainModelToInstanceArray(ModelJobWithPreviewFileDto, modelJobs);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Получить один процесс по id" })
  @ApiResponse({
    status: 200,
    description: "Найденный процесс",
    type: ModelJobFullDto,
  })
  @ApiResponse({ status: 404, description: "Процесс не найден" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @ReqUser() user: ReqUserData
  ): Promise<ModelJobFullDto> {
    const modelJob = await this.modelJobService.findOne(id);

    if (user.role !== UserRole.Admin && modelJob.userId !== user.userId) {
      throw new BadRequestException({
        handled: true,
        code: ErrorCode.FORBIDDEN,
      });
    }

    return plainModelToInstance(ModelJobFullDto, modelJob, {
      groups: [user.role],
    });
  }

  @Post("/start-image-edit-by-prompt-id")
  @RequireTokens(7)
  @UseGuards(JwtAuthGuard, RequireTokensGuard)
  @ApiResponse({
    status: 201,
    description: "Генерация запущена",
    type: ModelJobDto,
  })
  @ApiBadRequestResponse({
    description: "Бизнес-ошибка (например, не хватает токенов)",
    type: ErrorResponseDto,
  })
  async startImageEditByPromptId(
    @Body() dto: StartImageEditByPromptIdDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
      type: ModelJobType.ImageEditByPromptId,
      userId,
      tariffCode: ModelTariffCode.ImageBasicEdit,
    });

    return plainModelToInstance(ModelJobDto, data);
  }

  @Post("/start-image-edit-by-prompt-text")
  @RequireTokens(7)
  @UseGuards(JwtAuthGuard, RequireTokensGuard)
  @ApiResponse({
    status: 201,
    description: "Генерация запущена",
    type: ModelJobDto,
  })
  @ApiBadRequestResponse({
    description: "Бизнес-ошибка (например, не хватает токенов)",
    type: ErrorResponseDto,
  })
  async startImageEditByPromptText(
    @Body() dto: StartImageEditByPromptTextDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
      model: ModelType.Gemini,
      type: ModelJobType.ImageEditByPromptText,
      userId,
      tariffCode: ModelTariffCode.ImageBasicEdit,
    });

    return plainModelToInstance(ModelJobDto, data);
  }

  @Post("start-image-generate")
  @RequireTokens(7)
  @UseGuards(JwtAuthGuard, RequireTokensGuard)
  @ApiResponse({
    status: 201,
    description: "Генерация запущена",
    type: ModelJobDto,
  })
  @ApiBadRequestResponse({
    description: "Бизнес-ошибка (например, не хватает токенов)",
    type: ErrorResponseDto,
  })
  async startImageGenerateByPromptText(
    @Body() dto: StartImageGenerateByPromptTextDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
      model: ModelType.OpenAI,
      type: ModelJobType.ImageGenerateByPromptText,
      userId,
      tariffCode: ModelTariffCode.ImageBasicGenerate,
    });

    return plainModelToInstance(ModelJobDto, data);
  }

  @Post("start-admin-generate")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiResponse({
    status: 201,
    description: "Генерация запущена",
    type: ModelJobDto,
  })
  @ApiBadRequestResponse({
    description: "Бизнес-ошибка (например, не хватает токенов)",
    type: ErrorResponseDto,
  })
  async startAdminGenerate(
    @Body() dto: StartAdminGenerateDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
      userId,
      tariffCode: ModelTariffCode.AdminGenerate,
    });

    return plainModelToInstance(ModelJobDto, data);
  }
}
