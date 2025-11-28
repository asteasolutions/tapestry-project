import { Client } from '@litehex/node-vault'
import { config } from '../config.js'
import { get } from 'lodash-es'

/**
 * Handles authentication with the HashiCorp Vault. Unfortunately, the `node-vault` package seems to be very primitive
 * and doesn't handle authentication and token renewal internally.
 */
class HashiCorpVault {
  private tokenRenewalTime = 0
  private client = new Client({ endpoint: config.vault.endpoint })

  constructor() {
    this.ensureAuth().catch((error) => {
      console.warn('Error during vault initialization', error)
    })
  }

  private async ensureAuth() {
    if (!this.client.token || Date.now() > this.tokenRenewalTime) {
      const response = await this.client.write({
        path: 'auth/approle/login',
        data: {
          role_id: config.vault.roleId,
          secret_id: config.vault.secretId,
        },
      })

      if (response.error) throw response.error

      this.client.token = get(response.data, 'auth.client_token') as string
      const leaseDuration = get(response.data, 'auth.lease_duration') as number
      this.tokenRenewalTime = Date.now() + leaseDuration * 1000 - 5 * 60 * 1000 // 5 minute buffer
    }

    return this.client
  }

  read: Client['read'] = async (...args) => {
    const client = await this.ensureAuth()
    return client.read(...args)
  }

  list: Client['list'] = async (...args) => {
    const client = await this.ensureAuth()
    return client.list(...args)
  }

  write: Client['write'] = async (...args) => {
    const client = await this.ensureAuth()
    return client.write(...args)
  }

  delete: Client['delete'] = async (...args) => {
    const client = await this.ensureAuth()
    return client.delete(...args)
  }
}

export const vault = new HashiCorpVault()
