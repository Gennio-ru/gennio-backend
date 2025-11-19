export enum TokensPackId {
  STARTER = "STARTER",
  BASIC = "BASIC",
  PRO = "PRO",
  MAX = "MAX",
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
    name: "10 генераций",
    tokens: 77,
    generations: 10,
    discountPercent: 0,
    priceRub: 70,
  },
  [TokensPackId.PRO]: {
    id: TokensPackId.PRO,
    name: "20 генераций",
    tokens: 154,
    generations: 20,
    discountPercent: 0,
    priceRub: 140,
    highlight: true,
  },
  [TokensPackId.MAX]: {
    id: TokensPackId.MAX,
    name: "50 генераций",
    tokens: 385,
    generations: 50,
    discountPercent: 0,
    priceRub: 350,
  },
};
