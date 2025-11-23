import { PaginationQueryDto } from "src/common/pagination/pagination.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsBoolean,
  IsIn,
} from "class-validator";
import { TokenTransactionReason } from "../types/user-token-transactions.enum";

export class FindUserTokenTransactionDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Поиск по userId, email, providerPaymentId, description",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: Number,
    description: "Фильтр по направлению платежа",
  })
  @IsOptional()
  @IsIn([1, -1])
  delta?: number;

  @ApiPropertyOptional({
    enum: TokenTransactionReason,
    description: "Фильтр по причине платежа",
  })
  @IsOptional()
  @IsEnum(TokenTransactionReason)
  reason?: TokenTransactionReason;

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
