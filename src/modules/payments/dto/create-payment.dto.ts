import { ApiProperty } from "@nestjs/swagger";
import {
  ICreatePayment,
  ICreateTokensPayment,
} from "../types/payments-mutations.interface";
import { TokensPackId } from "src/modules/pricing/configs/token-packs.config";
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreatePaymentDto implements ICreatePayment {
  @ApiProperty({
    type: Number,
    example: 199,
    description: "Сумма платежа в рублях",
  })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiProperty({
    type: String,
    example: "Пополнение токенов",
    required: false,
    description: "Описание платежа, отправляется в YooKassa",
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    type: Object,
    required: false,
    description: "Произвольные данные. Сохраняются в meta платежа",
  })
  @IsOptional()
  @IsObject()
  meta?: any;
}

export class CreateTokensPaymentDto implements ICreateTokensPayment {
  @ApiProperty({
    type: String,
    example: "pro",
    description: "ID пакета токенов, выбранный пользователем",
  })
  @IsEnum(TokensPackId, { message: "packId must be a valid TokensPackId" })
  packId!: TokensPackId;

  @ApiProperty({
    type: String,
    required: false,
    example: "/pricing",
    description:
      "Путь на фронте, куда вернуть пользователя после оплаты. " +
      "Если не указан — используем /payment/return.",
  })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  returnPath?: string;
}
