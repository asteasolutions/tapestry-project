import { ReactNode, useEffect, useState } from 'react'
import styles from './styles.module.css'
import clsx from 'clsx'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { Header } from './header'
import { Footer } from './footer'
import { useSession } from '../session'
import { useLocation, useNavigate } from 'react-router'
import { dashboardPath } from '../../utils/paths'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { LoadingLogo } from '../../components/loading-logo'
import { AcceptInvitationDialog } from '../../components/accept-invitation-dialog'

function useNavigateOnLogin() {
  const { user } = useSession()
  const navigate = useNavigate()
  const location = useLocation()
  const [prevUser, setPrevUser] = useState<UserDto | null>(null)

  const navigatingOnLogin = !!user && !prevUser

  useEffect(() => {
    if (navigatingOnLogin) {
      void navigate({ pathname: dashboardPath('home'), search: location.search }, { replace: true })
    }
    if (user !== prevUser) {
      setPrevUser(user)
    }
  }, [navigate, user, prevUser, navigatingOnLogin, location.search])

  return { navigatingOnLogin }
}
export interface NavigationLayoutProps {
  children: ReactNode
}

export function NavigationLayout({ children }: NavigationLayoutProps) {
  useThemeCss('light')
  const { navigatingOnLogin } = useNavigateOnLogin()

  return (
    <div className={clsx(styles.root, 'navigation-layout')}>
      <Header />
      {navigatingOnLogin ? <LoadingLogo /> : children}
      <Footer />
      <AcceptInvitationDialog />
    </div>
  )
}
