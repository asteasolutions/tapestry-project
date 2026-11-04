import { useState } from 'react'
import { Toggle } from 'tapestry-core-client/src/components/lib/toggle/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  AdminTapestryDto,
  AdminTapestryUpdateDto,
  SHARING_LEVELS,
  SharingLevel,
} from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { resource } from '../../../services/rest-resources'
import { ConfirmDeletionModal, ErrorText, NativeSelect } from '../components'
import { SHARING_LEVEL_LABELS } from '../format'
import styles from '../styles.module.css'

interface PendingChange {
  update: AdminTapestryUpdateDto
  title: string
  message: string
}

function confirmationFor(
  tapestry: AdminTapestryDto,
  update: AdminTapestryUpdateDto,
): PendingChange | null {
  const messages: string[] = []
  if (update.sharingLevel && update.sharingLevel !== 'link' && tapestry.featured) {
    messages.push('It is featured, so it will leave the Gallery immediately.')
  }
  if (update.sharingLevel === 'owner' && tapestry.sharingLevel === 'invited') {
    messages.push(
      'Everyone who was invited will lose access, and the invitation link will stop working.',
    )
  }
  if (update.featured && tapestry.sharingLevel !== 'link') {
    messages.push(
      'Featured tapestries are shared with anyone with the link, so its sharing will change.',
    )
  }
  if (messages.length === 0) return null

  return {
    update,
    title: update.featured ? 'Feature this tapestry?' : 'Restrict sharing?',
    message: messages.join(' '),
  }
}

interface SharingControlsProps {
  tapestry: AdminTapestryDto
  onUpdated: (tapestry: AdminTapestryDto) => unknown
  compact?: boolean
}

/** Changes the sharing level and the featured flag of a tapestry, confirming risky changes. */
export function SharingControls({ tapestry, onUpdated, compact }: SharingControlsProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [pending, setPending] = useState<PendingChange | null>(null)

  async function apply(update: AdminTapestryUpdateDto) {
    setBusy(true)
    setError(undefined)
    try {
      onUpdated(await resource('adminTapestries').update({ id: tapestry.id }, update))
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  function request(update: AdminTapestryUpdateDto) {
    const confirmation = confirmationFor(tapestry, update)
    if (confirmation) {
      setPending(confirmation)
    } else {
      void apply(update)
    }
  }

  const options = SHARING_LEVELS.map((level) => ({
    value: level,
    label: SHARING_LEVEL_LABELS[level],
  })).filter(
    // "Invited people" is only possible if somebody has been invited
    (option) => option.value !== 'invited' || tapestry.sharingLevel === 'invited',
  )

  return (
    <div className={styles.actions} style={compact ? { flexWrap: 'nowrap' } : undefined}>
      <NativeSelect<SharingLevel>
        ariaLabel={`Sharing level of ${tapestry.title}`}
        value={tapestry.sharingLevel}
        options={options}
        disabled={busy}
        onChange={(sharingLevel) => request({ sharingLevel })}
      />
      <Toggle
        label={<Text variant="bodySm">Featured</Text>}
        isChecked={tapestry.featured}
        disabled={busy}
        onChange={() => request({ featured: !tapestry.featured })}
      />
      <ErrorText error={error} />
      {pending && (
        <SimpleModal
          title={pending.title}
          cancel={{ onClick: () => setPending(null) }}
          confirm={{
            text: 'Continue',
            onClick: () => {
              setPending(null)
              void apply(pending.update)
            },
          }}
        >
          <Text component="p" style={{ maxWidth: 480 }}>
            “{tapestry.title}”: {pending.message}
          </Text>
        </SimpleModal>
      )}
    </div>
  )
}

export function DeleteTapestryDialog({
  tapestry,
  onDeleted,
  onCancel,
}: {
  tapestry: AdminTapestryDto
  onDeleted: () => unknown
  onCancel: () => unknown
}) {
  return (
    <ConfirmDeletionModal
      title="Delete tapestry permanently"
      confirmationWord="delete"
      confirmText="Delete tapestry"
      onCancel={onCancel}
      onConfirm={async () => {
        await resource('adminTapestries').destroy({ id: tapestry.id })
        onDeleted()
      }}
    >
      <Text component="p">
        You are about to delete the tapestry <strong>“{tapestry.title}”</strong> owned by{' '}
        <strong>{tapestry.owner.username}</strong>, including all of its{' '}
        {tapestry.itemCount === 1 ? '1 item' : `${tapestry.itemCount} items`}, connections, groups
        and comments.
      </Text>
      {tapestry.featured && <Text component="p">It will also be removed from the Gallery.</Text>}
      {tapestry.pendingFeatureRequestId && (
        <Text component="p">Its pending feature request will be closed.</Text>
      )}
    </ConfirmDeletionModal>
  )
}
