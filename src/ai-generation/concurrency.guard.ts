import { Injectable } from "@nestjs/common";

@Injectable()
export class ConcurrencyGuard {
  private running = 0;
  private queue: (() => void)[] = [];
  private readonly max = Number(process.env.AI_GEN_PREFETCH);

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.max) {
      await new Promise<void>((resolve) => this.queue.push(resolve));
    }

    this.running++;

    try {
      return await fn();
    } finally {
      this.running--;
      const next = this.queue.shift();
      if (next) next();
    }
  }
}
