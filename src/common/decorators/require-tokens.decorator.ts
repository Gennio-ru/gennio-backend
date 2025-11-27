import { SetMetadata } from "@nestjs/common";

export const REQUIRE_TOKENS_KEY = "requireTokens";

export const RequireTokens = (amount: number = 1) =>
  SetMetadata(REQUIRE_TOKENS_KEY, amount);
