import { Redis } from 'ioredis'
import { config } from '../config.js'

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  tls: config.redis.useTls ? {} : undefined,
  maxRetriesPerRequest: null, // Required by BullMQ Worker
})

export class RedisCache {
  constructor(private namespace: string) {}

  private namespacedKey(key: string) {
    return `${this.namespace}:${key}`
  }

  async memoize(
    key: string,
    generate: () => Promise<string>,
    ttl: number | ((value: string) => number),
  ) {
    const namespacedKey = this.namespacedKey(key)
    const cachedValue = await redis.get(namespacedKey)
    if (typeof cachedValue === 'string') {
      return cachedValue
    }

    const newValue = await generate()
    await redis.set(namespacedKey, newValue, 'EX', typeof ttl === 'function' ? ttl(newValue) : ttl)

    return newValue
  }

  async delete(...keys: string[]) {
    if (keys.length > 0) {
      await redis.del(keys.map((key) => this.namespacedKey(key)))
    }
  }
}
