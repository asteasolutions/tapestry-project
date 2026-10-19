import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import styles from './styles.module.css'
import { UserMenu } from '../../../components/user-menu'
import { useSession } from '../../session'
import { LoginButton } from '../../../auth'
import Logo from '../../../assets/icons/logo-large.svg?react'
import { Link, useLocation } from 'react-router'
import { DASHBOARD_ROOT, dashboardPath } from '../../../utils/paths'
import { Button, IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'
import { Breakpoint, useResponsive } from '../../../providers/responsive-provider'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar'
import { useState } from 'react'

export function Header() {
  const { user } = useSession()
  const { pathname } = useLocation()
  const showGallery = !pathname.startsWith(DASHBOARD_ROOT)
  const SMOrLess = useResponsive() <= Breakpoint.SM
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)

  return (
    <div className={styles.root}>
      {SMOrLess && (
        <div className={styles.mobileNav}>
          <IconButton
            className={styles.mobileNavButton}
            icon="menu"
            aria-label="Navigation menu"
            onClick={() => setIsMobileNavOpen((o) => !o)}
            isActive={isMobileNavOpen}
          />
          <Toolbar
            isOpen={isMobileNavOpen}
            className={styles.mobileNavToolbar}
            direction="column"
            items={[
              ...(showGallery
                ? [
                    <MenuItemButton
                      to={dashboardPath('public')}
                      component={Link}
                      onClick={() => setIsMobileNavOpen(false)}
                    >
                      Gallery
                    </MenuItemButton>,
                  ]
                : []),
              <MenuItemButton
                to={'/about'}
                component={Link}
                onClick={() => setIsMobileNavOpen(false)}
              >
                About
              </MenuItemButton>,
            ]}
          />
        </div>
      )}
      <Link to={'/'} className={styles.iconLink}>
        <SvgIcon Icon={Logo} width={150} />
      </Link>
      <div className={styles.navigation}>
        {!SMOrLess && (
          <>
            {showGallery && (
              <Button to={dashboardPath('public')} component={Link} variant="tertiary">
                Gallery
              </Button>
            )}
            <Button to={'/about'} component={Link} variant="tertiary">
              About
            </Button>
          </>
        )}
        {user ? <UserMenu user={user} /> : <LoginButton />}
      </div>
    </div>
  )
}
