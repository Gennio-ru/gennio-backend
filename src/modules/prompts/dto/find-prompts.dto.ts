import { IsEnum, IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/pagination/pagination.dto";
import { ModelType } from "src/modules/model-job/types/model-job.enum";

export class FindPromptsDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsEnum(ModelType)
  model?: ModelType;
}
