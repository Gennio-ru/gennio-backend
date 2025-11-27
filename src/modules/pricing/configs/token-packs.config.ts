export enum TokensPackId {
  ONCE = "ONCE",
  STARTER = "STARTER",
  BASIC = "BASIC",
  PRO = "PRO",
}

export type TokensPackConfig = {
  id: TokensPackId;
  name: string;
  tokens: number;
  generations: number;
  priceRub: number;
  highlight?: boolean;
};

export const TOKEN_PACKS: Record<TokensPackId, TokensPackConfig> = {
  [TokensPackId.ONCE]: {
    id: TokensPackId.ONCE,
    name: "1 генерация",
    tokens: 7,
    generations: 1,
    priceRub: 10,
  },
  [TokensPackId.STARTER]: {
    id: TokensPackId.STARTER,
    name: "5 генераций",
    tokens: 35,
    generations: 5,
    priceRub: 35,
  },
  [TokensPackId.BASIC]: {
    id: TokensPackId.BASIC,
    name: "15 генераций",
    tokens: 112,
    generations: 15,
    priceRub: 105,
  },
  [TokensPackId.PRO]: {
    id: TokensPackId.PRO,
    name: "30 генераций",
    tokens: 231,
    generations: 30,
    priceRub: 210,
    highlight: true,
  },
};
