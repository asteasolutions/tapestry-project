import { defaults, merge, pick } from 'lodash'
import { DEFAULT_FONT_SIZE } from 'tapestry-core-client/src/components/lib/rich-text-editor/font-size-extension'
import { LiteralColor } from 'tapestry-core-client/src/theme/types'
import { SortDirection } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { auth } from '../auth'
import { SortBy } from '../pages/dashboard'
import { LocalStorage } from './local-storage'

interface TapestrySettings {
  fontSize: number
  fontColor: string
  textItemColor: LiteralColor
}

const DEFAULT_TAPESTRY_SETTINGS: TapestrySettings = {
  fontSize: DEFAULT_FONT_SIZE,
  fontColor: '#000000',
  textItemColor: '#ffffff00',
}

interface UserSettingsData {
  relColorCode: LiteralColor
  tapestriesSettings: Partial<Record<string, Partial<TapestrySettings>>>
  sortBy: SortBy
  sortDirection: SortDirection
}

export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  relColorCode: '#9e9e9e',
  tapestriesSettings: {},
  sortBy: 'latest',
  sortDirection: 'desc',
}

const GUEST_ID = 'guest'
export class UserSettings extends LocalStorage<Partial<Record<string, Partial<UserSettingsData>>>> {
  constructor() {
    super('user-settings')
  }

  get currentSettings(): Omit<UserSettingsData, 'tapestriesSettings'> {
    return Object.assign(
      {},
      DEFAULT_USER_SETTINGS,
      pick(super.current?.[this.userId], Object.keys(DEFAULT_USER_SETTINGS)),
    )
  }

  update(data: Partial<Omit<UserSettingsData, 'tapestriesSettings'>>) {
    this.save(merge(this.current, { [this.userId]: data }))
  }

  updateTapestrySettings(id: string, settings: Partial<TapestrySettings>) {
    this.save(merge(this.current, { [this.userId]: { tapestriesSettings: { [id]: settings } } }))
  }

  getTapestrySettings(id: string): TapestrySettings {
    return defaults(
      this.current?.[this.userId]?.tapestriesSettings?.[id],
      DEFAULT_TAPESTRY_SETTINGS,
    )
  }

  private get userId() {
    return auth.value.user?.id ?? GUEST_ID
  }
}

export const userSettings = new UserSettings()
