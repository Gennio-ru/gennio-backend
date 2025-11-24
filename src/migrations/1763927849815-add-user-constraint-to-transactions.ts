import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1763927849815 implements MigrationInterface {
    name = 'Name1763927849815'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_token_transactions" ADD CONSTRAINT "FK_68b8c2b99138f1df846dbf5ffbe" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_token_transactions" DROP CONSTRAINT "FK_68b8c2b99138f1df846dbf5ffbe"`);
    }

}
