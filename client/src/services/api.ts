import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, CanceledError } from 'axios'
import qs from 'qs'
import { config } from '../config'
import { APIError, UnknownError } from '../errors'
import { ErrorResponseSchema } from 'tapestry-shared/src/data-transfer/resources/schemas/errors'
import { ErrorResponseDto } from 'tapestry-shared/src/data-transfer/resources/dtos/errors'
import { auth } from '../auth'

class APIService {
  private accessToken: string | null = null
  private axiosInstance: AxiosInstance

  constructor() {
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
      console.error(error)

      if (error instanceof AxiosError) {
        if (error.response) {
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
      throw new UnknownError(error)
    }
  }
}

export const api = new APIService()
