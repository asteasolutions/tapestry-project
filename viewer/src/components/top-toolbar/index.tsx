import { useState } from 'react'

import { IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar'
import { SearchButton } from 'tapestry-core-client/src/components/tapestry/search/search-button'
import { TapestryInfoDialog } from 'tapestry-core-client/src/components/tapestry/tapestry-info-dialog'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'

import { useTapestryData } from '../../app'
import styles from './styles.module.css'

export function TopToolbar() {
  const [viewingInfo, setViewingInfo] = useState(false)
  const tapestry = useTapestryData(['title', 'description', 'thumbnail', 'createdAt'])
  return (
    <>
      <Toolbar
        isOpen
        items={[
          {
            element: (
              <IconButton
                icon="info"
                aria-label="Tapestry info"
                onClick={() => setViewingInfo(true)}
              />
            ),
            tooltip: {
              side: 'bottom',
              children: 'Tapestry info',
            },
          },
          {
            element: <SearchButton />,
            tooltip: {
              side: 'bottom',
              children: <ShortcutLabel text="Search items">{shortcutLabel('/')}</ShortcutLabel>,
            },
          },
        ]}
        className={styles.root}
      />
      {viewingInfo && (
        <TapestryInfoDialog tapestry={tapestry} onClose={() => setViewingInfo(false)} />
      )}
    </>
  )
}
