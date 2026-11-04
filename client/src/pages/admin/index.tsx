import { createContext, useContext } from 'react'
import { noop } from 'lodash-es'
import { Navigate, useParams } from 'react-router'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useSession } from '../../layouts/session'
import { SectionList } from '../../components/section-list'
import { resource } from '../../services/rest-resources'
import { adminPath, dashboardPath } from '../../utils/paths'
import { AdminTapestryList } from './tapestries/list'
import { AdminTapestryDetail } from './tapestries/detail'
import { AdminGallery } from './gallery'
import { AdminFeatureRequests } from './feature-requests'
import { AdminUsers } from './users'
import { AdminReports } from './reports'
import { AdminActivityLog } from './activity'
import styles from './styles.module.css'

export const ADMIN_SECTIONS = [
  'tapestries',
  'gallery',
  'feature-requests',
  'users',
  'reports',
  'activity',
] as const

export type AdminSection = (typeof ADMIN_SECTIONS)[number]

interface AdminContextValue {
  /** Refreshes the pending feature request count shown in the navigation */
  refreshPendingCount: () => unknown
}

const AdminContext = createContext<AdminContextValue>({ refreshPendingCount: noop })

export function useAdminContext() {
  return useContext(AdminContext)
}

function NotAuthorized() {
  return (
    <div className={styles.notAuthorized} role="alert">
      <Icon icon="lock" />
      <Text variant="h6" component="h1">
        Not authorized
      </Text>
      <Text component="p" className={styles.muted}>
        You need to be an administrator to view this page.
      </Text>
    </div>
  )
}

function AdminPanel({ section }: { section: AdminSection }) {
  const { id } = useParams<{ id?: string }>()
  const { data: pendingCount, reload: refreshPendingCount } = useAsync(
    async ({ signal }) =>
      (
        await resource('adminFeatureRequests').list(
          { filter: { 'status:eq': 'pending' }, limit: 0 },
          { signal },
        )
      ).total,
    [],
    { clearDataOnReload: false },
  )

  const sectionLabel = {
    tapestries: 'All tapestries',
    gallery: 'Gallery',
    'feature-requests': 'Feature requests',
    users: 'Users',
    reports: 'Reports',
    activity: 'Activity log',
  }[section]

  return (
    <AdminContext value={{ refreshPendingCount: () => refreshPendingCount(noop) }}>
      <title>{`Admin · ${sectionLabel}`}</title>
      <div className={styles.navigation}>
        <SectionList<AdminSection>
          activeSection={section}
          buttons={{
            tapestries: {
              icon: 'note_stack',
              to: adminPath('tapestries'),
              children: 'All tapestries',
            },
            gallery: { icon: 'public', to: adminPath('gallery'), children: 'Gallery' },
            'feature-requests': {
              icon: 'inbox',
              to: adminPath('feature-requests'),
              children: (
                <>
                  Feature requests
                  {!!pendingCount && (
                    <span className={styles.countBadge} aria-label={`${pendingCount} pending`}>
                      {pendingCount}
                    </span>
                  )}
                </>
              ),
            },
            users: { icon: 'group', to: adminPath('users'), children: 'Users' },
            reports: { icon: 'bar_chart', to: adminPath('reports'), children: 'Reports' },
            activity: { icon: 'history', to: adminPath('activity'), children: 'Activity log' },
          }}
        />
      </div>
      <main className={styles.content}>
        {section === 'tapestries' && (id ? <AdminTapestryDetail id={id} /> : <AdminTapestryList />)}
        {section === 'gallery' && <AdminGallery />}
        {section === 'feature-requests' && <AdminFeatureRequests />}
        {section === 'users' && <AdminUsers />}
        {section === 'reports' && <AdminReports />}
        {section === 'activity' && <AdminActivityLog />}
      </main>
    </AdminContext>
  )
}

export function AdminPage() {
  const { user } = useSession()
  const { section } = useParams<{ section?: string }>()

  if (!user) {
    return <Navigate to={dashboardPath('public')} replace />
  }

  // Hiding the panel is a convenience only; the server enforces every permission check
  if (user.role !== 'admin') {
    return (
      <div className={styles.root}>
        <NotAuthorized />
      </div>
    )
  }

  if (!ADMIN_SECTIONS.includes(section as AdminSection)) {
    return <Navigate to={adminPath('tapestries')} replace />
  }

  return (
    <div className={styles.root}>
      <AdminPanel section={section as AdminSection} />
    </div>
  )
}
