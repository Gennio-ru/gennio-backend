import { MigrationInterface, QueryRunner } from "typeorm";
import * as bcrypt from "bcryptjs";

export class Name1757163961469 implements MigrationInterface {
  name = "Name1757163961469";

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = await bcrypt.hash("8619VladNekh!", 10);

    await queryRunner.query(
      `
                      INSERT INTO "users" (id, email, "passwordHash", role, "isActive", "createdAt", "updatedAt")
                      VALUES (uuid_generate_v4(), $1, $2, 'admin', true, NOW(), NOW())
                      ON CONFLICT (email) DO NOTHING
                      `,
      ["vladimirnehoc@mail.ru", passwordHash]
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE email = $1`, [
      "vladimirnehoc@mail.ru",
    ]);
  }
}
