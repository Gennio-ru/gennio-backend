import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAccessStrategy } from "./strategies/jwt-access.strategy";
import { UsersModule } from "../users/users.module";
import { MailService } from "../mail/mail.service";
import { RedisModule } from "../redis/redis.module";
import { OtpStore } from "./otp.store";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Session } from "./session.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Session]),
    UsersModule,
    RedisModule,
    JwtModule.register({
      secret: process.env.JWT_ACCESS_SECRET,
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAccessStrategy, MailService, OtpStore],
  exports: [AuthService, OtpStore],
})
export class AuthModule {}
