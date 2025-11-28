import { useEffect, useState } from 'react'
import { DashboardSection } from '..'
import { LoginButton } from '../../../auth'
import { AIChatDialog } from '../../../components/ai-chat-dialog'
import { IconButton, Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { useSession } from '../../../layouts/session'
import { ImportTapestryButton } from '../import-tapestry-button'
import Logo from '../../../assets/icons/logo-large.svg?react'
import Gemini from '../../../assets/icons/gemini.svg?react'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { UserMenu } from '../../../components/user-menu'
import { SectionList } from '../../../components/section-list'
import { dashboardPath } from '../../../utils/paths'
import { LocalStorage } from '../../../services/local-storage'
import { WelcomeDialog } from '../welcome-dialog'

const shouldHideWelcomeDialog = new LocalStorage<boolean>('hide-welcome-dialog')

let hasWelcomeDialogBeenShown = false

interface DashboardHeaderProps {
  onImport: (files: File[]) => unknown
  section: DashboardSection
  onNewTapestry: () => unknown
}

export function DashboardHeader({ onImport, section, onNewTapestry }: DashboardHeaderProps) {
  const { user } = useSession()
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(
    !shouldHideWelcomeDialog.current && !hasWelcomeDialogBeenShown,
  )

  useEffect(() => {
    hasWelcomeDialogBeenShown = true
  }, [])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <SvgIcon Icon={Logo} width={150} />
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <IconButton
            icon="info"
            aria-label="Introduction"
            onClick={() => setShowWelcomeDialog(true)}
            tooltip={{ side: 'bottom', children: 'Show welcome message' }}
          />
          {user ? (
            <div className={styles.userMenuContainer}>
              <ImportTapestryButton onSelected={onImport} />
              <IconButton
                icon={Gemini}
                aria-label="Gemini chat"
                className={styles.gemini}
                isActive={isAIChatOpen}
                onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                tooltip={{ side: 'bottom', children: 'Ask the AI' }}
              />
              <UserMenu user={user} />
            </div>
          ) : (
            <LoginButton />
          )}
        </div>
      </div>
      {user && (
        <div className={styles.sectionsContainer}>
          <SectionList<DashboardSection>
            activeSection={section}
            buttons={{
              home: {
                icon: 'note_stack',
                to: dashboardPath('home'),
                children: 'My tapestries',
              },
              bookmarks: {
                icon: 'collections_bookmark',
                to: dashboardPath('bookmarks'),
                children: 'Bookmarks',
              },
              shared: {
                icon: 'group_add',
                to: dashboardPath('shared'),
                children: 'Shared with me',
              },
              public: {
                icon: 'public',
                to: dashboardPath('public'),
                children: 'Samples',
              },
            }}
          />
          <Button
            variant="primary"
            icon="add"
            onClick={() => onNewTapestry()}
            className={styles.newTapestryButton}
          >
            New
          </Button>
        </div>
      )}
      {isAIChatOpen && (
        <AIChatDialog
          title={
            <Text variant="h6" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Gemini /> Gemini
            </Text>
          }
          onClose={() => setIsAIChatOpen(false)}
        />
      )}
      {showWelcomeDialog && (
        <WelcomeDialog
          onClose={(dontShowAgain) => {
            setShowWelcomeDialog(false)
            shouldHideWelcomeDialog.save(dontShowAgain)
          }}
          initialCheckboxValue={!!shouldHideWelcomeDialog.current}
        />
      )}
    </div>
  )
}
