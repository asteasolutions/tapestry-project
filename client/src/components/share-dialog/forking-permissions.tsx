import { TapestryDto } from 'tapestry-shared/src/data-transfer/resources/dtos/tapestry'
import { useSession } from '../../layouts/session'
import { Toggle } from 'tapestry-core-client/src/components/lib/toggle/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'
import { resource } from '../../services/rest-resources'
import clsx from 'clsx'

interface ForkingPermissionsProps {
  tapestry: TapestryDto
}

export function ForkingPermissions({ tapestry }: ForkingPermissionsProps) {
  const isOwner = useSession().user?.id === tapestry.ownerId
  const {
    perform: updateForkingPermissions,
    data: lastUpdatedTapestry,
    loading: updatingForkingPermissions,
  } = useAsyncAction(
    async ({ signal }, allowForking: TapestryDto['allowForking']) =>
      resource('tapestries').update({ id: tapestry.id }, { allowForking }, {}, { signal }),
    { clearDataOnReload: false },
  )

  const allowForking = lastUpdatedTapestry?.allowForking ?? tapestry.allowForking

  return (
    <div className={clsx(styles.forkingPermissions, { [styles.disabled]: !isOwner })}>
      <div>
        <Text component="div" style={{ fontWeight: 600 }}>
          Allow making a copy
        </Text>
        <Text component="div" variant="bodyXs">
          {isOwner
            ? 'Allow anyone to make their own editable copy'
            : 'Only the owner can change the copy permissions for viewers'}
        </Text>
      </div>
      <Toggle
        className={styles.toggle}
        disabled={!isOwner || updatingForkingPermissions}
        onChange={() => updateForkingPermissions(!allowForking)}
        isChecked={allowForking}
      />
    </div>
  )
}
