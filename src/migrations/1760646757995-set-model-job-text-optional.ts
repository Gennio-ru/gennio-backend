import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1760646757995 implements MigrationInterface {
    name = 'Name1760646757995'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "text" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "text" SET NOT NULL`);
    }

}
