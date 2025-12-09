import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1765124220957 implements MigrationInterface {
    name = 'Name1765124220957'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_model_enum" RENAME TO "model_jobs_model_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_model_enum" AS ENUM('OPENAI', 'GEMINI')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "model" TYPE "public"."model_jobs_model_enum" USING "model"::"text"::"public"."model_jobs_model_enum"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_model_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_model_enum_old" AS ENUM('OPENAI')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "model" TYPE "public"."model_jobs_model_enum_old" USING "model"::"text"::"public"."model_jobs_model_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_model_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_model_enum_old" RENAME TO "model_jobs_model_enum"`);
    }

}
