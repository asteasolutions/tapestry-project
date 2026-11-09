import { useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { SvgIcon } from 'tapestry-core-client/src/components/lib/svg-icon/index'
import BlueskyLogo from '../../assets/icons/bluesky-logo.svg?react'
import { BlueskyLoginDialog } from './login-dialog/index'
import styles from './styles.module.css'

export function BlueskyLoginButton() {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Button
        className={styles.blueskyButton}
        variant="outline"
        onClick={() => setDialogOpen(true)}
      >
        <SvgIcon Icon={BlueskyLogo} size={20} />
        <Text>Continue with Bluesky</Text>
      </Button>

      {dialogOpen && <BlueskyLoginDialog onClose={() => setDialogOpen(false)} />}
    </>
  )
}
