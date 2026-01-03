import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765965929642 implements MigrationInterface {
  name = "Name1765965929642";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "imageSize" character varying(10)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "imageSize"`);
  }
}
