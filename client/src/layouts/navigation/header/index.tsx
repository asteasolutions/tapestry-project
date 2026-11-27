import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import styles from './styles.module.css'
import { UserMenu } from '../../../components/user-menu'
import { useSession } from '../../session'
import { LoginButton } from '../../../auth'
import Logo from '../../../assets/icons/logo-large.svg?react'
import { Link } from 'react-router'
import { ADMIN_ROOT, adminPath, DASHBOARD_ROOT, dashboardPath } from '../../../utils/paths'
import { Button, IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'
import { useState } from 'react'
import { clickTracking } from '../../../services/analytics'
import clsx from 'clsx'
import { MobileNavDrawer, NavButton } from './mobile-nav-drawer'

function useButtons(): NavButton[] {
  const { user } = useSession()
  const isAdmin = user?.role === 'admin'
  const { pathname } = window.location
  return [
    {
      to: dashboardPath('public'),
      label: 'Gallery',
      active: pathname.startsWith(DASHBOARD_ROOT) && !pathname.startsWith(ADMIN_ROOT),
      tracking: clickTracking('Header Gallery'),
    },
    {
      to: '/about',
      label: 'About',
      active: pathname.startsWith('/about'),
    },
    ...(isAdmin
      ? [
          {
            to: adminPath('tapestries'),
            label: 'Admin',
            active: pathname.startsWith(ADMIN_ROOT),
          },
        ]
      : []),
  ]
}

export function Header() {
  const { user } = useSession()
  const SMOrLess = useResponsive() <= Breakpoint.SM
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  const buttons = useButtons()

  return (
    <div className={styles.root}>
      {SMOrLess && (
        <>
          <IconButton
            className={styles.mobileNavButton}
            icon="menu"
            aria-label="Navigation menu"
            onClick={() => setIsMobileNavOpen(true)}
            isActive={isMobileNavOpen}
          />
          <MobileNavDrawer
            isOpen={isMobileNavOpen}
            buttons={buttons}
            onClose={() => setIsMobileNavOpen(false)}
          />
        </>
      )}
      <Link to={'/'} className={styles.iconLink} aria-label="Tapestries home">
        <SvgIcon Icon={Logo} width={150} />
      </Link>
      <div className={styles.navigation}>
        {!SMOrLess && (
          <>
            {buttons.map((b) => (
              <Button
                key={b.to}
                to={b.to}
                component={Link}
                variant="tertiary"
                {...b.tracking}
                className={clsx({ [styles.active]: b.active })}
              >
                {b.label}
              </Button>
            ))}
          </>
        )}
        {user ? <UserMenu user={user} /> : <LoginButton />}
      </div>
    </div>
  )
}
