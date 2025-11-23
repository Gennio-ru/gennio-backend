import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { PaginationQueryDto } from "src/common/pagination/pagination.dto";
import { UserRole } from "../types/user-role.enum";

export class FindUsersDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: UserRole,
    enumName: "UserRole",
    description: "Фильтр по роли пользователя",
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @ApiPropertyOptional({
    type: Number,
    example: 50,
    description: "Минимальное количество токенов",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tokensMin?: number;

  @ApiPropertyOptional({
    type: Number,
    example: 200,
    description: "Максимальное количество токенов",
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  tokensMax?: number;
}
