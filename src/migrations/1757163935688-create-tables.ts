import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1757163935688 implements MigrationInterface {
  name = "Name1757163935688";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying(255), "phone" character varying(32), "passwordHash" character varying(255), "role" character varying(16) NOT NULL DEFAULT 'user', "credits" integer NOT NULL DEFAULT '0', "isActive" boolean NOT NULL DEFAULT true, "isEmailVerified" boolean NOT NULL DEFAULT false, "isPhoneVerified" boolean NOT NULL DEFAULT false, "lastLoginAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "UQ_a000cca60bcf04454e727699490" UNIQUE ("phone"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_97672ac88f789774dd47f7c8be" ON "users" ("email") `
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_a000cca60bcf04454e72769949" ON "users" ("phone") `
    );
    await queryRunner.query(
      `CREATE TABLE "files" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "bucket" character varying(255) NOT NULL, "key" character varying(2048) NOT NULL, "url" text, "contentType" text, "size" integer, "ownerId" uuid, "meta" jsonb, CONSTRAINT "PK_6c16b9093a142e0e7613b04a3d9" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a5c218dfdf6ad6092fed2230a8" ON "files" ("key") `
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_a23484d1055e34d75b25f61679" ON "files" ("ownerId") `
    );
    await queryRunner.query(
      `CREATE TYPE "public"."prompts_type_enum" AS ENUM('image-to-image', 'text-to-image', 'text-to-text')`
    );
    await queryRunner.query(
      `CREATE TABLE "prompts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text NOT NULL, "beforeImageId" uuid NOT NULL, "afterImageId" uuid NOT NULL, "type" "public"."prompts_type_enum" NOT NULL DEFAULT 'image-to-image', "text" text NOT NULL DEFAULT '', CONSTRAINT "PK_21f33798862975179e40b216a1d" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `ALTER TABLE "prompts" ADD CONSTRAINT "FK_f2a138410751f2222c73e960824" FOREIGN KEY ("beforeImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
    await queryRunner.query(
      `ALTER TABLE "prompts" ADD CONSTRAINT "FK_9c954e7b29175cfcce8c2e4deb0" FOREIGN KEY ("afterImageId") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "prompts" DROP CONSTRAINT "FK_9c954e7b29175cfcce8c2e4deb0"`
    );
    await queryRunner.query(
      `ALTER TABLE "prompts" DROP CONSTRAINT "FK_f2a138410751f2222c73e960824"`
    );
    await queryRunner.query(`DROP TABLE "prompts"`);
    await queryRunner.query(`DROP TYPE "public"."prompts_type_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a23484d1055e34d75b25f61679"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a5c218dfdf6ad6092fed2230a8"`
    );
    await queryRunner.query(`DROP TABLE "files"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_a000cca60bcf04454e72769949"`
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_97672ac88f789774dd47f7c8be"`
    );
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
