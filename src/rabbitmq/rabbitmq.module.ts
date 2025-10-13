import { DynamicModule, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({})
export class RabbitmqModule {
  static register(
    options: { name?: string; urls?: string[] } = {}
  ): DynamicModule {
    const clientName = options.name || "RABBITMQ_SERVICE";

    // Простой URL для stage в Docker: rabbitmq:5672, vhost = /
    const user = process.env.RABBIT_USER || "user";
    const pass = process.env.RABBIT_PASS || "secret";
    const stageUrl = `amqp://${user}:${pass}@rabbitmq:5672/`;

    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.register([
          {
            name: clientName,
            transport: Transport.RMQ,
            options: {
              urls: options.urls || [stageUrl],
              queue: "jobs",
              queueOptions: { durable: true },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
