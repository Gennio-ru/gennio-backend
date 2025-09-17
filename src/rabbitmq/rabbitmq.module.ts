import { DynamicModule, Module } from "@nestjs/common";
import { ClientsModule, Transport } from "@nestjs/microservices";

@Module({})
export class RabbitmqModule {
  static register(options: { name?: string; urls?: string[] }): DynamicModule {
    const clientName = options.name || "RABBITMQ_SERVICE";

    return {
      module: RabbitmqModule,
      imports: [
        ClientsModule.register([
          {
            name: clientName,
            transport: Transport.RMQ,
            options: {
              urls: options.urls || [
                `amqp://${process.env.RABBIT_USER}:${process.env.RABBIT_PASS}@localhost:5672/`,
              ],
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
