import { ReactNode, useEffect, useRef } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { Header } from './header'
import { Footer } from './footer'
import { useSession } from '../session'
import { useNavigate } from 'react-router'
import { DASHBOARD_ROOT, dashboardPath } from '../../utils/paths'
import { LoadingLogo } from '../../components/loading-logo'
import { AcceptInvitationDialog } from '../../components/accept-invitation-dialog'

export interface NavigationLayoutProps {
  children: ReactNode
}

let isInitialLoad = true

export function NavigationLayout({ children }: NavigationLayoutProps) {
  useThemeCss('light')
  const { user } = useSession()
  const prevUserRef = useRef(user)
  const navigate = useNavigate()

  const willNavigate =
    (isInitialLoad && user && !location.pathname.startsWith(DASHBOARD_ROOT)) ||
    (!prevUserRef.current && user)

  prevUserRef.current = user

  useEffect(() => {
    if (willNavigate) {
      void navigate({ pathname: dashboardPath('home'), search: location.search }, { replace: true })
    }
    isInitialLoad = false
  }, [willNavigate, navigate])

  return (
    <div className={clsx(styles.root, 'navigation-layout')}>
      <Header />
      {willNavigate ? <LoadingLogo /> : children}
      <Footer />
      <AcceptInvitationDialog />
    </div>
  )
}
