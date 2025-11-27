import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763030774491 implements MigrationInterface {
  name = "Name1763030774491";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "model_jobs"
      SET "inputFileId" = NULL
      WHERE "inputFileId" IS NOT NULL
        AND "inputFileId" NOT IN (SELECT id FROM "files");
    `);

    await queryRunner.query(`
      UPDATE "model_jobs"
      SET "outputFileId" = NULL
      WHERE "outputFileId" IS NOT NULL
        AND "outputFileId" NOT IN (SELECT id FROM "files");
    `);

    await queryRunner.query(`
      UPDATE "model_jobs"
      SET "outputPreviewFileId" = NULL
      WHERE "outputPreviewFileId" IS NOT NULL
        AND "outputPreviewFileId" NOT IN (SELECT id FROM "files");
    `);
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "url"`);
    await queryRunner.query(`ALTER TABLE "files" ADD "width_px" integer`);
    await queryRunner.query(`ALTER TABLE "files" ADD "height_px" integer`);
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "contentType" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "contentType" SET DEFAULT 'application/octet-stream'`
    );
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "size" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD CONSTRAINT "FK_4a75d191adb0e48803c871e5cc6" FOREIGN KEY ("inputFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD CONSTRAINT "FK_4a4668d50c0919b1e9efdcec668" FOREIGN KEY ("outputFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" ADD CONSTRAINT "FK_0984663e672a76cda71eca820e4" FOREIGN KEY ("outputPreviewFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP CONSTRAINT "FK_0984663e672a76cda71eca820e4"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP CONSTRAINT "FK_4a4668d50c0919b1e9efdcec668"`
    );
    await queryRunner.query(
      `ALTER TABLE "model_jobs" DROP CONSTRAINT "FK_4a75d191adb0e48803c871e5cc6"`
    );
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "size" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "contentType" DROP DEFAULT`
    );
    await queryRunner.query(
      `ALTER TABLE "files" ALTER COLUMN "contentType" DROP NOT NULL`
    );
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "height_px"`);
    await queryRunner.query(`ALTER TABLE "files" DROP COLUMN "width_px"`);
    await queryRunner.query(`ALTER TABLE "files" ADD "url" text`);
  }
}
