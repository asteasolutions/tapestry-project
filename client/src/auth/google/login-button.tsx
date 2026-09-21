import { useEffect, useRef } from 'react'
import styles from './styles.module.css'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'

interface GoogleLoginButtonProps {
  isSingleProvider?: boolean
}

export function GoogleLoginButton({ isSingleProvider = false }: GoogleLoginButtonProps) {
  const button = useRef<HTMLDivElement>(null)
  const isMobile = useResponsive() <= Breakpoint.SM
  const type = isMobile && isSingleProvider ? 'icon' : 'standard'

  useEffect(() => {
    if (button.current) {
      window.google.accounts.id.renderButton(button.current, {
        type,
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
        width: isMobile && type === 'standard' ? 200 : 380,
      })
    }
  }, [type, isMobile])

  return <div ref={button} className={styles.root} />
}
