import clsx from 'clsx'
import { Toolbar } from '../../../../src/components/lib/toolbar/index'
import { useViewportObstruction } from '../hooks/use-viewport-obstruction'
import { useZoomToolbarItems } from '../hooks/use-zoom-toolbar-items'
import styles from './styles.module.css'

interface ZoomControlsProps {
  className?: string
}

export function ZoomToolbar({ className }: ZoomControlsProps) {
  const obstruction = useViewportObstruction({ clear: { bottom: true, right: true } })

  const { items, closeSubmenu, selectedSubmenu } = useZoomToolbarItems(
    ['zoom-out', 'zoom-in', 'zoom-to-fit'],
    ['guide', 'shortcuts', 'separator', 'start-presentation', 'fullscreen'],
  )

  return (
    <Toolbar
      wrapperRef={obstruction.ref}
      isOpen
      className={clsx(className, styles.root)}
      onFocusOut={closeSubmenu}
      selectedSubmenu={selectedSubmenu}
      items={items}
    />
  )
}
