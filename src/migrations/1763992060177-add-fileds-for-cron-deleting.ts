import { MigrationInterface, QueryRunner } from "typeorm";

export class AddModelJobResultsTTL1763992060177 implements MigrationInterface {
  name = "AddModelJobResultsTTL1763992060177";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      ADD "resultsExpireAt" TIMESTAMP WITH TIME ZONE;
    `);

    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      ADD "resultsDeletedAt" TIMESTAMP WITH TIME ZONE;
    `);

    /**
     * Проставляем resultsExpireAt для существующих успешных job.
     * Логика:
     *  - finishedAt != NULL
     *  - output есть (outputFileId или outputPreviewFileId)
     *  - resultsDeletedAt NULL (оно только что добавлено)
     *  => устанавливаем finishedAt + 24h
     */
    await queryRunner.query(`
      UPDATE "model_jobs"
      SET "resultsExpireAt" = "finishedAt" + INTERVAL '24 hours'
      WHERE "finishedAt" IS NOT NULL
        AND (
          "outputFileId" IS NOT NULL
          OR "outputPreviewFileId" IS NOT NULL
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      DROP COLUMN "resultsDeletedAt";
    `);

    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      DROP COLUMN "resultsExpireAt";
    `);
  }
}
