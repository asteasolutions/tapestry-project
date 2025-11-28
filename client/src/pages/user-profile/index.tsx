import styles from './styles.module.css'
import { Navigate, useParams } from 'react-router'
import { useThemeCss } from 'tapestry-core-client/src/components/lib/hooks/use-theme-css'
import { useSession } from '../../layouts/session'
import { UserProfileHeader } from './header'
import { AIAssistantSetup } from './ai-assistant-setup'
import { dashboardPath, userProfilePath } from '../../utils/paths'

export type UserProfileSection = 'ai-assistants'

export function UserProfile() {
  const { user } = useSession()
  const { section } = useParams<{ section: UserProfileSection }>()

  useThemeCss('light')

  const documentTitle = `${user?.givenName}'s Profile`

  if (!user) {
    return <Navigate to={dashboardPath('home')} replace />
  }

  if (section !== 'ai-assistants') {
    return <Navigate to={userProfilePath('ai-assistants')} replace />
  }

  return (
    <div className={styles.root}>
      <title>{documentTitle}</title>
      <UserProfileHeader section={section} user={user} />
      {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        section === 'ai-assistants' && <AIAssistantSetup user={user} />
      }
    </div>
  )
}
