import { Link, Navigate, useParams } from 'react-router'
import clsx from 'clsx'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { useSession } from '../../layouts/session'
import { adminPath, dashboardPath } from '../../utils/paths'
import { AdminTapestryList } from './tapestries/list'
import { AdminTapestryDetail } from './tapestries/detail'
import { AdminGallery } from './gallery'
import { AdminUsers } from './users'
import { AdminReports } from './reports'
import { AdminActivityLog } from './activity'
import styles from './styles.module.css'

export const ADMIN_SECTIONS = ['tapestries', 'gallery', 'users', 'reports', 'activity'] as const

export type AdminSection = (typeof ADMIN_SECTIONS)[number]

const SECTION_LABELS: Record<AdminSection, string> = {
  tapestries: 'All tapestries',
  gallery: 'Gallery',
  users: 'Users',
  reports: 'Reports',
  activity: 'Activity log',
}

function NotAuthorized() {
  return (
    <div className={styles.notAuthorized} role="alert">
      <Icon icon="lock" aria-hidden />
      <h1>Not authorized</h1>
      <p>You need to be an administrator to view this page.</p>
    </div>
  )
}

function AdminNavigation({ section }: { section: AdminSection }) {
  return (
    <nav aria-label="Admin sections" className={styles.navigation}>
      <p className={styles.navigationTitle}>Admin</p>
      <ul>
        {ADMIN_SECTIONS.map((s) => (
          <li key={s}>
            <Link
              to={adminPath(s)}
              aria-current={s === section ? 'page' : undefined}
              className={clsx({ [styles.active]: s === section })}
            >
              {SECTION_LABELS[s]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function AdminPanel({ section }: { section: AdminSection }) {
  const { id } = useParams<{ id?: string }>()

  return (
    <div className={styles.panel}>
      <title>{`Admin · ${SECTION_LABELS[section]}`}</title>
      <AdminNavigation section={section} />
      <main className={styles.content}>
        {section === 'tapestries' && (id ? <AdminTapestryDetail id={id} /> : <AdminTapestryList />)}
        {section === 'gallery' && <AdminGallery />}
        {section === 'users' && <AdminUsers />}
        {section === 'reports' && <AdminReports />}
        {section === 'activity' && <AdminActivityLog />}
      </main>
    </div>
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
