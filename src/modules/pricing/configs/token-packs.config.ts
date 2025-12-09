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
    tokens: 10,
    generations: 1,
    priceRub: 10,
  },
  [TokensPackId.STARTER]: {
    id: TokensPackId.STARTER,
    name: "10 генераций",
    tokens: 100,
    generations: 10,
    priceRub: 100,
  },
  [TokensPackId.BASIC]: {
    id: TokensPackId.BASIC,
    name: "25 генераций",
    tokens: 270,
    generations: 25,
    priceRub: 250,
  },
  [TokensPackId.PRO]: {
    id: TokensPackId.PRO,
    name: "50 генераций",
    tokens: 550,
    generations: 50,
    priceRub: 500,
    highlight: true,
  },
};
