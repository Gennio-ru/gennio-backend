import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763035933177 implements MigrationInterface {
    name = 'Name1763035933177'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" ADD CONSTRAINT "FK_529e3d330553fb0ae06bfee8c69" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "model_jobs" DROP CONSTRAINT "FK_529e3d330553fb0ae06bfee8c69"`);
    }

}
