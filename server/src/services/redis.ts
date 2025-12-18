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
    validateCachedValue = (_value: string) => Promise.resolve(true),
    validationTtl = 0,
  ) {
    const namespacedKey = this.namespacedKey(key)
    const cachedValue = await redis.get(namespacedKey)
    if (typeof cachedValue === 'string') {
      const validationKey = `${namespacedKey}:valid`
      let isValid = !!(await redis.exists(validationKey))
      if (!isValid) {
        isValid = await validateCachedValue(cachedValue)
        if (isValid && validationTtl > 0) {
          await redis.set(validationKey, 1, 'EX', validationTtl)
        }
      }
      if (isValid) {
        return cachedValue
      }
    }

    const newValue = await generate()
    await redis.set(namespacedKey, newValue, 'EX', typeof ttl === 'function' ? ttl(newValue) : ttl)

    return newValue
  }

  async delete(key: string) {
    await redis.del(this.namespacedKey(key))
  }
}
