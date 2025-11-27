import { ISchema } from "src/common/base/base.interface";
import { TokenTransactionReason } from "./user-token-transactions.enum";

export interface IUserTokenTransactionBase {
  userId: string | null;
  delta: number;
  reason: TokenTransactionReason;
  modelJobId: string | null;
  meta: Record<string, any> | null;
}

export interface IUserTokenTransaction
  extends ISchema,
    IUserTokenTransactionBase {}
