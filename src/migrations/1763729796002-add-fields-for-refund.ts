import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763729796002 implements MigrationInterface {
  name = "Name1763729796002";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "tokensPurchased" integer`
    );
    await queryRunner.query(
      `ALTER TABLE "payments" ADD "tokensRefunded" integer DEFAULT '0'`
    );

    // 1. Переименовываем старый enum
    await queryRunner.query(`
      ALTER TYPE "public"."user_token_transactions_reason_enum"
      RENAME TO "user_token_transactions_reason_enum_old"
    `);

    // 2. Создаём новый enum с PAYMENT_PURCHASE / PAYMENT_REFUND
    await queryRunner.query(`
      CREATE TYPE "public"."user_token_transactions_reason_enum" AS ENUM(
        'JOB_CHARGE',
        'JOB_REFUND',
        'MANUAL_ADD',
        'MANUAL_SUBTRACT',
        'PAYMENT_PURCHASE',
        'PAYMENT_REFUND',
        'PROMO'
      )
    `);

    // 3. Меняем тип колонки + внутри USING делаем маппинг
    //    PURCHASE → PAYMENT_PURCHASE
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
      ALTER COLUMN "reason"
      TYPE "public"."user_token_transactions_reason_enum"
      USING (
        CASE
          WHEN "reason"::text = 'PURCHASE'
            THEN 'PAYMENT_PURCHASE'
          ELSE "reason"::text
        END
      )::"public"."user_token_transactions_reason_enum"
    `);

    // 4. Удаляем старый enum
    await queryRunner.query(`
      DROP TYPE "public"."user_token_transactions_reason_enum_old"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Воссоздаём старый enum со значением PURCHASE
    await queryRunner.query(`
      CREATE TYPE "public"."user_token_transactions_reason_enum_old" AS ENUM(
        'JOB_CHARGE',
        'JOB_REFUND',
        'MANUAL_ADD',
        'MANUAL_SUBTRACT',
        'PURCHASE',
        'PROMO'
      )
    `);

    // 2. Меняем тип колонки обратно + маппим PAYMENT_PURCHASE → PURCHASE
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
      ALTER COLUMN "reason"
      TYPE "public"."user_token_transactions_reason_enum_old"
      USING (
        CASE
          WHEN "reason"::text = 'PAYMENT_PURCHASE'
            THEN 'PURCHASE'
          ELSE "reason"::text
        END
      )::"public"."user_token_transactions_reason_enum_old"
    `);

    // 3. Удаляем новый enum
    await queryRunner.query(`
      DROP TYPE "public"."user_token_transactions_reason_enum"
    `);

    // 4. Переименовываем old → нормальное имя
    await queryRunner.query(`
      ALTER TYPE "public"."user_token_transactions_reason_enum_old"
      RENAME TO "user_token_transactions_reason_enum"
    `);

    // 5. Откатываем колонки в payments
    await queryRunner.query(`
      ALTER TABLE "payments" DROP COLUMN "tokensRefunded"
    `);
    await queryRunner.query(`
      ALTER TABLE "payments" DROP COLUMN "tokensPurchased"
    `);
  }
}
