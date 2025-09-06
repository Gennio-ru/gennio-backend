import { Global, Module, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS = "REDIS";

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        const client = new Redis(
          process.env.REDIS_URL || "redis://127.0.0.1:6379/0"
        );
        return client;
      },
    },
  ],
  exports: ["REDIS"],
})
export class RedisModule implements OnModuleDestroy {
  constructor() // @Inject('REDIS') private readonly redis: Redis
  {}

  async onModuleDestroy() {
    // закрываем соединение при завершении приложения
    const redis = (global as any).app?.get?.("REDIS");
    if (redis) {
      try {
        await redis.quit();
      } catch {
        await redis.disconnect();
      }
    }
  }
}
