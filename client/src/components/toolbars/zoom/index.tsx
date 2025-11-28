import clsx from 'clsx'
import { noop } from 'lodash'
import { useNavigate } from 'react-router'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { Toolbar } from 'tapestry-core-client/src/components/lib/toolbar/index'
import { useFocusRectInset } from 'tapestry-core-client/src/components/tapestry/hooks/use-focus-rect-inset'
import { useZoomToolbarItems } from 'tapestry-core-client/src/components/tapestry/hooks/use-zoom-toolbar-items'
import { useTapestryPath } from '../../../hooks/use-tapestry-path'
import { useTapestryData } from '../../../pages/tapestry/tapestry-providers'
import { BugReportButton } from './bug-report-button'
import styles from './styles.module.css'

interface ZoomControlsProps {
  className?: string
}

export function ZoomToolbar({ className }: ZoomControlsProps) {
  const { userAccess, interactionMode, hideEditControls } = useTapestryData([
    'userAccess',
    'interactionMode',
    'hideEditControls',
  ])

  const canEdit = userAccess === 'edit'
  const navigate = useNavigate()
  const tapestryPathWithToggledMode = useTapestryPath(interactionMode === 'edit' ? 'view' : 'edit')
  const toggleMode = canEdit ? () => navigate(tapestryPathWithToggledMode) : noop

  useKeyboardShortcuts({
    ...(!hideEditControls && { KeyE: toggleMode }),
  })

  const { items, closeSubmenu, selectedSubmenu } = useZoomToolbarItems(
    [
      'zoom-out',
      'zoom-in',
      'zoom-to-fit',
      canEdit && {
        element: (
          <IconButton
            icon={interactionMode === 'edit' ? 'visibility' : 'edit'}
            aria-label={interactionMode === 'edit' ? 'Preview' : 'Edit'}
            onClick={() => {
              toggleMode()
              closeSubmenu()
            }}
            disabled={!!hideEditControls}
          />
        ),
        tooltip: {
          side: 'top',
          children: interactionMode === 'edit' ? 'Viewer mode' : 'Author mode',
        },
      },
    ],
    [
      <BugReportButton onClick={() => closeSubmenu()} />,
      'separator',
      'guide',
      'shortcuts',
      'separator',
      'start-presentation',
      'fullscreen',
    ],
  )

  useFocusRectInset({ bottom: 64 })

  return (
    <Toolbar
      isOpen
      className={clsx(className, styles.root)}
      onFocusOut={closeSubmenu}
      selectedSubmenu={selectedSubmenu}
      items={items}
    />
  )
}
