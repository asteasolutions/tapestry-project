import { useState } from 'react'
import { DashboardSection } from '..'
import { AIChatDialog } from '../../../components/ai-chat-dialog'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useSession } from '../../../layouts/session'
import { ImportTapestryButton } from '../import-tapestry-button'
import Gemini from '../../../assets/icons/gemini.svg?react'
import styles from './styles.module.css'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { SectionList } from '../../../components/section-list'
import { dashboardPath } from '../../../utils/paths'

interface DashboardHeaderProps {
  onImport: (files: File[]) => unknown
  section: DashboardSection
  onNewTapestry: () => unknown
}

export function DashboardHeader({ onImport, section, onNewTapestry }: DashboardHeaderProps) {
  const { user } = useSession()
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)

  return (
    <div className={styles.root}>
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
                children: 'Gallery',
              },
            }}
          />
          <div className={styles.createTapestryButtons}>
            <Button
              variant="primary"
              icon="add"
              onClick={() => onNewTapestry()}
              className={styles.newTapestryButton}
            >
              New
            </Button>
            <ImportTapestryButton onSelected={onImport} />
          </div>
          {/* Temporarily hidden until requirements and use cases are furthrer clarified
              <IconButton
                icon={Gemini}
                aria-label="Gemini chat"
                className={styles.gemini}
                isActive={isAIChatOpen}
                onClick={() => setIsAIChatOpen(!isAIChatOpen)}
                tooltip={{ side: 'bottom', children: 'Ask the AI' }}
              /> */}
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
    </div>
  )
}
