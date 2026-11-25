import ReactModal from 'react-modal'
import { Link } from 'react-router'
import clsx from 'clsx'
import { IconButton, MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon'
import Logo from '../../../../assets/icons/logo-large.svg?react'
import styles from './styles.module.css'

export interface NavButton {
  to: string
  label: string
  active: boolean
  tracking?: Record<string, string>
}

interface MobileNavDrawerProps {
  isOpen: boolean
  buttons: NavButton[]
  onClose: () => unknown
}

const ANIMATION_MS = 200

/** A side menu that slides in from the left with the main navigation links on small screens. */
export function MobileNavDrawer({ isOpen, buttons, onClose }: MobileNavDrawerProps) {
  return (
    <ReactModal
      isOpen={isOpen}
      onRequestClose={onClose}
      shouldCloseOnEsc
      shouldCloseOnOverlayClick
      closeTimeoutMS={ANIMATION_MS}
      className={{ base: styles.drawer, afterOpen: styles.open, beforeClose: styles.closing }}
      overlayClassName={{
        base: styles.overlay,
        afterOpen: styles.open,
        beforeClose: styles.closing,
      }}
      contentLabel="Navigation menu"
    >
      <div className={styles.header}>
        <Link to="/" aria-label="Tapestries home" className={styles.logo} onClick={onClose}>
          <SvgIcon Icon={Logo} width={130} />
        </Link>
        <IconButton icon="close" aria-label="Close navigation menu" onClick={onClose} />
      </div>
      <nav className={styles.links}>
        {buttons.map((b) => (
          <MenuItemButton
            key={b.to}
            to={b.to}
            component={Link}
            {...b.tracking}
            className={clsx({ [styles.active]: b.active })}
            onClick={onClose}
          >
            {b.label}
          </MenuItemButton>
        ))}
      </nav>
    </ReactModal>
  )
}
