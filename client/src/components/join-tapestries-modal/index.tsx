import { LoginButton } from '../../auth'
import { PromptDialog } from '../prompt-dialog'

interface JoinTapestriesModalProps {
  onClose: () => unknown
}

export function JoinTapestriesModal({ onClose }: JoinTapestriesModalProps) {
  return (
    <PromptDialog
      title="Join Tapestries to Continue"
      subtitle="Sign in in seconds and keep creating—it's free!"
      onClose={onClose}
    >
      <LoginButton />
    </PromptDialog>
  )
}
