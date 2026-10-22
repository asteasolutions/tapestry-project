import { useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import IALogo from '../../assets/icons/ia-logo-circle-grey.svg?react'
import { IALoginDialog } from './login-dialog'
import styles from './styles.module.css'
import { Breakpoint, useResponsive } from '../../providers/responsive-provider'

export function IALoginButton() {
  const [dialogOpen, setDialogOpen] = useState(false)
  const smOrLess = useResponsive() <= Breakpoint.SM

  return (
    <>
      <Button className={styles.iaButton} variant="outline" onClick={() => setDialogOpen(true)}>
        <SvgIcon Icon={IALogo} size={20} />
        <Text>{smOrLess ? 'Log in' : 'Continue with Internet Archive'}</Text>
      </Button>

      {dialogOpen && (
        <IALoginDialog
          onClose={() => setDialogOpen(false)}
          title={smOrLess ? 'Log in with Internet Archive' : undefined}
        />
      )}
    </>
  )
}
