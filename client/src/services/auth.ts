import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { resource } from './rest-resources'
import { api } from './api'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { CanceledError, GenericAbortSignal } from 'axios'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { APIError, NoConnectionError } from '../errors'
import { LocalStorage } from './local-storage'
import { defer } from 'tapestry-core/src/lib/promise'

export interface AuthServiceState {
  user: UserDto | null
  isInitialized: boolean
  pendingRegistration: { usernameSuggestion: string } | undefined
}

const currentUserStorage = new LocalStorage<{ user: UserDto | null; accessToken: string }>(
  'current-user',
)

export abstract class AuthService<
  Credentials extends SessionCreateDto = SessionCreateDto,
> extends Observable<AuthServiceState> {
  private autoRefreshTimeout: number | undefined
  private preparing = defer()
  private accessToken?: string

  get token() {
    return this.accessToken
  }

  constructor() {
    super({ user: null, isInitialized: false, pendingRegistration: undefined })
  }

  /** Override in descendants to implement any preparation logic. */
  protected doPrepare() {
    // Nothing.
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
      api.setAccessToken(null)
      const { accessToken, user, expiresAt } = await resource('sessions').create(
        params,
        { include: loadUser ? ['user'] : undefined },
        { signal },
      )
      api.setAccessToken(accessToken)
      this.accessToken = accessToken
      this.update((state) => {
        state.user = user ?? state.user ?? null
        state.isInitialized = true
        currentUserStorage.save({ user: state.user, accessToken })
        state.pendingRegistration = undefined
      })

      this.scheduleRefresh(expiresAt)
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

        if (error instanceof NoConnectionError) {
          const savedUser = currentUserStorage.current
          this.accessToken = savedUser?.accessToken
          api.setAccessToken(this.accessToken ?? null)
          state.user = savedUser?.user ?? null
        }
      })
      throw error
    }
  }

  private scheduleRefresh(expiration: number) {
    const renewAfter = expiration - Date.now() - 10_000
    if (renewAfter > 0) {
      clearTimeout(this.autoRefreshTimeout)
      this.autoRefreshTimeout = window.setTimeout(this.refresh.bind(this), renewAfter)
    }
  }

  async refresh(loadUser = false, signal?: GenericAbortSignal) {
    await this.doLogin({ authType: 'refreshToken' }, loadUser, signal)
  }

  login(_credentials: Credentials, _signal?: GenericAbortSignal): Promise<void> {
    throw new Error('Not implemented')
  }

  async logout(signal?: GenericAbortSignal) {
    if (!this.value.user) return

    await resource('sessions').destroy({ id: this.value.user.id }, { signal })
    api.setAccessToken(null)
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
