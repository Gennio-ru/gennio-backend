import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763918085416 implements MigrationInterface {
  name = "Name1763918085416";

  public async up(queryRunner: QueryRunner): Promise<void> {
    //
    // 1) Добавляем updatedAt в user_token_transactions
    //
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
      ADD COLUMN "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    //
    // 2) Меняем типы дат у users (без дропа колонок)
    //
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "createdAt" TYPE TIMESTAMP,
        ALTER COLUMN "createdAt" SET DEFAULT now(),
        ALTER COLUMN "updatedAt" TYPE TIMESTAMP,
        ALTER COLUMN "updatedAt" SET DEFAULT now()
    `);

    //
    // 3) Меняем тип createdAt у user_token_transactions
    //
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
        ALTER COLUMN "createdAt" TYPE TIMESTAMP,
        ALTER COLUMN "createdAt" SET DEFAULT now()
    `);

    //
    // 4) Делаем payments.userId NOT NULL (FK трогать не обязательно)
    //
    await queryRunner.query(`
      ALTER TABLE "payments"
        ALTER COLUMN "userId" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    //
    // 1) Разрешаем NULL для payments.userId
    //
    await queryRunner.query(`
      ALTER TABLE "payments"
        ALTER COLUMN "userId" DROP NOT NULL
    `);

    //
    // 2) Возвращаем типы дат у users в TIMESTAMPTZ
    //    (если хочешь без явного USING, можно опустить, но так корректнее)
    //
    await queryRunner.query(`
      ALTER TABLE "users"
        ALTER COLUMN "createdAt"
          TYPE TIMESTAMP WITH TIME ZONE
          USING "createdAt" AT TIME ZONE 'UTC',
        ALTER COLUMN "createdAt"
          SET DEFAULT now(),
        ALTER COLUMN "updatedAt"
          TYPE TIMESTAMP WITH TIME ZONE
          USING "updatedAt" AT TIME ZONE 'UTC',
        ALTER COLUMN "updatedAt"
          SET DEFAULT now()
    `);

    //
    // 3) Возвращаем тип createdAt у user_token_transactions
    //
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
        ALTER COLUMN "createdAt"
          TYPE TIMESTAMP WITH TIME ZONE
          USING "createdAt" AT TIME ZONE 'UTC',
        ALTER COLUMN "createdAt"
          SET DEFAULT now()
    `);

    //
    // 4) Удаляем updatedAt из user_token_transactions
    //
    await queryRunner.query(`
      ALTER TABLE "user_token_transactions"
        DROP COLUMN "updatedAt"
    `);
  }
}
