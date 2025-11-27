import {
  ApiProperty,
  ApiPropertyOptional,
  IntersectionType,
} from "@nestjs/swagger";
import { BaseDto } from "src/common/base/base.dto";
import { TokenTransactionReason } from "../types/user-token-transactions.enum";
import {
  IUserTokenTransaction,
  IUserTokenTransactionBase,
} from "../types/user-token-transactions.interface";
import { UserDto } from "src/modules/users/dto/user.dto";
import { Type } from "class-transformer";

export class UserTokenTransactionBaseDto implements IUserTokenTransactionBase {
  @ApiProperty({
    type: String,
    format: "uuid",
    description: "ID пользователя",
  })
  userId!: string;

  @ApiProperty({
    type: () => UserDto,
    nullable: true,
    description: "Пользователь (если подгружен)",
  })
  @Type(() => UserDto)
  user!: UserDto | null;

  @ApiProperty({
    type: Number,
    example: 50,
    description: "Изменение баланса: +100 начисление, -20 списание",
  })
  delta!: number;

  @ApiProperty({
    enum: TokenTransactionReason,
    enumName: "TokenTransactionReason",
    description: "Причина изменения токенов",
  })
  reason!: TokenTransactionReason;

  @ApiPropertyOptional({
    type: String,
    format: "uuid",
    nullable: true,
    description:
      "ID задачи модели, если транзакция связана с выполнением задания",
  })
  modelJobId!: string | null;

  @ApiPropertyOptional({
    type: Object,
    nullable: true,
    description: "Доп. данные — тариф, промокод, пакет токенов и т.п.",
  })
  meta!: Record<string, any> | null;
}

export class UserTokenTransactionDto
  extends IntersectionType(UserTokenTransactionBaseDto, BaseDto)
  implements IUserTokenTransaction {}
