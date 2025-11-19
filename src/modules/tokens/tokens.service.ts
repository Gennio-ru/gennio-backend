import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "../users/user.entity";
import { UserTokenTransaction } from "./user-token-transaction.entity";
import { TokenTransactionReason } from "./types/tokens.enum";
import { ErrorCode } from "src/common/errors/error-code.enum";

@Injectable()
export class TokensService {
  constructor(
    @InjectRepository(UserTokenTransaction)
    private readonly txRepo: Repository<UserTokenTransaction>,
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
    tokens: number;
    modelJobId?: string | null;
    reason?: TokenTransactionReason;
    meta?: any;
  }): Promise<User> {
    const {
      userId,
      tokens,
      modelJobId = null,
      reason = TokenTransactionReason.JobCharge,
      meta = null,
    } = params;

    if (tokens <= 0) {
      return this.userRepo.findOneByOrFail({ id: userId });
    }

    return await this.dataSource.transaction(async (manager) => {
      const updateRes = await manager
        .createQueryBuilder()
        .update(User)
        .set({ tokens: () => `tokens - ${tokens}` })
        .where("id = :userId", { userId })
        .andWhere("tokens >= :tokens", { tokens })
        .returning("*") // 👈 вот это важно
        .execute();

      const updatedUser = updateRes.raw[0];

      if (!updatedUser) {
        throw new BadRequestException({
          handled: true,
          code: ErrorCode.TOKENS_NOT_ENOUGH,
          details: { required: tokens },
        });
      }

      const tx = this.txRepo.create({
        userId,
        delta: -tokens,
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
  async addTokens(params: {
    userId: string;
    tokens: number;
    modelJobId?: string | null;
    reason?: TokenTransactionReason;
    meta?: any;
  }): Promise<void> {
    const {
      userId,
      tokens,
      modelJobId = null,
      reason = TokenTransactionReason.ManualAdd,
      meta = null,
    } = params;

    if (tokens <= 0) return;

    await this.dataSource.transaction(async (manager) => {
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ tokens: () => `tokens + ${tokens}` })
        .where("id = :userId", { userId })
        .execute();

      const tx = this.txRepo.create({
        userId,
        delta: tokens,
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
