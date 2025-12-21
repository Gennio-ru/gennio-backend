export enum TokensPackId {
  STARTER = "STARTER",
  BASIC = "BASIC",
  ADVANCED = "ADVANCED",
  PRO = "PRO",
}

export type TokensPackConfig = {
  id: TokensPackId;
  name: string;

  priceRub: number; // сколько платит пользователь
  tokens: number; // сколько токенов получает
  highlight?: boolean;
  badge?: string; // "Выгодно", "Популярное", "+10% бонус"
  subtitle?: string; // короткое пояснение

  // опционально: чтобы в UI легко показать выгоду
  bonusTokens?: number; // tokens - priceRub (если токен ≈ рублю)
};

export const TOKEN_PACKS: Record<TokensPackId, TokensPackConfig> = {
  [TokensPackId.STARTER]: {
    id: TokensPackId.STARTER,
    name: "Стартовый",
    subtitle: "Для знакомства с сервисом",
    tokens: 60,
    priceRub: 60,
  },
  [TokensPackId.BASIC]: {
    id: TokensPackId.BASIC,
    name: "Базовый",
    subtitle: "С приятным бонусом",
    tokens: 300,
    priceRub: 300,
    bonusTokens: 20,
  },
  [TokensPackId.ADVANCED]: {
    id: TokensPackId.ADVANCED,
    name: "Продвинутый",
    subtitle: "Уверенный запас",
    tokens: 600,
    priceRub: 600,
    bonusTokens: 60,
    highlight: true,
  },
  [TokensPackId.PRO]: {
    id: TokensPackId.PRO,
    name: "Максимальный",
    subtitle: "Самый выгодный",
    tokens: 1000,
    priceRub: 1000,
    bonusTokens: 140,
  },
};
