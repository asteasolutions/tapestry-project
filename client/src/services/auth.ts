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

interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: Error) => void
  state: 'pending' | 'resolved' | 'rejected'
}

function defer<T = void>(): Deferred<T> {
  const deferred = {} as Deferred<T>
  deferred.state = 'pending'

  deferred.promise = new Promise<T>((res, rej) => {
    deferred.resolve = (value: T) => {
      res(value)
      deferred.state = 'resolved'
    }
    deferred.reject = (error: Error) => {
      rej(error)
      deferred.state = 'rejected'
    }
  })

  return deferred
}

export class AuthService extends Observable<AuthServiceState> {
  private autoRefreshTimeout: number | undefined
  private preparing = defer()
  private _accessToken: Token | null = null

  get accessToken() {
    return structuredClone(this._accessToken)
  }

  constructor() {
    super({ user: null, isInitialized: false, pendingRegistration: undefined })
  }

  private doPrepare() {
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

  private async doLogin(params: SessionCreateDto, loadUser: boolean, signal?: GenericAbortSignal) {
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
        this.autoRefreshTimeout = window.setTimeout(this.refresh.bind(this, false), renewAfter)
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
    for (const provider of AUTH_PROVIDERS) {
      if (await provider.tryCompleteLogin?.(signal)) return
    }
    await this.doLogin({ authType: 'refreshToken' }, loadUser, signal)
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
