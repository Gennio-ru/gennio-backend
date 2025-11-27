import { NestFactory } from "@nestjs/core";
import { AiGenerationModule } from "./ai-generation/ai-generation.module";
import { MicroserviceOptions, Transport } from "@nestjs/microservices";

async function bootstrap() {
  const user = process.env.RABBIT_USER;
  const pass = process.env.RABBIT_PASS;
  const host = process.env.RABBIT_HOST || "localhost";

  if (!user || !pass) {
    throw new Error("rabbitMQ user or pass not found");
  }

  const amqpUrl = `amqp://${user}:${pass}@${host}:5672/`;

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AiGenerationModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: [amqpUrl],
        queue: "ai-generation",
        queueOptions: { durable: true },
        noAck: true,
        prefetchCount: Number(process.env.AI_GEN_PREFETCH),
      },
    }
  );

  await app.listen();
  // eslint-disable-next-line no-console
  console.log(
    "🎨 ai-generation microservice started",
    `PREFETCH_COUNT -`,
    process.env.AI_GEN_PREFETCH
  );
}
bootstrap();
