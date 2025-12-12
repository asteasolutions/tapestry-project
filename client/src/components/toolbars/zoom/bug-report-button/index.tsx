import { omit } from 'lodash-es'
import { config } from '../../../../config'
import { browser } from 'tapestry-core-client/src/lib/user-agent'
import { MenuItemButton } from 'tapestry-core-client/src/components/lib/buttons'
import { useSession } from '../../../../layouts/session'
import { useTapestryStore } from '../../../../pages/tapestry/tapestry-providers'
import { TapestryEditorStore } from '../../../../pages/tapestry/view-model'

interface BugReportButtonProps {
  onClick?: () => unknown
}

function bugReportHandler(store: TapestryEditorStore, userId: string | undefined) {
  const tapestry = store.get()
  const {
    browser: { name: browserName, version: browserVersion },
    os: { name: osName, version: osVersion },
  } = browser
  const tapestryInformation = {
    tapestryId: tapestry.id,
    userId,
    viewModel: omit(tapestry, ['items', 'rels', 'groups', 'presentationSteps']),
  }
  window.open(
    config.bugReportFormUrl
      .replace(':browserName', encodeURIComponent(browserName ?? ''))
      .replace(':browserVersion', encodeURIComponent(browserVersion ?? ''))
      .replace(':operatingSystem', encodeURIComponent(`${osName} ${osVersion}`))
      .replace(':tapestryInformation', encodeURIComponent(JSON.stringify(tapestryInformation))),
  )
}

export function BugReportButton({ onClick }: BugReportButtonProps) {
  const { user } = useSession()
  const store = useTapestryStore()

  return (
    <MenuItemButton
      icon="call"
      onClick={() => {
        bugReportHandler(store, user?.id)
        onClick?.()
      }}
    >
      Contact us
    </MenuItemButton>
  )
}
