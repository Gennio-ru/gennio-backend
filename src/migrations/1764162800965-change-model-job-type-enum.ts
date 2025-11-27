import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveTextGenerate1764162800965 implements MigrationInterface {
  name = "RemoveTextGenerate1764162800965";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Удаляем старые джобы
    await queryRunner.query(`
      DELETE FROM model_jobs WHERE type = 'text-generate';
    `);

    // 2. Переименовываем старый enum
    await queryRunner.query(`
      ALTER TYPE model_jobs_type_enum RENAME TO model_jobs_type_enum_old;
    `);

    // 3. Создаём новый enum без text-generate
    await queryRunner.query(`
      CREATE TYPE model_jobs_type_enum AS ENUM (
        'image-edit-by-prompt-id',
        'image-edit-by-prompt-text',
        'image-generate-by-prompt-text'
      );
    `);

    // 4. Меняем тип колонки на новый enum
    await queryRunner.query(`
      ALTER TABLE model_jobs
      ALTER COLUMN type
      TYPE model_jobs_type_enum
      USING type::text::model_jobs_type_enum;
    `);

    // 5. Удаляем старый enum
    await queryRunner.query(`
      DROP TYPE model_jobs_type_enum_old;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // откат — возвращаем всё обратно

    await queryRunner.query(`
      CREATE TYPE model_jobs_type_enum_old AS ENUM (
        'image-edit-by-prompt-id',
        'image-edit-by-prompt-text',
        'image-generate-by-prompt-text',
        'text-generate'
      );
    `);

    await queryRunner.query(`
      ALTER TABLE model_jobs
      ALTER COLUMN type
      TYPE model_jobs_type_enum_old
      USING type::text::model_jobs_type_enum_old;
    `);

    await queryRunner.query(`
      DROP TYPE model_jobs_type_enum;
    `);

    await queryRunner.query(`
      ALTER TYPE model_jobs_type_enum_old
      RENAME TO model_jobs_type_enum;
    `);
  }
}
