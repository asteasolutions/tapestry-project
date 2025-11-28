import { DashboardSection } from '../pages/dashboard'
import { InteractionMode } from '../pages/tapestry/view-model'
import { UserProfileSection } from '../pages/user-profile'

export function tapestryPath(
  username: string,
  slug: string,
  mode: InteractionMode = 'view',
  query?: string,
) {
  let path = `/u/${username}/${slug}`
  if (mode === 'edit') {
    path += '/edit'
  }
  if (query) {
    path += query
  }
  return path
}

// TODO: Maybe we should have a "default" path, e.g. just `/dashboard`, where we
// automatically redirect to the last dashboard section the user has visited.
export function dashboardPath(section: DashboardSection) {
  return `/dashboard/${section}`
}

export function userProfilePath(section: UserProfileSection) {
  return `/user-profile/${section}`
}
