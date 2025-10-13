import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1759928780497 implements MigrationInterface {
    name = 'Name1759928780497'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "yandexId" character varying(64)`);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "UQ_3f2d2b562d33ce7b7f84cb899b2" UNIQUE ("yandexId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "UQ_3f2d2b562d33ce7b7f84cb899b2"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "yandexId"`);
    }

}
