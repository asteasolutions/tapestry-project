import { useEffect, useRef } from 'react'
import styles from './styles.module.css'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { useOnline } from '../../services/api'

export function GoogleLoginButton() {
  const button = useRef<HTMLDivElement>(null)

  const type = useResponsive() <= Breakpoint.SM ? 'icon' : 'standard'

  const online = useOnline() === 'online'

  useEffect(() => {
    if (button.current && online) {
      window.google.accounts.id.renderButton(button.current, {
        type,
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
      })
    }
  }, [type, online])

  return <div ref={button} className={styles.root} />
}
