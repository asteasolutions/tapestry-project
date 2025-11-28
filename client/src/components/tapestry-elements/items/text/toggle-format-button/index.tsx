import { useKeyboardShortcuts } from 'tapestry-core-client/src/components/lib/hooks/use-keyboard-shortcuts'
import { shortcutLabel } from 'tapestry-core-client/src/lib/keyboard-event'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { ShortcutLabel } from 'tapestry-core-client/src/components/lib/shortcut-label'
import { TooltipProps } from 'tapestry-core-client/src/components/lib/tooltip/index'

interface ToggleFormatButtonProps {
  formatting: boolean
  onClick: () => unknown
}

export function ToggleFormatButton({ formatting, onClick }: ToggleFormatButtonProps) {
  useKeyboardShortcuts({
    'alt + KeyF': () => {
      onClick()
    },
  })
  return (
    <IconButton
      aria-label="Toggle format toolbar"
      icon={formatting ? 'chevron_left' : 'match_case'}
      onClick={() => onClick()}
    />
  )
}

export const tooltip = (formatting: boolean): TooltipProps => ({
  side: 'bottom',
  children: (
    <ShortcutLabel text={formatting ? 'Back' : 'Format'}>{shortcutLabel('alt + F')}</ShortcutLabel>
  ),
})
