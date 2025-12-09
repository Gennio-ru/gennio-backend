import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765301738182 implements MigrationInterface {
    name = 'Name1765301738182'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_tariffcode_enum" RENAME TO "model_jobs_tariffcode_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_tariffcode_enum" AS ENUM('TEXT_BASIC', 'TEXT_PRO', 'IMAGE_BASIC_GENERATE', 'IMAGE_BASIC_EDIT', 'IMAGE_PRO_GENERATE', 'IMAGE_PRO_EDIT', 'ADMIN_GENERATE')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "tariffCode" TYPE "public"."model_jobs_tariffcode_enum" USING "tariffCode"::"text"::"public"."model_jobs_tariffcode_enum"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_tariffcode_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_tariffcode_enum_old" AS ENUM('TEXT_BASIC', 'TEXT_PRO', 'IMAGE_BASIC_GENERATE', 'IMAGE_BASIC_EDIT', 'IMAGE_PRO_GENERATE', 'IMAGE_PRO_EDIT')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "tariffCode" TYPE "public"."model_jobs_tariffcode_enum_old" USING "tariffCode"::"text"::"public"."model_jobs_tariffcode_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_tariffcode_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_tariffcode_enum_old" RENAME TO "model_jobs_tariffcode_enum"`);
    }

}
