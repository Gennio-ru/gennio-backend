import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
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
    example: "Старт",
    description: "Название пакета, отображаемое пользователю",
  })
  name: string;

  @ApiProperty({
    example: 100,
    description: "Количество токенов, которое будет начислено пользователю",
  })
  tokens: number;

  @ApiProperty({
    example: 100,
    description: "Стоимость пакета в рублях",
  })
  priceRub: number;

  @ApiPropertyOptional({
    example: true,
    description: "Пометить пакет как рекомендованный / выделенный",
  })
  highlight?: boolean;

  @ApiPropertyOptional({
    example: "+10% бонус",
    description: "Короткая плашка на карточке пакета (например, “Выгодно”)",
  })
  badge?: string;

  @ApiPropertyOptional({
    example: "Для регулярного использования",
    description: "Короткое пояснение под названием пакета",
  })
  subtitle?: string;

  @ApiPropertyOptional({
    example: 10,
    description:
      "Бонусные токены относительно оплаты (tokens - priceRub). Если бонусов нет — поле отсутствует.",
  })
  bonusTokens?: number;

  constructor(config: TokensPackConfig) {
    this.id = config.id;
    this.name = config.name;
    this.tokens = config.tokens;
    this.priceRub = config.priceRub;

    this.highlight = config.highlight;
    this.badge = config.badge;
    this.subtitle = config.subtitle;
    this.bonusTokens = config.bonusTokens;
  }
}
