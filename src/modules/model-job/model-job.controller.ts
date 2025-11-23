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
import {
  StartImageEditByPromptIdDto,
  StartImageEditByPromptTextDto,
  StartImageGenerateByPromptTextDto,
} from "./dto/create-model-job.dto";
import { UserId } from "src/common/decorators/user-id.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import {
  ApiBadRequestResponse,
  ApiOperation,
  ApiResponse,
} from "@nestjs/swagger";
import { ModelJobDto, ModelJobFullDto } from "./dto/model-job.dto";
import { ModelJobType } from "./types/model-job.enum";
import { ModelTariffCode } from "../pricing/types/pricing.enum";
import { ErrorResponseDto } from "src/common/errors/error-response.dto";
import { RequireTokens } from "src/common/decorators/require-tokens.decorator";
import { RequireTokensGuard } from "src/common/guards/require-tokens.guard";
import { plainModelToInstance } from "src/common/helpers/entity.helper";

@Controller("model-job")
export class ModelJobController {
  constructor(private readonly modelJobService: ModelJobService) {}

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
    @Param("id", ParseUUIDPipe) id: string
  ): Promise<ModelJobFullDto> {
    const modelJob = await this.modelJobService.findOne(id);

    console.log(plainModelToInstance(ModelJobFullDto, modelJob));

    return plainModelToInstance(ModelJobFullDto, modelJob);
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
    description: "Бизнес-ошибка (например, не хватает кредитов)",
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
    description: "Бизнес-ошибка (например, не хватает кредитов)",
    type: ErrorResponseDto,
  })
  async startImageEditByPromptText(
    @Body() dto: StartImageEditByPromptTextDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
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
    description: "Бизнес-ошибка (например, не хватает кредитов)",
    type: ErrorResponseDto,
  })
  async startImageGenerateByPromptText(
    @Body() dto: StartImageGenerateByPromptTextDto,
    @UserId() userId: string
  ) {
    const data = await this.modelJobService.create({
      ...dto,
      type: ModelJobType.ImageGenerateByPromptText,
      userId,
      tariffCode: ModelTariffCode.ImageBasicGenerate,
    });

    return plainModelToInstance(ModelJobDto, data);
  }
}
