import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1758575280850 implements MigrationInterface {
    name = 'Name1758575280850'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "categories" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying NOT NULL, "description" text, CONSTRAINT "PK_24dbc6126a28ff948da33e97d3b" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD "categoryId" uuid`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_1223a07f19c771f2e0976a4d084" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_1223a07f19c771f2e0976a4d084"`);
        await queryRunner.query(`ALTER TABLE "prompts" DROP COLUMN "categoryId"`);
        await queryRunner.query(`DROP TABLE "categories"`);
    }

}
