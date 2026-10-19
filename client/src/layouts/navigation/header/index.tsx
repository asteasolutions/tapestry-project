import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import styles from './styles.module.css'
import { UserMenu } from '../../../components/user-menu'
import { useSession } from '../../session'
import { LoginButton } from '../../../auth'
import Logo from '../../../assets/icons/logo-large.svg?react'
import { Link, useLocation } from 'react-router'
import { DASHBOARD_ROOT, dashboardPath } from '../../../utils/paths'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'

export function Header() {
  const { user } = useSession()
  const { pathname } = useLocation()
  const showGallery = !pathname.startsWith(DASHBOARD_ROOT)

  return (
    <div className={styles.root}>
      <Link to={'/'} className={styles.iconLink}>
        <SvgIcon Icon={Logo} width={150} />
      </Link>
      <div className={styles.navigation}>
        {showGallery && (
          <Button to={dashboardPath('public')} component={Link} variant="tertiary">
            {'Gallery'}
          </Button>
        )}
        <Button to={'/about'} component={Link} variant="tertiary">
          About
        </Button>
        {user ? <UserMenu user={user} /> : <LoginButton />}
      </div>
    </div>
  )
}
