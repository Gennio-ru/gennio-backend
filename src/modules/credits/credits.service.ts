import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "../users/user.entity";
import { UserCreditTransaction } from "./user-credit-transaction.entity";
import { CreditTransactionReason } from "./types/credits.enum";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(UserCreditTransaction)
    private readonly txRepo: Repository<UserCreditTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
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
  }): Promise<User> {
    const {
      userId,
      credits,
      modelJobId = null,
      reason = CreditTransactionReason.JobCharge,
      meta = null,
    } = params;

    if (credits <= 0) {
      return this.userRepo.findOneByOrFail({ id: userId });
    }

    return await this.dataSource.transaction(async (manager) => {
      const updateRes = await manager
        .createQueryBuilder()
        .update(User)
        .set({ credits: () => `credits - ${credits}` })
        .where("id = :userId", { userId })
        .andWhere("credits >= :credits", { credits })
        .returning("*") // 👈 вот это важно
        .execute();

      const updatedUser = updateRes.raw[0];

      if (!updatedUser) {
        throw new BadRequestException({
          handled: true,
          code: ErrorCode.CREDITS_NOT_ENOUGH,
          details: { required: credits },
        });
      }

      const tx = this.txRepo.create({
        userId,
        delta: -credits,
        reason,
        modelJobId,
        meta,
      });
      await manager.save(tx);

      return updatedUser as User;
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
