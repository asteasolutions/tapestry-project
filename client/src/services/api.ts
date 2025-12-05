import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, CanceledError } from 'axios'
import qs from 'qs'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { defer } from 'tapestry-core/src/lib/promise'
import { ErrorResponseDto } from 'tapestry-shared/src/data-transfer/resources/dtos/errors'
import { ErrorResponseSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/errors'
import { auth } from '../auth'
import { config } from '../config'
import { APIError, NoConnectionError, UnknownError } from '../errors'
import { PeriodicAction } from '../lib/periodic-action'

export type APIChangeData = { online: 'pending' | 'online' | 'offline' }

class APIService extends Observable<APIChangeData> {
  private accessToken: string | null = null
  private axiosInstance: AxiosInstance

  private establishingConnectivity = defer()

  private healthCheck = new PeriodicAction(
    async () => {
      try {
        const { status } = await this.axiosInstance.head('/healthcheck')
        this.update((state) => {
          state.online = status === 200 ? 'online' : 'offline'
        })
      } catch (error) {
        this.update((state) => {
          state.online = 'offline'
        })
        throw error
      } finally {
        if (this.establishingConnectivity.state === 'pending') {
          this.establishingConnectivity.resolve()
        }
      }
    },
    { period: 15_000 },
  )

  constructor() {
    super({ online: 'pending' })
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      headers: { 'Content-Type': 'application/json' },
      withCredentials: true,
      validateStatus: (status) => status >= 200 && status < 300,
      paramsSerializer: (params) =>
        qs.stringify(params, {
          encodeValuesOnly: true,
          arrayFormat: 'comma',
          commaRoundTrip: true,
        }),
    })
    this.healthCheck.start(true)
  }

  async get<R>(path: string, params?: unknown, config: AxiosRequestConfig = {}) {
    return this.request<R>(path, { method: 'GET', params, ...config })
  }

  async post<R>(path: string, data: unknown, config: AxiosRequestConfig = {}) {
    return this.request<R>(path, { method: 'POST', data, ...config })
  }

  async patch<R>(path: string, data: unknown, config: AxiosRequestConfig = {}) {
    return this.request<R>(path, { method: 'PATCH', data, ...config })
  }

  async delete(path: string, config: AxiosRequestConfig = {}) {
    return this.request<void>(path, { method: 'DELETE', ...config })
  }

  setAccessToken(token: string | null) {
    this.accessToken = token
  }

  private async request<T>(path: string, config: AxiosRequestConfig): Promise<T> {
    await this.establishingConnectivity.promise
    try {
      const { data } = await this.axiosInstance<T>(path, {
        ...config,
        headers: {
          ...(this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {}),
          ...config.headers,
          ...(config.data instanceof File ? { 'Content-Type': 'application/octet-stream' } : {}),
        },
      })
      return data
    } catch (error) {
      if (error instanceof CanceledError) {
        throw error
      }

      const isAxiosError = error instanceof AxiosError
      if (!isAxiosError) {
        throw new UnknownError(error)
      }

      if (!error.response) {
        this.update((state) => {
          state.online = 'offline'
        })
        throw new NoConnectionError()
      }

      let apiError: ErrorResponseDto
      try {
        apiError = ErrorResponseSchema.parse(error.response.data)
        // XXX: Here we have to handle all versions of a 401 error except for SessionExpiredError.
        if (apiError.name === 'InvalidAccessTokenError') {
          await auth.refresh(false, config.signal)
          return this.request(path, config)
        }
      } catch (parseError) {
        console.error(parseError)
        throw new UnknownError(error)
      }
      throw new APIError(apiError)
    }
  }
}

export const api = new APIService()

export function useOnline() {
  return useObservable(api).online
}
