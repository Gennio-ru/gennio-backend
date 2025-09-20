import { IsOptional, IsString } from "class-validator";
import { PaginationQueryDto } from "src/common/pagination/pagination.dto";

export class FindPromptsDto extends PaginationQueryDto {
  @IsOptional() @IsString() search?: string;
}
