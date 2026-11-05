import { AdminUserDto, SharingLevel } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { tapestryPath } from '../../utils/paths'

export const SHARING_LEVEL_LABELS: Record<SharingLevel, string> = {
  owner: 'Owner only',
  invited: 'Invited people',
  link: 'Anyone with the link',
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })
const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function formatDate(date: Date | null | undefined) {
  return date ? dateFormat.format(date) : '—'
}

export function formatDateTime(date: Date | null | undefined) {
  return date ? dateTimeFormat.format(date) : '—'
}

export function tapestryUrl(username: string, slug: string) {
  return `${window.location.origin}${tapestryPath(username, slug)}`
}

export interface LoginProfile {
  provider: string
  id: string
  url: string | null
}

/** Every login provider identifier stored for the user (more than one is possible). */
export function loginProfiles(user: AdminUserDto): LoginProfile[] {
  const profiles: LoginProfile[] = []
  if (user.gsiUserId) {
    profiles.push({ provider: 'Google', id: user.gsiUserId, url: null })
  }
  if (user.orcidId) {
    profiles.push({ provider: 'ORCID', id: user.orcidId, url: `https://orcid.org/${user.orcidId}` })
  }
  if (user.wikimediaId) {
    // Only the numeric Wikimedia account ID is stored, not the Wikimedia username
    profiles.push({ provider: 'Wikimedia', id: user.wikimediaId, url: null })
  }
  if (user.blueskyDid) {
    profiles.push({
      provider: 'Bluesky',
      id: user.blueskyDid,
      url: `https://bsky.app/profile/${user.blueskyDid}`,
    })
  }
  if (profiles.length === 0 && user.email) {
    profiles.push({ provider: 'Internet Archive', id: user.email, url: null })
  }
  return profiles
}

/** How to reach a user when they have no email: by the login provider they use. */
export function contactLine(user: AdminUserDto) {
  if (user.email) {
    return user.email
  }
  const providers = loginProfiles(user).map((profile) => profile.provider)
  return providers.length ? `No email · signs in with ${providers.join(', ')}` : 'No email'
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}

export function displayName(user: Pick<AdminUserDto, 'givenName' | 'familyName' | 'username'>) {
  return [user.givenName, user.familyName].filter(Boolean).join(' ') || user.username
}

/** Converts a "YYYY-MM-DD" date input value to the start of that day (local time) as ISO. */
export function dayStart(value: string, offsetDays = 0) {
  if (!value) {
    return undefined
  }
  const date = new Date(`${value}T00:00:00`)
  date.setDate(date.getDate() + offsetDays)
  return date.toISOString()
}
