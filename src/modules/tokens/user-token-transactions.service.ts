import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { User } from "../users/user.entity";
import { UserTokenTransaction } from "./user-token-transactions.entity";
import { TokenTransactionReason } from "./types/user-token-transactions.enum";
import { ErrorCode } from "src/common/errors/error-code.enum";
import { FindUserTokenTransactionDto } from "./dto/find-token-transactions.dto";
import { PaginationResult } from "src/common/pagination/pagination.interface";
import { UserTokenTransactionDto } from "./dto/user-token-transactions.dto";
import { paginate } from "src/common/pagination/pagination.util";

@Injectable()
export class UserTokenTransactionService {
  constructor(
    @InjectRepository(UserTokenTransaction)
    private readonly txRepo: Repository<UserTokenTransaction>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource
  ) {}

  //
  // Поиск / список
  //
  async findMany(
    query: FindUserTokenTransactionDto
  ): Promise<PaginationResult<UserTokenTransactionDto>> {
    return paginate<UserTokenTransaction>(
      this.txRepo,
      query,
      "userTokenTransaction",
      (qb) => {
        qb.leftJoinAndSelect("userTokenTransaction.user", "user");

        if (query.search) {
          const s = `%${query.search.toLowerCase()}%`;
          qb.andWhere(
            `(LOWER(user.email) LIKE :s OR LOWER(user.phone) LIKE :s)`,
            { s }
          );
        }

        if (query.reason) {
          qb.andWhere("userTokenTransaction.reason = :reason", {
            reason: query.reason,
          });
        }

        if (query.delta === 1) qb.andWhere("delta > 0");
        if (query.delta === -1) qb.andWhere("delta < 0");

        if (query.createdFrom) {
          qb.andWhere(
            `(userTokenTransaction.createdAt AT TIME ZONE 'Europe/Moscow')::date >= :fromDate`,
            { fromDate: query.createdFrom }
          );
        }

        if (query.createdTo) {
          qb.andWhere(
            `(userTokenTransaction.createdAt AT TIME ZONE 'Europe/Moscow')::date <= :toDate`,
            { toDate: query.createdTo }
          );
        }

        qb.orderBy("userTokenTransaction.createdAt", "DESC");
      }
    );
  }

  /**
   * Списать токены (обычно за задачу).
   * Бросает ошибку, если токенов не хватает.
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
   * Начислить токены (покупка, промо, возврат и т.п.).
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
      const txRepo = manager.getRepository(UserTokenTransaction);

      // 🔒 Идемпотентность для PAYMENT_PURCHASE:
      // если уже есть транзакция с таким paymentId — выходим, ничего не начисляем
      if (
        reason === TokenTransactionReason.PaymentPurchase &&
        meta?.paymentId
      ) {
        const existing = await txRepo
          .createQueryBuilder("tx")
          .where("tx.reason = :reason", { reason })
          .andWhere(`tx.meta->>'paymentId' = :paymentId`, {
            paymentId: meta.paymentId,
          })
          .getOne();

        if (existing) {
          // уже начисляли токены за этот платёж
          return;
        }
      }

      // обновляем баланс
      await manager
        .createQueryBuilder()
        .update(User)
        .set({ tokens: () => `tokens + ${tokens}` })
        .where("id = :userId", { userId })
        .execute();

      // пишем транзакцию
      const tx = txRepo.create({
        userId,
        delta: tokens,
        reason,
        modelJobId,
        meta,
      });

      await txRepo.save(tx);
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

  async isRefundAlreadyProcessed(refundId: string): Promise<boolean> {
    if (!refundId) return false;

    const existing = await this.txRepo
      .createQueryBuilder("tx")
      .where("tx.reason = :reason", {
        reason: TokenTransactionReason.PaymentRefund,
      })
      .andWhere(`tx.meta->>'refundId' = :refundId`, { refundId })
      .getOne();

    return Boolean(existing);
  }
}
