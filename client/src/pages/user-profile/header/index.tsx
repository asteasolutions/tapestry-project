import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import Logo from '../../../assets/icons/logo-large.svg?react'
import styles from '../styles.module.css'
import { UserProfileSection } from '..'
import { UserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { UserMenu } from '../../../components/user-menu'
import { Link } from 'react-router'
import { SectionList } from '../../../components/section-list'
import { dashboardPath, userProfilePath } from '../../../utils/paths'

interface UserProfileHeaderProps {
  user: UserDto
  section: UserProfileSection
}

export function UserProfileHeader({ user, section }: UserProfileHeaderProps) {
  return (
    <div className={styles.headerContainer}>
      <div className={styles.header}>
        <Link to={dashboardPath('home')}>
          <SvgIcon Icon={Logo} width={150} style={{ height: '100%' }} />
        </Link>
        <div className={styles.userMenuContainer}>
          <UserMenu user={user} />
        </div>
      </div>
      <div className={styles.sectionsContainer}>
        <SectionList<UserProfileSection>
          buttons={{
            'ai-assistants': {
              icon: 'api',
              to: userProfilePath('ai-assistants'),
              children: 'AI Assistant Setup',
            },
          }}
          activeSection={section}
        />
      </div>
    </div>
  )
}
