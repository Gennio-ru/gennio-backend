import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentEntity } from "./payments.entity";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { UserTokenTransactionsModule } from "../tokens/user-token-transactions.module";
import { PaymentsGateway } from "./payments.gateway";
import { UsersModule } from "../users/users.module";
import { InternalRobokassaController } from "./internal-robokassa.controller";
import { RobokassaClient } from "./robokassa.client";
import { RobokassaWebhookController } from "./robokassa.webhook.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentEntity]),
    UserTokenTransactionsModule,
    UsersModule,
  ],
  providers: [PaymentsService, RobokassaClient, PaymentsGateway],
  controllers: [
    PaymentsController,
    InternalRobokassaController,
    RobokassaWebhookController,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
