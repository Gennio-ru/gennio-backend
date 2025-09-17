import { NestFactory, Reflector } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ClassSerializerInterceptor, ValidationPipe } from "@nestjs/common";
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
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Глобальные настройки
  app.use(cookieParser());
  app.setGlobalPrefix("api"); // опционально
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  app.enableCors({
    origin: ["http://localhost:5173"],
    credentials: true,
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${process.env.RABBIT_USER}:${process.env.RABBIT_PASS}@localhost:5672/`,
      ],
      queue: "jobs",
      queueOptions: { durable: true },
      noAck: false,
      prefetchCount: 1,
    },
  });

  const config = new DocumentBuilder()
    .setTitle("AI Platform API")
    .setDescription("Prompts / Generations / Users")
    .setVersion("1.0.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  // === Автогенерация swagger.json ===
  const swaggerPath = join(process.cwd(), "swagger.json");
  writeFileSync(swaggerPath, JSON.stringify(document, null, 2));
  console.log(`✅ Swagger JSON saved to ${swaggerPath}`);

  // === Автогенерация типов для фронта ===
  const frontendPath = join(
    process.cwd(),
    "..",
    "gennio-frontend",
    "src",
    "api",
    "types.gen.ts"
  );
  try {
    execSync(`npx openapi-typescript ${swaggerPath} --output ${frontendPath}`, {
      stdio: "inherit",
    });
    console.log(`✅ Types generated in ${frontendPath}`);
  } catch (e) {
    console.error("❌ Failed to generate types:", e);
  }

  await app.startAllMicroservices();
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  console.log(`🚀 API:   http://localhost:${port}/api`);
  console.log(`📘 Docs:  http://localhost:${port}/docs`);
}
bootstrap();
