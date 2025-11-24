export enum TokensPackId {
  STARTER = "STARTER",
  BASIC = "BASIC",
  PRO = "PRO",
}

export type TokensPackConfig = {
  id: TokensPackId;
  name: string;
  tokens: number;
  generations: number;
  discountPercent: number;
  priceRub: number;
  highlight?: boolean;
};

export const TOKEN_PACKS: Record<TokensPackId, TokensPackConfig> = {
  [TokensPackId.STARTER]: {
    id: TokensPackId.STARTER,
    name: "5 генераций",
    tokens: 35,
    generations: 5,
    discountPercent: 0,
    priceRub: 35,
  },
  [TokensPackId.BASIC]: {
    id: TokensPackId.BASIC,
    name: "15 генераций",
    tokens: 112,
    generations: 15,
    discountPercent: 0,
    priceRub: 105,
  },
  [TokensPackId.PRO]: {
    id: TokensPackId.PRO,
    name: "30 генераций",
    tokens: 231,
    generations: 30,
    discountPercent: 0,
    priceRub: 210,
    highlight: true,
  },
};
