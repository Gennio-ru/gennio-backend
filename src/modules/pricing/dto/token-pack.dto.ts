import { ApiProperty } from "@nestjs/swagger";
import { TokensPackConfig, TokensPackId } from "../configs/token-packs.config";

export class TokenPackDto implements TokensPackConfig {
  @ApiProperty({
    enum: TokensPackId,
    enumName: "TokensPackId",
    example: TokensPackId.STARTER,
    description: "Уникальный идентификатор пакета",
  })
  id: TokensPackId;

  @ApiProperty({
    example: "5 генераций",
    description: "Название пакета, отображаемое пользователю",
  })
  name: string;

  @ApiProperty({
    example: 25,
    description: "Количество токенов в пакете",
  })
  tokens: number;

  @ApiProperty({
    example: 5,
    description:
      "Ориентировочное количество генераций, которое покрывает пакет",
  })
  generations: number;

  @ApiProperty({
    example: 10,
    description: "Скидка в процентах относительно базовой цены",
  })
  discountPercent: number;

  @ApiProperty({
    example: 35,
    description: "Количество токенов в пакете",
  })
  pri: number;

  @ApiProperty({
    example: 35,
    description: "Стоимость в рублях",
  })
  priceRub: number;

  @ApiProperty({
    example: true,
    required: false,
    description: "Пометить пакет как рекомендованный / выделенный",
  })
  highlight?: boolean;

  constructor(config: TokensPackConfig) {
    this.id = config.id;
    this.name = config.name;
    this.tokens = config.tokens;
    this.generations = config.generations;
    this.discountPercent = config.discountPercent;
    this.highlight = config.highlight;
  }
}
