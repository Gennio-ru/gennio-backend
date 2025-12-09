import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765210276225 implements MigrationInterface {
  name = "Name1765210276225";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "aspectRatio" character varying(10)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "aspectRatio"`
    );
  }
}
