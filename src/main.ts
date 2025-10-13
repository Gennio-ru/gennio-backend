import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { join } from "path";
import { writeFileSync } from "fs";
import { execSync } from "child_process";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
  const amqpUrl = `amqp://${user}:${pass}@rabbitmq:5672/`;

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [amqpUrl],
      queue: "jobs",
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("AI Platform API")
    .setDescription("Prompts / Generations / Users")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // Генерация swagger.json + типов
  const swaggerPath = join(process.cwd(), "swagger.json");
  writeFileSync(swaggerPath, JSON.stringify(document, null, 2));
  console.log(`✅ Swagger JSON saved to ${swaggerPath}`);
  try {
    const frontendPath = join(
      process.cwd(),
      "..",
      "gennio-frontend",
      "src",
      "api",
      "types.gen.ts"
    );
    execSync(`npx openapi-typescript ${swaggerPath} --output ${frontendPath}`, {
      stdio: "inherit",
    });
    console.log(`✅ Types generated in ${frontendPath}`);
  } catch (e) {
    console.error("❌ Failed to generate types:", e);
  }

  await app.startAllMicroservices();
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, "0.0.0.0"); // в контейнере слушаем на всех интерфейсах
}
bootstrap();
