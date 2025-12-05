import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentEntity } from "./payments.entity";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { YookassaClient } from "./yookassa.client";
import { UserTokenTransactionsModule } from "../tokens/user-token-transactions.module";
import { PaymentsGateway } from "./payments.gateway";
import { UsersModule } from "../users/users.module";
import { InternalYookassaController } from "./internal-yookassa.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    UserTokenTransactionsModule,
    UsersModule,
  ],
  providers: [PaymentsService, YookassaClient, PaymentsGateway],
  controllers: [PaymentsController, InternalYookassaController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
