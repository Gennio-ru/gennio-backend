import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765980508150 implements MigrationInterface {
  name = "Name1765980508150";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "model_jobs"`);
    await queryRunner.query(
      `CREATE TYPE "public"."model_job_files_kind_enum" AS ENUM('INPUT', 'OUTPUT', 'PREVIEW')`
    );
    await queryRunner.query(
      `CREATE TABLE "model_job_files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "modelJobId" uuid NOT NULL, "fileId" uuid NOT NULL, "kind" "public"."model_job_files_kind_enum" NOT NULL, "position" integer NOT NULL, CONSTRAINT "UQ_6bf9a5c0aa56c7010ba5875a336" UNIQUE ("modelJobId", "kind", "position"), CONSTRAINT "PK_7065bd3fdd0c5a2e682321c279a" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_396cda5b8114a1afbb35a5863d" ON "model_job_files" ("fileId") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_2c7a865e9736dbf1ce75627145" ON "model_job_files" ("modelJobId", "kind") `
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "inputFileIds"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "outputFileIds"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP COLUMN "outputPreviewFileIds"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_job_files" ADD CONSTRAINT "FK_0603d6a10d9592b3424329f13e2" FOREIGN KEY ("modelJobId") REFERENCES "model_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "model_job_files" ADD CONSTRAINT "FK_396cda5b8114a1afbb35a5863d2" FOREIGN KEY ("fileId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_job_files" DROP CONSTRAINT "FK_396cda5b8114a1afbb35a5863d2"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_job_files" DROP CONSTRAINT "FK_0603d6a10d9592b3424329f13e2"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "outputPreviewFileIds" uuid array NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "outputFileIds" uuid array NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD "inputFileIds" uuid array NOT NULL DEFAULT '{}'`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2c7a865e9736dbf1ce75627145"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_396cda5b8114a1afbb35a5863d"`
    );
    await queryRunner.query(`DROP TABLE "model_job_files"`);
    await queryRunner.query(`DROP TYPE "public"."model_job_files_kind_enum"`);
  }
}
