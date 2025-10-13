import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";

// ⚠️ Этот DataSource используется ТОЛЬКО CLI TypeORM (генерация/запуск миграций).
// Для CLI удобнее указывать TS-файлы (src), так как мы запускаем через ts-node.

const url = process.env.DATABASE_URL;

export default new DataSource(
  url
    ? {
        type: "postgres",
        url,
        entities: ["src/**/*.entity.ts"],
        migrations: ["src/migrations/*.ts"],
        synchronize: false,
        logging: false,
      }
    : {
        type: "postgres",
        host: process.env.DB_HOST ?? "localhost",
        port: parseInt(process.env.DB_PORT ?? "5432", 10),
        username: process.env.DB_USER ?? "postgres",
        password: process.env.DB_PASS ?? "postgres",
        database: process.env.DB_NAME ?? "ai_platform",
        entities: ["src/**/*.entity.ts"],
        migrations: ["src/migrations/*.ts"],
        synchronize: false,
        logging: false,
      }
);
