import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import * as os from "os";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";
import { DataSource } from "typeorm";
import AppDataSource from "./data-source";
import { Logger } from "nestjs-pino";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import sharp from "sharp";

const cpuCount = os.cpus().length;

sharp.concurrency(Math.max(1, Math.min(4, cpuCount - 1)));

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(Logger));
  app.useGlobalFilters(new AllExceptionsFilter(app.get(Logger)));

  // === АВТО-МИГРАЦИИ ===
  if (process.env.NODE_ENV === "production") {
    try {
      const dataSource: DataSource = AppDataSource;
      if (!dataSource.isInitialized) await dataSource.initialize();
      const pending = await dataSource.showMigrations();
      if (pending) {
        console.log("🧩 Running pending migrations...");
        await dataSource.runMigrations();
        console.log("✅ Migrations completed");
      } else {
        console.log("✅ No pending migrations");
      }
    } catch (err) {
      console.error("❌ Failed to run migrations:", err);
    }
  }

  // Security & CORS
  app.use(helmet());
  const corsOriginEnv = process.env.CORS_ORIGIN;
  const origins = corsOriginEnv
    ? corsOriginEnv.split(",").map((s) => s.trim())
    : true;
  app.enableCors({ origin: origins, credentials: true });
  app.enableShutdownHooks();

  // Глобальные настройки
  app.use(cookieParser());
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // --- RMQ microservice: fixed host to rabbitmq:5672, only user/pass from env ---
  const user = process.env.RABBIT_USER;
  const pass = process.env.RABBIT_PASS;
  if (!user || !pass) throw new Error("rabbitMQ user or pass not found");
  const host = process.env.RABBIT_HOST || "localhost";
  const amqpUrl = `amqp://${user}:${pass}@${host}:5672/`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [amqpUrl],
      queue: "jobs",
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 4,
    },
  });

  // Swagger — отключаем в production
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle("AI Platform API")
      .setDescription("Prompts / Generations / Users")
      .setVersion("1.0.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  await app.startAllMicroservices();
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, "0.0.0.0"); // в контейнере слушаем на всех интерфейсах
}
bootstrap();
