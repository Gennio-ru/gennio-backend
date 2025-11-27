import { DynamicModule, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({})
export class RabbitmqModule {
  static register(
    options: { name?: string; urls?: string[]; queue?: string } = {}
  ): DynamicModule {
    const clientName = options.name || "RABBITMQ_SERVICE";

    const user = process.env.RABBIT_USER;
    const pass = process.env.RABBIT_PASS;

    if (!user || !pass) {
      throw new Error("rabbitMQ user or pass not found");
    }

    const host = process.env.RABBIT_HOST || "localhost";
    const url = `amqp://${user}:${pass}@${host}:5672/`;

    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.register([
          {
            name: clientName,
            transport: Transport.RMQ,
            options: {
              urls: options.urls || [url],
              queue: options.queue || "jobs",
              queueOptions: { durable: true },
            },
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
