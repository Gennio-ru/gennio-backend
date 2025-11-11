import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "../users/user.entity";
import { UserCreditTransaction } from "./user-credit-transaction.entity";
import { CreditTransactionReason } from "./types/credits.enum";

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(UserCreditTransaction)
    private readonly txRepo: Repository<UserCreditTransaction>,
    private readonly dataSource: DataSource
  ) {}

  /**
   * Списать кредиты (обычно за задачу).
   * Бросает ошибку, если кредитов не хватает.
   */
  async chargeForJob(params: {
    userId: string;
    credits: number;
    modelJobId?: string | null;
    reason?: CreditTransactionReason;
    meta?: any;
  }): Promise<void> {
    const {
      userId,
      credits,
      modelJobId = null,
      reason = CreditTransactionReason.JobCharge,
      meta = null,
    } = params;

    if (credits <= 0) return;

    await this.dataSource.transaction(async (manager) => {
      const res = await manager
        .createQueryBuilder()
        .update(User)
        .set({ credits: () => `credits - ${credits}` })
        .where("id = :userId", { userId })
        .andWhere("credits >= :credits", { credits })
        .execute();

      if (res.affected !== 1) {
        throw new Error("Not enough credits");
      }

      const tx = this.txRepo.create({
        userId,
        delta: -credits,
        reason,
        modelJobId,
        meta,
      });

      await manager.save(tx);
    });
  }

  /**
   * Начислить кредиты (покупка, промо, возврат и т.п.).
   */
  async addCredits(params: {
    userId: string;
    credits: number;
    modelJobId?: string | null;
    reason?: CreditTransactionReason;
    meta?: any;
  }): Promise<void> {
    const {
      userId,
      credits,
      modelJobId = null,
      reason = CreditTransactionReason.ManualAdd,
      meta = null,
    } = params;

    if (credits <= 0) return;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ credits: () => `credits + ${credits}` })
        .where("id = :userId", { userId })
        .execute();

      const tx = this.txRepo.create({
        userId,
        delta: credits,
        reason,
        modelJobId,
        meta,
      });

      await manager.save(tx);
    });
  }

  // опционально — вывод истории
  async getUserHistory(userId: string, limit = 50) {
    return this.txRepo.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
    });
  }
}
