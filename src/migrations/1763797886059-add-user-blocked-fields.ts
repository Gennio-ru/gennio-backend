import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763797886059 implements MigrationInterface {
    name = 'Name1763797886059'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "isBlocked" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "users" ADD "blockedAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "users" ADD "blockedReason" character varying(255)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blockedReason"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "blockedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isBlocked"`);
    }

}
