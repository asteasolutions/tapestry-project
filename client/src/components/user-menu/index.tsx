import { useState } from 'react'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import styles from './styles.module.css'
import { auth } from '../../auth'
import { useOutsideClick } from 'tapestry-core-client/src/components/lib/hooks/use-outside-click'
import { Avatar } from '../avatar'
import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { Link } from 'react-router'
import clsx from 'clsx'
import { userProfilePath } from '../../utils/paths'

interface UserMenuProps {
  user: UserDto
  className?: string
}

export function UserMenu({ user, className }: UserMenuProps) {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const avatarContainerRef = useOutsideClick<HTMLDivElement>(() => setIsUserMenuOpen(false))

  return (
    <div className={clsx(styles.avatarContainer, className)} ref={avatarContainerRef}>
      <Avatar size="large" user={user} onClick={() => setIsUserMenuOpen((t) => !t)} />
      <Toolbar
        isOpen={isUserMenuOpen}
        className={styles.userMenu}
        direction="column"
        items={[
          <MenuItemButton
            icon="api"
            component={Link}
            to={userProfilePath('ai-assistants')}
            onClick={() => setIsUserMenuOpen(false)}
          >
            AI Assistant Setup
          </MenuItemButton>,
          'separator',
          <MenuItemButton
            icon="logout"
            onClick={() => {
              void auth.logout()
              setIsUserMenuOpen(false)
            }}
          >
            Logout
          </MenuItemButton>,
        ]}
      />
    </div>
  )
}
