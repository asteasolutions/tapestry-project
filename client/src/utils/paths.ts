import { DashboardSection } from '../pages/dashboard'
import { InteractionMode } from '../pages/tapestry/view-model'
import { UserProfileSection } from '../pages/user-profile'
import { AdminSection } from '../pages/admin'

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

export const DASHBOARD_ROOT = '/dashboard'

// TODO: Maybe we should have a "default" path, e.g. just `/dashboard`, where we
// automatically redirect to the last dashboard section the user has visited.
export function dashboardPath(section: DashboardSection) {
  return `${DASHBOARD_ROOT}/${section}`
}

export const ADMIN_ROOT = `${DASHBOARD_ROOT}/admin`

export function adminPath(section: AdminSection, id?: string, search?: URLSearchParams) {
  let path = `${ADMIN_ROOT}/${section}`
  if (id) {
    path += `/${encodeURIComponent(id)}`
  }
  return search ? `${path}?${search.toString()}` : path
}

export function userProfilePath(section: UserProfileSection) {
  return `/user-profile/${section}`
}
