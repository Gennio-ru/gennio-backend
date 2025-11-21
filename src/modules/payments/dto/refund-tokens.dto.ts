import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, Min, IsOptional, IsString, MaxLength } from "class-validator";

export class RefundTokensDto {
  @ApiProperty({
    description: "Сколько токенов вернуть пользователю",
    example: 100,
  })
  @IsInt()
  @Min(1)
  tokens: number;

  @ApiPropertyOptional({
    description: "Комментарий к рефанду (уходит в YooKassa)",
    example: "Частичный возврат по просьбе пользователя",
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class RefundTokensPreviewDto {
  @ApiProperty()
  paymentId: string;

  @ApiProperty()
  userId: string;

  @ApiProperty({
    description: "Всего токенов куплено этим платежом",
  })
  tokensPurchased: number;

  @ApiProperty({
    description: "Уже возвращено токенов по этому платежу",
  })
  tokensRefunded: number;

  @ApiProperty({
    description: "Осталось токенов, подвязанных к этому платежу",
  })
  remainingByPayment: number;

  @ApiProperty({
    description: "Текущий баланс токенов пользователя",
  })
  userBalance: number;

  @ApiProperty({
    description: "Максимум токенов, который можно вернуть сейчас",
  })
  maxTokensToRefund: number;

  @ApiProperty({
    description: "Цена одного токена по этому платежу (RUB)",
  })
  pricePerToken: number;

  @ApiProperty({
    description: "Максимальная сумма к возврату (RUB)",
  })
  maxAmountRub: number;

  @ApiProperty()
  currency: string;
}
