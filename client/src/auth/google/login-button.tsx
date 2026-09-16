import { useEffect, useRef } from 'react'
import styles from './styles.module.css'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'
import { config } from '../../config'
import { auth } from '..'

interface GSILoginResponse {
  credential: string
}

export function GoogleLoginButton() {
  const button = useRef<HTMLDivElement>(null)

  const type = useResponsive() <= Breakpoint.SM ? 'icon' : 'standard'

  useEffect(() => {
    window.google.accounts.id.initialize({
      client_id: config.googleClientId,
      context: 'signin',
      ux_mode: 'popup',
      callback: async (response: GSILoginResponse) => {
        await auth.login({ authType: 'gsi', gsiCredential: response.credential })
      },
      auto_select: true,
      itp_support: true,
      use_fedcm_for_prompt: true,
    })
  }, [])

  useEffect(() => {
    if (button.current) {
      window.google.accounts.id.renderButton(button.current, {
        type,
        shape: 'rectangular',
        theme: 'outline',
        text: 'continue_with',
        size: 'large',
        logo_alignment: 'left',
        width: 380,
      })
    }
  }, [type])

  return <div ref={button} className={styles.root} />
}
