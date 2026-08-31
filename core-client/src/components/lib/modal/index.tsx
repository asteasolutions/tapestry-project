import { ReactNode, RefObject } from 'react'
import ReactModal, { Styles } from 'react-modal'
import { Button, ButtonProps, IconButton } from '../buttons/index.js'
import styles from './styles.module.css'
import { Text } from '../text/index.js'
import clsx from 'clsx'
import { omit } from 'lodash-es'

ReactModal.setAppElement('#root')

export interface ModalProps {
  title?: ReactNode
  children: ReactNode
  onClose: () => unknown
  compact?: boolean
  classes?: {
    overlay?: string
    root?: string
  }
  ariaHideApp?: boolean
  onMinimize?: () => unknown
  closable?: boolean
  contentRef?: RefObject<HTMLDivElement | null>
  style?: Styles
}

export function Modal({
  title,
  children,
  onClose,
  classes: { overlay, root } = {},
  compact = false,
  ariaHideApp,
  onMinimize,
  closable = true,
  contentRef,
  style,
}: ModalProps) {
  return (
    <ReactModal
      isOpen
      ariaHideApp={ariaHideApp}
      shouldCloseOnEsc={closable}
      shouldCloseOnOverlayClick={closable}
      onRequestClose={onClose}
      className={clsx('modal', { 'modal-compact': compact }, root)}
      overlayClassName={clsx(styles.root, overlay)}
      style={style}
    >
      <div className="modal-wrapper">
        <div className="modal-title-bar">
          {typeof title === 'string' ? <Text variant="h6">{title}</Text> : (title ?? <span />)}
          <div style={{ display: 'flex' }}>
            {onMinimize && (
              <IconButton
                icon="minimize"
                aria-label="Minimize popup"
                onClick={onMinimize}
                tooltip={{ side: 'bottom', children: 'Minimize' }}
              />
            )}
            <IconButton
              icon="close"
              aria-label="Close popup"
              disabled={!closable}
              onClick={onClose}
              tooltip={{ side: 'bottom', children: 'Close' }}
            />
          </div>
        </div>
        <div className="modal-content" ref={contentRef}>
          {children}
        </div>
      </div>
    </ReactModal>
  )
}

type CancelButtonProps = Omit<ButtonProps, 'onClick'> & { onClick: () => unknown; text?: string }
type ConfirmButtonProps = Omit<ButtonProps, 'onClick' | 'form'> &
  ({ onClick: () => unknown } | { form: string }) & { text?: string }

interface SimpleModalProps extends Omit<ModalProps, 'onClose'> {
  confirm?: ConfirmButtonProps
  cancel: CancelButtonProps
  extraButtons?: ReactNode
  onClose?: () => unknown
}

export function SimpleModal({
  confirm,
  cancel,
  children,
  onClose = cancel.onClick,
  extraButtons,
  classes: { overlay, root } = {},
  ...modalProps
}: SimpleModalProps) {
  return (
    <Modal
      {...modalProps}
      onClose={onClose}
      classes={{ root: clsx(styles.simpleModal, root), overlay }}
    >
      <div className="simple-modal-content-container">{children}</div>
      <hr className={styles.separator} />
      <div className="simple-modal-buttons-container">
        {extraButtons}
        <Button variant="secondary" {...omit(cancel, 'text')}>
          {cancel.text ?? 'Cancel'}
        </Button>
        {confirm && (
          <Button variant="primary" {...omit(confirm, 'text')}>
            {confirm.text ?? 'OK'}
          </Button>
        )}
      </div>
    </Modal>
  )
}
