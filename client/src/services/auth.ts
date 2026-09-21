import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { CanceledError, GenericAbortSignal } from 'axios'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { APIError } from '../errors'
import { resource } from '../services/rest-resources'
import { AUTH_PROVIDERS } from '../auth/providers-registry'

interface Token {
  token: string
  expiresAt: number
}

export interface AuthServiceState {
  user: UserDto | null
  isInitialized: boolean
  pendingRegistration: { usernameSuggestion: string } | undefined
}

function defer<T = void>() {
  let resolve: (value: T) => void
  let reject: (error: Error) => void
  let state = 'pending' as 'pending' | 'resolved' | 'rejected'
  const promise = new Promise<T>((res, rej) => {
    resolve = (value: T) => {
      res(value)
      state = 'resolved'
    }
    reject = (error: Error) => {
      rej(error)
      state = 'rejected'
    }
  })

  // @ts-expect-error TS doesn't know that Promise executors are called synchronously
  // and thinks that resolve and reject are not defined here yet.
  return { promise, resolve, reject, state }
}

export class AuthService extends Observable<AuthServiceState> {
  private autoRefreshTimeout: number | undefined
  private preparing = defer()
  private _accessToken: Token | null = null
  private isPrepared = false

  get accessToken() {
    return structuredClone(this._accessToken)
  }

  constructor() {
    super({ user: null, isInitialized: false, pendingRegistration: undefined })
  }

  /** Override in descendants to implement any preparation logic. */
  protected doPrepare() {
    if (this.isPrepared) return
    this.isPrepared = true

    for (const provider of AUTH_PROVIDERS) {
      provider.prepare?.()
    }
  }

  prepare() {
    if (this.preparing.state === 'pending') {
      this.doPrepare()
      this.preparing.resolve()
    }
  }

  protected async doLogin(
    params: SessionCreateDto,
    loadUser: boolean,
    signal?: GenericAbortSignal,
  ) {
    await this.preparing.promise

    try {
      // We don't want to send the old access token (if any) when refreshing the session
      // because if it is invalid, it would cause an InvalidAccessTokenError.
      this._accessToken = null
      const { accessToken, user, expiresAt } = await resource('sessions').create(
        params,
        { include: loadUser ? ['user'] : undefined },
        { signal },
      )

      const renewAfter = expiresAt - Date.now() - 10_000
      if (renewAfter > 0) {
        clearTimeout(this.autoRefreshTimeout)
        this.autoRefreshTimeout = window.setTimeout(
          async function (this: AuthService) {
            await this.refresh(false)
          }.bind(this),
          renewAfter,
        )
      }
      this._accessToken = { token: accessToken, expiresAt }
      this.update((state) => {
        state.user = user ?? state.user ?? null
        state.isInitialized = true
        state.pendingRegistration = undefined
      })
    } catch (error) {
      if (error instanceof CanceledError) {
        throw error
      }
      this.update((state) => {
        state.isInitialized = true
        if (error instanceof APIError) {
          const errorName = error.data.name
          if (errorName === 'SessionExpiredError') {
            state.user = null
          } else if (errorName === 'UserDoesNotExistsError') {
            state.pendingRegistration = {
              usernameSuggestion: error.data.usernameSuggestion,
            }
          }
        }
      })
      throw error
    }
  }

  async refresh(loadUser: boolean, signal?: GenericAbortSignal) {
    try {
      await this.doLogin({ authType: 'refreshToken' }, loadUser, signal)
    } catch (error) {
      if (!(error instanceof CanceledError) && loadUser && !this.value.user) {
        try {
          await this.doLogin({ authType: 'iaCookies' }, true, signal)
          return
        } catch {
          this.update((state) => {
            state.user = null
            state.isInitialized = true
          })
        }
      } else if (!(error instanceof CanceledError)) {
        this.update((state) => {
          state.user = null
          state.isInitialized = true
        })
      }
      throw error
    }
  }

  login(credentials: SessionCreateDto, signal?: GenericAbortSignal): Promise<void> {
    return this.doLogin(credentials, true, signal)
  }

  async logout(signal?: GenericAbortSignal) {
    if (!this.value.user) return

    await resource('sessions').destroy({ id: this.value.user.id }, { signal })
    this._accessToken = null
    clearTimeout(this.autoRefreshTimeout)
    this.update((state) => {
      state.user = null
    })
  }

  register(username: string, signal?: GenericAbortSignal) {
    return this.doLogin({ authType: 'registerUser', username }, true, signal)
  }

  cancelRegistration() {
    this.update((state) => {
      state.pendingRegistration = undefined
    })
  }
}
