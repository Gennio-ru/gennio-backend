import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1764419489486 implements MigrationInterface {
    name = 'Name1764419489486'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD CONSTRAINT "FK_a69758aee9b167a9f7910f9ccb5" FOREIGN KEY ("promptId") REFERENCES "prompts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP CONSTRAINT "FK_a69758aee9b167a9f7910f9ccb5"`);
    }

}
