import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1757165263035 implements MigrationInterface {
    name = 'Name1757165263035'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "sessions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "jti" character varying(64) NOT NULL, "refreshTokenHash" character varying(100) NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "userAgent" character varying(512), "ip" character varying(45), "revokedAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3238ef96f18b355b671619111bc" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_sessions_userId" ON "sessions" ("userId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "UQ_sessions_jti" ON "sessions" ("jti") `);
        await queryRunner.query(`ALTER TABLE "sessions" ADD CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "sessions" DROP CONSTRAINT "FK_57de40bc620f456c7311aa3a1e6"`);
        await queryRunner.query(`DROP INDEX "public"."UQ_sessions_jti"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_sessions_userId"`);
        await queryRunner.query(`DROP TABLE "sessions"`);
    }

}
