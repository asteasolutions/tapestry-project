import { get } from 'lodash-es'
import { vault } from './vault.js'

export class UserSecretService {
  constructor(private userId: string) {}

  private createPath(key: string) {
    return `secret/data/users/${this.userId}/${key}`
  }

  async store(key: string, value: string) {
    const result = await vault.write({
      path: this.createPath(key),
      data: { data: { value } },
    })

    if (result.error) throw result.error
  }

  async retrieve(key: string) {
    const result = await vault.read({ path: this.createPath(key) })
    if (result.error) throw result.error

    // Yes, 3 times "data"...
    return get(result, 'data.data.data.value') as string
  }

  async delete(key: string) {
    const result = await vault.delete({ path: this.createPath(key) })
    if (result.error) throw result.error

    return result.data
  }
}
