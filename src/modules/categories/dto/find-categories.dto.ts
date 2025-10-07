import { IsOptional, IsString } from "class-validator";

export class FindCategoriesDto {
  @IsOptional()
  @IsString()
  search?: string;
}
