import { useEffect, useRef, useState } from 'react'
import styles from './styles.module.css'
import { Text } from '../text/index.js'
import clsx from 'clsx'
import { usePropRef } from '../../lib/hooks/use-prop-ref.js'
import { createPortal } from 'react-dom'

const DEFAULT_DISPLAY_SECONDS = 2

// TODO: Share this type with the view model. It is copied from there.
interface SnackbarData {
  readonly text: string
  readonly duration?: number
  readonly variant?: 'normal' | 'warning' | 'error' | 'success'
}

interface SnackbarProps {
  value?: SnackbarData
  onChange: () => unknown
}

export function Snackbar({ value, onChange }: SnackbarProps) {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState<SnackbarData>()
  const timeoutRef = useRef<number>(undefined)

  const onChangeRef = usePropRef(onChange)

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
      >
        {data.text}
      </Text>,
      document.body,
    )
  )
}
