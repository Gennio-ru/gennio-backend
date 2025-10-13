import "reflect-metadata";
import "dotenv/config";
import { DataSource } from "typeorm";

// Определяем, в TS мы (dev) или в JS (prod)
const isTsRuntime = /\.ts$/.test(__filename);

// Если есть единый DATABASE_URL — используем его, иначе — по частям
const common = {
  type: "postgres" as const,
  synchronize: false,
  logging: false,
  entities: [isTsRuntime ? "src/**/*.entity.ts" : "dist/**/*.entity.js"],
  migrations: [isTsRuntime ? "src/migrations/*.ts" : "dist/migrations/*.js"],
};

const AppDataSource = process.env.DATABASE_URL
  ? new DataSource({
      ...common,
      url: process.env.DATABASE_URL,
    })
  : new DataSource({
      ...common,
      host: process.env.DB_HOST ?? "localhost",
      port: parseInt(process.env.DB_PORT ?? "5432", 10),
      username: process.env.DB_USER ?? "postgres",
      password: process.env.DB_PASS ?? "postgres",
      database: process.env.DB_NAME ?? "ai_platform",
    });

export default AppDataSource;
