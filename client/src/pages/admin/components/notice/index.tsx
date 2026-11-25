import { ReactNode } from 'react'
import clsx from 'clsx'
import { Icon, IconName } from 'tapestry-core-client/src/components/lib/icon/index'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import styles from './styles.module.css'

type Tone = 'success' | 'warning' | 'info' | 'error'

const ICONS: Record<Tone, IconName> = {
  success: 'check_circle',
  warning: 'error',
  info: 'info',
  error: 'error',
}

interface NoticeProps {
  tone: Tone
  title?: ReactNode
  children?: ReactNode
  /** Buttons shown at the right, e.g. "Undo" */
  actions?: ReactNode
  onDismiss?: () => unknown
}

/** A status banner, e.g. the confirmation of a change or a warning about unsaved changes. */
export function Notice({ tone, title, children, actions, onDismiss }: NoticeProps) {
  return (
    <div className={clsx(styles.root, styles[tone])} role={tone === 'error' ? 'alert' : 'status'}>
      <span className={styles.message}>
        <Icon icon={ICONS[tone]} aria-hidden />
        <span>
          {title && <strong>{title}</strong>} {children}
        </span>
      </span>
      {(actions ?? onDismiss) && (
        <span className={styles.actions}>
          {actions}
          {onDismiss && (
            <IconButton
              icon="close"
              aria-label="Dismiss message"
              size="small"
              onClick={onDismiss}
              className={styles.dismiss}
            />
          )}
        </span>
      )}
    </div>
  )
}

/** A button styled to fit inside a notice. */
export function NoticeButton({
  children,
  onClick,
}: {
  children: ReactNode
  onClick: () => unknown
}) {
  return (
    <button type="button" className={styles.button} onClick={onClick}>
      {children}
    </button>
  )
}
