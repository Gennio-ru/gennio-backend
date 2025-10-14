import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1760468865412 implements MigrationInterface {
    name = 'Name1760468865412'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "outputPreviewFileId" uuid`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "outputPreviewFileId"`);
    }

}
