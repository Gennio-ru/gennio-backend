import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { UserTokenTransaction } from "./user-token-transactions.entity";
import { UserTokenTransactionService } from "./user-token-transactions.service";
import { UserTokenTransactionsController } from "./user-token-transactions.controller";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTokenTransaction])],
  controllers: [UserTokenTransactionsController],
  providers: [UserTokenTransactionService],
  exports: [UserTokenTransactionService],
})
export class UserTokenTransactionsModule {}
