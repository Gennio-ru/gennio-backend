import { PaginationQueryDto } from "src/common/pagination/pagination.dto";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsDate,
  isDateString,
} from "class-validator";
import { PaymentStatus } from "../types/payments.enum";
import { Type } from "class-transformer";

export class FindPaymentsDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: "Поиск по userId, email, providerPaymentId, description",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    enum: PaymentStatus,
    description: "Фильтр по статусу платежа",
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

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
