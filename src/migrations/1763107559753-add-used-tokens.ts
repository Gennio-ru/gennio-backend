import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763107559753 implements MigrationInterface {
    name = 'Name1763107559753'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "usedTokens" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "usedTokens"`);
    }

}
