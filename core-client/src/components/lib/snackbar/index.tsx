import { CSSProperties, useEffect, useRef, useState } from 'react'
import styles from './styles.module.css'
import { Text } from '../text/index.js'
import clsx from 'clsx'
import { usePropRef } from '../../lib/hooks/use-prop-ref.js'
import { createPortal } from 'react-dom'
import { useVisualViewport } from '../hooks/use-visual-viewport.js'
import { SnackbarData } from '../../../view-model'

const DEFAULT_DISPLAY_SECONDS = 2

interface SnackbarProps {
  value?: SnackbarData
  onChange: () => unknown
}

export function Snackbar({ value, onChange }: SnackbarProps) {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<SnackbarData>()
  const timeoutRef = useRef<number>(undefined)

  const onChangeRef = usePropRef(onChange)
  const visualViewport = useVisualViewport()

  useEffect(() => {
    if (value) {
      setData(value)
      setVisible(true)
      clearTimeout(timeoutRef.current)
      timeoutRef.current = window.setTimeout(
        () => setVisible(false),
        (value.duration ?? DEFAULT_DISPLAY_SECONDS) * 1000,
      )
      onChangeRef.current()
    }
  }, [value, onChangeRef])

  return (
    !value &&
    data &&
    createPortal(
      <Text
        component="div"
        className={clsx(styles.snackbar, { [styles.hidden]: !visible }, data.variant)}
        // Keep the snackbar inside the visible area and at its normal size even if the page is pinch-zoomed.
        style={
          visualViewport &&
          ({
            '--vv-left': `${visualViewport.offsetLeft}px`,
            '--vv-top': `${visualViewport.offsetTop}px`,
            '--vv-width': `${visualViewport.width}px`,
            '--vv-height': `${visualViewport.height}px`,
            '--vv-scale': visualViewport.scale,
          } as CSSProperties)
        }
      >
        {data.content}
      </Text>,
      document.body,
    )
  )
}
