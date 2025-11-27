import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763539624904 implements MigrationInterface {
    name = 'Name1763539624904'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "credits" TO "tokens"`);
        await queryRunner.query(`ALTER TABLE "model_jobs" RENAME COLUMN "creditsCharged" TO "tokensCharged"`);
        await queryRunner.query(`CREATE TYPE "public"."user_token_transactions_reason_enum" AS ENUM('JOB_CHARGE', 'JOB_REFUND', 'MANUAL_ADD', 'MANUAL_SUBTRACT', 'PURCHASE', 'PROMO')`);
        await queryRunner.query(`CREATE TABLE "user_token_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "delta" integer NOT NULL, "reason" "public"."user_token_transactions_reason_enum" NOT NULL, "modelJobId" uuid, "meta" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_76f7ab343d1c8155247bf074696" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_68b8c2b99138f1df846dbf5ffb" ON "user_token_transactions" ("userId") `);
        await queryRunner.query(`CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'WAITING_FOR_CAPTURE', 'SUCCEEDED', 'CANCELED', 'REFUNDED', 'ERROR')`);
        await queryRunner.query(`CREATE TABLE "payments" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid, "amount" numeric(10,2) NOT NULL, "currency" character varying(3) NOT NULL DEFAULT 'RUB', "provider" character varying(32) NOT NULL DEFAULT 'yookassa', "providerPaymentId" character varying(128), "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING', "confirmationUrl" text, "description" text, "providerPayload" jsonb, "meta" jsonb, "capturedAt" TIMESTAMP WITH TIME ZONE, "canceledAt" TIMESTAMP WITH TIME ZONE, "refundedAt" TIMESTAMP WITH TIME ZONE, "refundedAmount" numeric(10,2), "errorCode" character varying(128), "errorMessage" text, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_197ab7af18c93fbb0c9b28b4a59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_d35cb3c13a18e1ea1705b2817b" ON "payments" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_50d2f08323fc3531369f2f4184" ON "payments" ("providerPaymentId") `);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_50d2f08323fc3531369f2f4184"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d35cb3c13a18e1ea1705b2817b"`);
        await queryRunner.query(`DROP TABLE "payments"`);
        await queryRunner.query(`DROP TYPE "public"."payments_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_68b8c2b99138f1df846dbf5ffb"`);
        await queryRunner.query(`DROP TABLE "user_token_transactions"`);
        await queryRunner.query(`DROP TYPE "public"."user_token_transactions_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "model_jobs" RENAME COLUMN "tokensCharged" TO "creditsCharged"`);
        await queryRunner.query(`ALTER TABLE "users" RENAME COLUMN "tokens" TO "credits"`);
    }

}
