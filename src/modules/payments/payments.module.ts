import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PaymentEntity } from "./payments.entity";
import { PaymentsService } from "./payments.service";
import { PaymentsController } from "./payments.controller";
import { YookassaClient } from "./yookassa.client";
import { TokensModule } from "../tokens/tokens.module";
import { PaymentsGateway } from "./payments.gateway";

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEntity]), TokensModule],
  providers: [PaymentsService, YookassaClient, PaymentsGateway],
  controllers: [PaymentsController],
  exports: [PaymentsService],
})
export class PaymentsModule {}
