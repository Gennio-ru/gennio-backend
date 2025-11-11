import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1762895550063 implements MigrationInterface {
  name = "Name1762895550063";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."user_credit_transactions_reason_enum" AS ENUM('JOB_CHARGE', 'JOB_REFUND', 'MANUAL_ADD', 'MANUAL_SUBTRACT', 'PURCHASE', 'PROMO')`
    );
    await queryRunner.query(
      `CREATE TABLE "user_credit_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "delta" integer NOT NULL, "reason" "public"."user_credit_transactions_reason_enum" NOT NULL, "modelJobId" uuid, "meta" jsonb, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_529a4b6ddbd1b3e862b588888cf" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7dc2eef5e622f1ef3f01e34f2f" ON "user_credit_transactions" ("userId") `
    );

    await queryRunner.query(
      `CREATE TYPE "public"."model_jobs_tariffcode_enum" AS ENUM('TEXT_BASIC', 'TEXT_PRO', 'IMAGE_BASIC_GENERATE', 'IMAGE_BASIC_EDIT', 'IMAGE_PRO_GENERATE', 'IMAGE_PRO_EDIT')`
    );

    // 1) добавляем новые колонки, пока без NOT NULL
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "tariffCode" "public"."model_jobs_tariffcode_enum"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "creditsCharged" integer`
    );

    // 2) проставляем значения для уже существующих записей
    await queryRunner.query(
      `UPDATE "model_jobs" SET "tariffCode" = 'IMAGE_BASIC_GENERATE', "creditsCharged" = 0 WHERE "tariffCode" IS NULL`
    );

    // 3) теперь можно зажать NOT NULL
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ALTER COLUMN "tariffCode" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ALTER COLUMN "creditsCharged" SET NOT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "creditsCharged"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "tariffCode"`
    );
    await queryRunner.query(`DROP TYPE "public"."model_jobs_tariffcode_enum"`);

    await queryRunner.query(
      `DROP INDEX "public"."IDX_7dc2eef5e622f1ef3f01e34f2f"`
    );
    await queryRunner.query(`DROP TABLE "user_credit_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."user_credit_transactions_reason_enum"`
    );
  }
}
