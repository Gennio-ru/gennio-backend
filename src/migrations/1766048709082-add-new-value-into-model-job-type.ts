import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1766048709082 implements MigrationInterface {
    name = 'Name1766048709082'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_type_enum" RENAME TO "model_jobs_type_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_type_enum" AS ENUM('image-edit-by-prompt-id', 'image-edit-by-prompt-text', 'image-edit-by-style-reference', 'image-generate-by-prompt-text')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "type" TYPE "public"."model_jobs_type_enum" USING "type"::"text"::"public"."model_jobs_type_enum"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_type_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_type_enum_old" AS ENUM('image-edit-by-prompt-id', 'image-edit-by-prompt-text', 'image-generate-by-prompt-text')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ALTER COLUMN "type" TYPE "public"."model_jobs_type_enum_old" USING "type"::"text"::"public"."model_jobs_type_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_type_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."model_jobs_type_enum_old" RENAME TO "model_jobs_type_enum"`);
    }

}
