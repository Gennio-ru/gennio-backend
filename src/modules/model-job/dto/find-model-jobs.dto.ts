import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/pagination/pagination.dto";
import { ModelJobStatusType, ModelJobType } from "../types/model-job.enum";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class FindModelJobsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    type: String,
    description: "Общий поиск",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: ModelJobType,
    description: "Фильтр по типу генерации",
  })
  @IsOptional()
  @IsEnum(ModelJobType)
  type?: ModelJobType;

  @ApiPropertyOptional({
    enum: ModelJobStatusType,
    description: "Фильтр по статусу генерации",
  })
  @IsOptional()
  @IsEnum(ModelJobStatusType)
  status?: ModelJobStatusType;

  @ApiPropertyOptional({
    description: "Дата создания — от",
    type: String,
    example: "2024-10-01",
  })
  @IsOptional()
  @IsDateString()
  createdFrom?: string;

  @ApiPropertyOptional({
    description: "Дата создания — до",
    type: String,
    example: "2024-10-10",
  })
  @IsOptional()
  @IsDateString()
  createdTo?: string;
}
