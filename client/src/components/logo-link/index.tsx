import { Link } from 'react-router'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import Logo from 'tapestry-core-client/src/assets/icons/logo.svg?react'
import { DASHBOARD_ROOT, dashboardPath } from '../../utils/paths'
import styles from './styles.module.css'

function isDashboardPage(url: URL) {
  return url.pathname.startsWith(DASHBOARD_ROOT) || url.pathname === '/about'
}

function lastDashboardPath() {
  const currentEntry = 'navigation' in window ? window.navigation.currentEntry : null
  if (!currentEntry) {
    return dashboardPath('home')
  }

  const lastDashboardUrl = window.navigation
    .entries()
    .slice(0, currentEntry.index)
    .map((entry) => new URL(entry.url ?? '/', window.location.origin))
    .findLast(isDashboardPage)

  return lastDashboardUrl
    ? lastDashboardUrl.pathname + lastDashboardUrl.search
    : dashboardPath('home')
}

interface LogoLinkProps {
  className?: string
}

export function LogoLink({ className }: LogoLinkProps) {
  return (
    <Link to={lastDashboardPath()} className={styles.root}>
      <SvgIcon Icon={Logo} size={28} className={className} />
    </Link>
  )
}
