import { Modal } from 'tapestry-core-client/src/components/lib/modal/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import Logo from 'tapestry-core-client/src/assets/icons/logo.svg?react'
import { ReactNode } from 'react'
import clsx from 'clsx'

interface PromptDialogProps {
  onClose: () => unknown
  title: ReactNode
  subtitle?: ReactNode
  compact?: boolean
  children: ReactNode
}

export function PromptDialog({ onClose, title, subtitle, compact, children }: PromptDialogProps) {
  return (
    <Modal onClose={onClose}>
      <div className={clsx(styles.container, { compact })}>
        <div className={styles.iconContainer}>
          <SvgIcon Icon={Logo} size={28}></SvgIcon>
        </div>
        <Text variant="h5" style={{ fontWeight: 600, textAlign: 'center' }}>
          {title}
        </Text>
        {subtitle && <Text style={{ textAlign: 'center' }}>{subtitle}</Text>}
        <div className={styles.content}>{children}</div>
      </div>
    </Modal>
  )
}
