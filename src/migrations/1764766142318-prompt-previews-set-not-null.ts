import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1764766142318 implements MigrationInterface {
    name = 'Name1764766142318'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_2156a7575e1c3d00205721a8813"`);
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_a18807cf0bdc34e73ea95d87d5d"`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "beforePreviewImageId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "afterPreviewImageId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_2156a7575e1c3d00205721a8813" FOREIGN KEY ("beforePreviewImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_a18807cf0bdc34e73ea95d87d5d" FOREIGN KEY ("afterPreviewImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_a18807cf0bdc34e73ea95d87d5d"`);
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_2156a7575e1c3d00205721a8813"`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "afterPreviewImageId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "beforePreviewImageId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_a18807cf0bdc34e73ea95d87d5d" FOREIGN KEY ("afterPreviewImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_2156a7575e1c3d00205721a8813" FOREIGN KEY ("beforePreviewImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
