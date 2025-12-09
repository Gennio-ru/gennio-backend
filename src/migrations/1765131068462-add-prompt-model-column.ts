import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765131068462 implements MigrationInterface {
  name = "Name1765131068462";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "public"."prompts_model_enum" AS ENUM('OPENAI', 'GEMINI')
    `);

    await queryRunner.query(`
      ALTER TABLE "prompts"
      ADD COLUMN "model" "public"."prompts_model_enum"
      NOT NULL
      DEFAULT 'OPENAI'
    `);

    await queryRunner.query(`
      ALTER TABLE "prompts"
      ALTER COLUMN "model" DROP DEFAULT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "prompts"
      DROP COLUMN "model"
    `);

    await queryRunner.query(`
      DROP TYPE "public"."prompts_model_enum"
    `);
  }
}
