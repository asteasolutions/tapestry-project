import { useEffect, useRef } from 'react'
import styles from './styles.module.css'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'

export function GoogleLoginButton() {
  const button = useRef<HTMLDivElement>(null)

  const type = useResponsive() <= Breakpoint.SM ? 'icon' : 'standard'

  useEffect(() => {
    if (button.current) {
      window.google.accounts.id.renderButton(button.current, {
        type,
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
      })
    }
  }, [type])

  return <div ref={button} className={styles.root} />
}
