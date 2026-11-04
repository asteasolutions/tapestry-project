import { init, track } from '@plausible-analytics/tracker'
import { ItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { SessionCreateDto } from 'tapestry-shared/src/data-transfer/resources/dtos/session'
import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { config } from '../config'
import type { DashboardSection } from '../pages/dashboard'

export type LoginProvider = 'Google' | 'ORCID' | 'Wikimedia' | 'Internet Archive' | 'Bluesky'

export type ItemSource =
  | 'Internet Archive'
  | 'Wikimedia'
  | 'YouTube'
  | 'Vimeo'
  | 'IIIF'
  | 'Upload'
  | 'Other web page'

export type ClickTarget =
  | 'Header Gallery'
  | 'Header About'
  | 'Landing Learn more'
  | 'Landing Explore gallery'
  | 'Landing Contact'
  | 'Landing Reach out'
  | 'Footer About'
  | 'Footer Contact'

export type AnalyticsEvent =
  | `Click: ${ClickTarget}`
  | `Login: ${LoginProvider}`
  | `Sign up started: ${LoginProvider}`
  | `Sign up completed: ${LoginProvider}`
  | 'Sign up cancelled'
  | 'Tapestry created'
  | 'Tapestry imported'
  | 'Tapestry forked'
  | 'Tapestry deleted'
  | 'Tapestry exported'
  | `Tapestry visibility: ${TapestryDto['visibility']}`
  | 'Invite link created'
  | 'Invite accepted'
  | `Item added: ${ItemDto['type']}`
  | `Item source: ${ItemSource}`
  | 'Media played: video'
  | 'Media played: audio'
  | `Gallery tapestry opened: ${DashboardSection | 'other'}`
  | 'Contact us opened'

export const isAnalyticsEnabled = !!config.plausibleDomain

export function trackEvent(name: AnalyticsEvent) {
  if (!isAnalyticsEnabled) return
  track(name, {})
}

export function clickTracking(target: ClickTarget) {
  return { 'data-analytics-click': target }
}

export function loginProvider(credentials: SessionCreateDto): LoginProvider | undefined {
  switch (credentials.authType) {
    case 'gsi':
      return 'Google'
    case 'orcid':
      return 'ORCID'
    case 'wikimedia':
      return 'Wikimedia'
    case 'iaCookies':
    case 'iaCredentials':
      return 'Internet Archive'
    case 'bluesky':
      return 'Bluesky'
    default:
      return undefined
  }
}

function itemSource(dto: ItemDto): ItemSource | undefined {
  if (!('source' in dto) || !dto.source) {
    return undefined
  }
  if (dto.type === 'iiif') {
    return 'IIIF'
  }
  if (dto.type === 'webpage') {
    if (dto.webpageType === 'youtube') {
      return 'YouTube'
    }
    if (dto.webpageType === 'vimeo') {
      return 'Vimeo'
    }
    if (dto.webpageType?.startsWith('ia')) {
      return 'Internet Archive'
    }
  }

  const url = new URL(dto.source)
  if (url.protocol === 'blob:' || url.protocol === 'data:') {
    return 'Upload'
  }

  const isHost = (domain: string) => url.hostname === domain || url.hostname.endsWith(`.${domain}`)
  if (isHost('archive.org')) {
    return 'Internet Archive'
  }
  if (isHost('wikimedia.org') || isHost('wikipedia.org')) {
    return 'Wikimedia'
  }
  if (isHost('youtube.com') || isHost('youtu.be')) {
    return 'YouTube'
  }
  if (isHost('vimeo.com')) {
    return 'Vimeo'
  }

  return 'Other web page'
}

export function trackItemsAdded(items: ItemDto[]) {
  const events = new Set<AnalyticsEvent>()

  for (const item of items) {
    events.add(`Item added: ${item.type}`)

    const source = itemSource(item)
    if (source) {
      events.add(`Item source: ${source}`)
    }
  }

  events.forEach(trackEvent)
}

function isInTapestry() {
  return /^\/(t|u)\//.test(location.pathname)
}

if (isAnalyticsEnabled) {
  init({
    domain: config.plausibleDomain,
    outboundLinks: true,
    fileDownloads: true,
  })

  document.addEventListener(
    'click',
    (event) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(
        '[data-analytics-click]',
      )
      const name = target?.dataset.analyticsClick
      if (name) {
        trackEvent(`Click: ${name as ClickTarget}`)
      }
    },
    { capture: true },
  )

  const playedMedia = new WeakSet<EventTarget>()
  document.addEventListener(
    'play',
    (event) => {
      const media = event.target
      if (!isInTapestry() || !media || playedMedia.has(media)) return

      playedMedia.add(media)
      if (media instanceof HTMLVideoElement) {
        trackEvent('Media played: video')
      } else if (media instanceof HTMLAudioElement) {
        trackEvent('Media played: audio')
      }
    },
    { capture: true },
  )
}
