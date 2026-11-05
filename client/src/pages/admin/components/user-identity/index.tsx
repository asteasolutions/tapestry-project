import { Link } from 'react-router'
import { AdminUserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { Avatar } from '../../../../components/avatar'
import { displayName } from '../../format'
import common from '../../common.module.css'
import styles from './styles.module.css'

/** Avatar, username, name and email of a user. */
export function UserIdentity({ user, linkTo }: { user: AdminUserDto; linkTo?: string }) {
  const name = displayName(user)
  return (
    <div className={styles.root}>
      <Avatar user={user} size="small" />
      <div className={styles.text}>
        <span>
          {linkTo ? (
            <Link to={linkTo} className={common.underlinedLink}>
              @{user.username}
            </Link>
          ) : (
            <strong>@{user.username}</strong>
          )}
          {name !== user.username && <span className={common.muted}> · {name}</span>}
        </span>
        <span className={styles.secondary}>{user.email ?? 'No email'}</span>
      </div>
    </div>
  )
}
