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

@Controller("model-job")
export class ModelJobController {
  constructor(private readonly modelJobService: ModelJobService) {}

  @Get(":id")
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
    return this.modelJobService.findOne(id);
  }

  @Post("/start-image-edit-by-prompt-id")
  @UseGuards(JwtAuthGuard)
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
    return data;
  }

  @Post("/start-image-edit-by-prompt-text")
  @UseGuards(JwtAuthGuard)
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
    return data;
  }

  @Post("start-image-generate")
  @UseGuards(JwtAuthGuard)
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
    return data;
  }

  // @Post("start-text-generate")
  // @UseGuards(JwtAuthGuard)
  // @ApiResponse({
  //   status: 201,
  //   description: "Генерация запущена",
  //   type: ModelJobDto,
  // })
  // @ApiBadRequestResponse({
  //   description: "Бизнес-ошибка (например, не хватает кредитов)",
  //   type: ErrorResponseDto,
  // })
  // async startTextGenerate(
  //   @Body() dto: StartTextGenerateDto,
  //   @UserId() userId: string
  // ) {
  //   const data = await this.modelJobService.create({
  //     ...dto,
  //     type: ModelJobType.TextGenerate,
  //     userId,
  //     tariffCode: ModelTariffCode.TextBasic,
  //   });
  //   return data;
  // }
}
