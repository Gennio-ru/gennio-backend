import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1760531074384 implements MigrationInterface {
    name = 'Name1760531074384'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_f2a138410751f2222c73e960824"`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "beforeImageId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_f2a138410751f2222c73e960824" FOREIGN KEY ("beforeImageId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "prompts" DROP CONSTRAINT "FK_f2a138410751f2222c73e960824"`);
        await queryRunner.query(`ALTER TABLE "prompts" ALTER COLUMN "beforeImageId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "prompts" ADD CONSTRAINT "FK_f2a138410751f2222c73e960824" FOREIGN KEY ("beforeImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
