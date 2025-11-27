import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { TokenTransactionReason } from "./types/user-token-transactions.enum";
import { BaseEntity } from "src/common/base/base.entity";
import { IUserTokenTransaction } from "./types/user-token-transactions.interface";
import { User } from "../users/user.entity";

@Entity("user_token_transactions")
export class UserTokenTransaction
  extends BaseEntity
  implements IUserTokenTransaction
{
  @Index()
  @Column({ type: "uuid" })
  userId: string;

  @ManyToOne(() => User, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "userId" })
  user!: User;

  // +100 (начисление), -20 (списание)
  @Column({ type: "int" })
  delta: number;

  @Column({ type: "enum", enum: TokenTransactionReason })
  reason: TokenTransactionReason;

  // привязка к задаче (если есть)
  @Column({ type: "uuid", nullable: true })
  modelJobId!: string | null;

  // необязательные доп. данные (тариф, пакет, промокод и т.п.)
  @Column({ type: "jsonb", nullable: true })
  meta!: Record<string, any> | null;
}
