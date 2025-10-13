import { Inject, Injectable } from "@nestjs/common";
import type { Redis } from "ioredis";
import { REDIS } from "../redis/redis.module";

type Scope = "email" | "phone" | "email_confirm";

@Injectable()
export class OtpStore {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  private key(scope: Scope, id: string) {
    return `otp:${scope}:${id}`;
  }

  /** Сохранить ПЛЕЙН-код с TTL (как и было) */
  async set(scope: Scope, id: string, code: string, ttlSec: number) {
    await this.redis.set(this.key(scope, id), code, "EX", ttlSec);
  }

  /** Атомарно сравнить ПЛЕЙН-код и погасить (как и было) */
  async compareAndConsume(scope: Scope, id: string, provided: string) {
    const lua = `
      local k = KEYS[1]
      local p = ARGV[1]
      local cur = redis.call('GET', k)
      if not cur then return -1 end
      if cur ~= p then return 0 end
      redis.call('DEL', k)
      return 1
    `;
    const res = await this.redis.eval(lua, 1, this.key(scope, id), provided);
    return Number(res); // -1 нет кода, 0 неверный, 1 ок
  }

  /** Сохранить ХЭШ (HMAC/sha256) токена с TTL */
  async setHashed(scope: Scope, id: string, tokenHash: string, ttlSec: number) {
    await this.redis.set(this.key(scope, id), tokenHash, "EX", ttlSec);
  }

  /** Атомарно сравнить ХЭШ и погасить (для email_confirm) */
  async compareHashedAndConsume(
    scope: Scope,
    id: string,
    providedHash: string
  ): Promise<-1 | 0 | 1> {
    const lua = `
      local k = KEYS[1]
      local p = ARGV[1]
      local cur = redis.call('GET', k)
      if not cur then return -1 end
      if cur ~= p then return 0 end
      redis.call('DEL', k)
      return 1
    `;
    const res = await this.redis.eval(
      lua,
      1,
      this.key(scope, id),
      providedHash
    );
    return Number(res) as any;
  }

  /** Простейший рейт-лимит */
  async rateLimit(
    key: string,
    limit: number,
    windowSec: number
  ): Promise<boolean> {
    const n = await this.redis.incr(key);
    if (n === 1) await this.redis.expire(key, windowSec);
    return n <= limit;
  }
}
