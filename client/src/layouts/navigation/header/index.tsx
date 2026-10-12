import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import styles from './styles.module.css'
import { UserMenu } from '../../../components/user-menu'
import { useSession } from '../../session'
import { LoginButton } from '../../../auth'
import Logo from '../../../assets/icons/logo-large.svg?react'
import { Link } from 'react-router'
import { dashboardPath } from '../../../utils/paths'
import { Button } from 'tapestry-core-client/src/components/lib/buttons'

export function Header() {
  const { user } = useSession()

  return (
    <div className={styles.root}>
      <Link to={'/'} className={styles.iconLink}>
        <SvgIcon Icon={Logo} width={150} />
      </Link>
      <div className={styles.navigation}>
        <Button to={'/about'} component={Link} variant="tertiary">
          About
        </Button>
        <Button to={dashboardPath(user ? 'home' : 'public')} component={Link} variant="tertiary">
          {user ? 'My Tapestries' : 'Gallery'}
        </Button>
        {user ? <UserMenu user={user} /> : <LoginButton />}
      </div>
    </div>
  )
}
