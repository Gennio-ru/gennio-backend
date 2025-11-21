import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { PaymentStatus } from "./types/payments.enum";
import { IPayment } from "./types/payments.interface";
import { BaseEntity } from "src/common/base/base.entity";
import { User } from "../users/user.entity";

@Entity("payments")
export class PaymentEntity extends BaseEntity implements IPayment {
  @Index()
  @Column({ type: "uuid", nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { onDelete: "NO ACTION" })
  @JoinColumn({ name: "userId" })
  user!: User;

  // Сумма в рублях
  @Column({ type: "numeric", precision: 10, scale: 2 })
  amount: string; // храним как строку (numeric)

  @Column({ type: "varchar", length: 3, default: "RUB" })
  currency: string;

  @Column({ type: "varchar", length: 32, default: "yookassa" })
  provider: string;

  // ID платежа в YooKassa (payment_id)
  @Index()
  @Column({ type: "varchar", length: 128, nullable: true })
  providerPaymentId: string | null;

  // Статус в нашей системе
  @Index()
  @Column({ type: "enum", enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  // URL, куда надо отправить юзера для оплаты (confirmation_url)
  @Column({ type: "text", nullable: true })
  confirmationUrl: string | null;

  // Описание (что покупает: кредиты / тариф / подписка)
  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({ type: "int", nullable: true })
  tokensPurchased: number | null; // сколько токенов было начислено за этот платеж

  @Column({ type: "int", nullable: true, default: 0 })
  tokensRefunded: number | null; // сколько токенов уже было "отозвано" рефандами

  // Сырые данные YooKassa (последний объект payment / refund)
  @Column({ type: "jsonb", nullable: true })
  providerPayload: any | null;

  // Доп. данные по проекту (id заказа, id тарифа и т.п.)
  @Column({ type: "jsonb", nullable: true })
  meta: any | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  capturedAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  canceledAt: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  refundedAt: Date | null;

  @Column({ type: "numeric", precision: 10, scale: 2, nullable: true })
  refundedAmount: string | null;

  @Column({ type: "varchar", length: 128, nullable: true })
  errorCode: string | null;

  @Column({ type: "text", nullable: true })
  errorMessage: string | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  processedAt: Date | null;
}
