import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { User } from "../users/user.entity";
import { UserTokenTransaction } from "./user-token-transaction.entity";
import { TokensService } from "./tokens.service";

@Module({
  imports: [TypeOrmModule.forFeature([User, UserTokenTransaction])],
  providers: [TokensService],
  exports: [TokensService],
})
export class TokensModule {}
