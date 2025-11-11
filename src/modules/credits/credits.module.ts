import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { UserCreditTransaction } from "./user-credit-transaction.entity";
import { CreditsService } from "./credits.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserCreditTransaction])],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}
