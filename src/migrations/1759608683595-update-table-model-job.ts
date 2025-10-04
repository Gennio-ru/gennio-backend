import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1759608683595 implements MigrationInterface {
    name = 'Name1759608683595'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "prompt"`);
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_type_enum" AS ENUM('image-edit-by-prompt-id', 'image-edit-by-prompt-text', 'image-generate-by-prompt-text')`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "type" "public"."model_jobs_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "text" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "promptId" uuid NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "promptId"`);
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "text"`);
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_type_enum"`);
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD "prompt" text NOT NULL`);
    }

}
