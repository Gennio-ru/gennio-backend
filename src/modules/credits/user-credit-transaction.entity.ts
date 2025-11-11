import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";
import { CreditTransactionReason } from "./types/credits.enum";

@Entity("user_credit_transactions")
export class UserCreditTransaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Index()
  @Column({ type: "uuid" })
  userId: string;

  // +100 (начисление), -20 (списание)
  @Column({ type: "int" })
  delta: number;

  @Column({ type: "enum", enum: CreditTransactionReason })
  reason: CreditTransactionReason;

  // привязка к задаче (если есть)
  @Column({ type: "uuid", nullable: true })
  modelJobId: string | null;

  // необязательные доп. данные (тариф, пакет, промокод и т.п.)
  @Column({ type: "jsonb", nullable: true })
  meta: any | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;
}
