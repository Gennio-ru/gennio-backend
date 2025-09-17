import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1758040572154 implements MigrationInterface {
    name = 'Name1758040572154'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_model_enum" AS ENUM('OPENAI')`);
        await queryRunner.query(`CREATE TYPE "public"."model_jobs_status_enum" AS ENUM('queued', 'processing', 'succeeded', 'failed')`);
        await queryRunner.query(`CREATE TABLE "model_jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "model" "public"."model_jobs_model_enum" NOT NULL, "status" "public"."model_jobs_status_enum" NOT NULL DEFAULT 'queued', "prompt" text NOT NULL, "userId" uuid NOT NULL, "inputFileId" uuid, "outputFileId" uuid, "error" text, "startedAt" TIMESTAMP WITH TIME ZONE, "finishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_8d1e8dfd02aa4872e7a8aad23ed" PRIMARY KEY ("id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "model_jobs"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."model_jobs_model_enum"`);
    }

}
