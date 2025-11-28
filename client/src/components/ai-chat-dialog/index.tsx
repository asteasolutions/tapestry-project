import clsx from 'clsx'
import { AIChat } from '../ai-chat'
import { Modal, ModalProps } from 'tapestry-core-client/src/components/lib/modal/index'
import styles from './styles.module.css'

export function AIChatDialog({
  classes: { root, overlay } = {},
  ...props
}: Omit<ModalProps, 'children'>) {
  return (
    <Modal classes={{ root: clsx(styles.root, root), overlay }} {...props}>
      <AIChat />
    </Modal>
  )
}
