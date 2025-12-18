import { useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar'
import { useViewportObstruction } from 'tapestry-core-client/src/components/tapestry/hooks/use-viewport-obstruction'
import { SearchButton } from 'tapestry-core-client/src/components/tapestry/search/search-button'
import { TapestryInfoDialog } from 'tapestry-core-client/src/components/tapestry/tapestry-info-dialog'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { useTapestryData } from '../../app'
import styles from './styles.module.css'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import Logo from 'tapestry-core-client/src/assets/icons/logo.svg?react'

export function TopToolbar() {
  const obstruction = useViewportObstruction({ clear: { top: true, left: true } })
  const [viewingInfo, setViewingInfo] = useState(false)
  const tapestry = useTapestryData(['title', 'description', 'thumbnail', 'createdAt'])

  return (
    <>
      <Toolbar
        wrapperRef={obstruction.ref}
        isOpen
        items={[
          {
            element: (
              <div className={styles.logoWrapper}>
                <SvgIcon Icon={Logo} size={28} className={styles.logo} />
              </div>
            ),
            tooltip: { side: 'bottom', children: 'Go to tapestries', offset: -8 },
          },
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
