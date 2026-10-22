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

  private validationKey(namespacedKey: string) {
    return `${namespacedKey}:valid`
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
      const validationKey = this.validationKey(namespacedKey)
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

  async delete(...keys: string[]) {
    const keysToDelete: string[] = []
    for (const key of keys) {
      const namespacedKey = this.namespacedKey(key)
      //we have to remove the marker as well or it will pass to the new url
      keysToDelete.push(namespacedKey, this.validationKey(namespacedKey))
    }

    if (keysToDelete.length > 0) {
      await redis.del(keysToDelete)
    }
  }
}
