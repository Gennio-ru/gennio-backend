import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765974698669 implements MigrationInterface {
  name = "Name1765974698669";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // --- tariffCode enum migration with safe mapping ---
    await queryRunner.query(
      `ALTER TYPE "public"."model_jobs_tariffcode_enum" RENAME TO "model_jobs_tariffcode_enum_old"`
    );

    await queryRunner.query(
      `CREATE TYPE "public"."model_jobs_tariffcode_enum" AS ENUM('USER', 'ADMIN')`
    );

    // IMPORTANT: map old enum values to new enum values
    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      ALTER COLUMN "tariffCode"
      TYPE "public"."model_jobs_tariffcode_enum"
      USING (
        CASE
          WHEN "tariffCode"::text = 'ADMIN_GENERATE' THEN 'ADMIN'
          ELSE 'USER'
        END
      )::"public"."model_jobs_tariffcode_enum"
    `);

    await queryRunner.query(
      `ALTER TABLE "model_jobs" ALTER COLUMN "tariffCode" SET DEFAULT 'USER'`
    );

    await queryRunner.query(
      `DROP TYPE "public"."model_jobs_tariffcode_enum_old"`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // rollback enum back to old values
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ALTER COLUMN "tariffCode" DROP DEFAULT`
    );

    await queryRunner.query(
      `CREATE TYPE "public"."model_jobs_tariffcode_enum_old" AS ENUM('TEXT_BASIC', 'TEXT_PRO', 'IMAGE_BASIC_GENERATE', 'IMAGE_BASIC_EDIT', 'IMAGE_PRO_GENERATE', 'IMAGE_PRO_EDIT', 'ADMIN_GENERATE')`
    );

    // map new -> old (ADMIN -> ADMIN_GENERATE, USER -> IMAGE_BASIC_GENERATE for example)
    await queryRunner.query(`
      ALTER TABLE "model_jobs"
      ALTER COLUMN "tariffCode"
      TYPE "public"."model_jobs_tariffcode_enum_old"
      USING (
        CASE
          WHEN "tariffCode"::text = 'ADMIN' THEN 'ADMIN_GENERATE'
          ELSE 'IMAGE_BASIC_GENERATE'
        END
      )::"public"."model_jobs_tariffcode_enum_old"
    `);

    await queryRunner.query(`DROP TYPE "public"."model_jobs_tariffcode_enum"`);

    await queryRunner.query(
      `ALTER TYPE "public"."model_jobs_tariffcode_enum_old" RENAME TO "model_jobs_tariffcode_enum"`
    );
  }
}
