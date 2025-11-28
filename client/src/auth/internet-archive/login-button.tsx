import { useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { IALoginDialog } from './login-dialog'

export function IALoginButton() {
  const [showDialog, setShowDialog] = useState(false)

  function close() {
    setShowDialog(false)
  }

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>Log in</Button>
      {showDialog && <IALoginDialog onClose={close} />}
    </>
  )
}
