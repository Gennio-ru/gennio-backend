import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { TokenTransactionReason } from "./types/tokens.enum";

@Entity("user_token_transactions")
export class UserTokenTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "uuid" })
  userId: string;

  // +100 (начисление), -20 (списание)
  @Column({ type: "int" })
  delta: number;

  @Column({ type: "enum", enum: TokenTransactionReason })
  reason: TokenTransactionReason;

  // привязка к задаче (если есть)
  @Column({ type: "uuid", nullable: true })
  modelJobId: string | null;

  // необязательные доп. данные (тариф, пакет, промокод и т.п.)
  @Column({ type: "jsonb", nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
