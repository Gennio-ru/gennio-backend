import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763549427238 implements MigrationInterface {
    name = 'Name1763549427238'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" ADD "processedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "updatedAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "payments" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payments" DROP COLUMN "processedAt"`);
    }

}
