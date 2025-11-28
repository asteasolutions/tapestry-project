import clsx from 'clsx'
import { Toolbar } from '../../../../src/components/lib/toolbar/index'
import { useFocusRectInset } from '../../../../src/components/tapestry/hooks/use-focus-rect-inset'
import { useZoomToolbarItems } from '../hooks/use-zoom-toolbar-items'
import styles from './styles.module.css'

interface ZoomControlsProps {
  className?: string
}

export function ZoomToolbar({ className }: ZoomControlsProps) {
  useFocusRectInset({ bottom: 64 })

  const { items, closeSubmenu, selectedSubmenu } = useZoomToolbarItems(
    ['zoom-out', 'zoom-in', 'zoom-to-fit'],
    ['guide', 'shortcuts', 'separator', 'start-presentation', 'fullscreen'],
  )

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
