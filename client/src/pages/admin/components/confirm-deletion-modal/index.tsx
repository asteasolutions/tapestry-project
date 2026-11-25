import { ReactNode, useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { ErrorText } from '../error-text'
import { Field, TextInput } from '../field'
import styles from './styles.module.css'
import { useAsyncAction } from 'tapestry-core-client/src/components/lib/hooks/use-async-action'

interface ConfirmDeletionModalProps {
  title: string
  children: ReactNode
  /** When set, the admin has to type this word to confirm */
  confirmationWord?: string
  confirmText?: string
  /** Shown under the confirmation field */
  note?: ReactNode
  onConfirm: () => Promise<unknown>
  onCancel: () => unknown
}

export function ConfirmDeletionModal({
  title,
  children,
  confirmationWord,
  confirmText = 'Delete permanently',
  note,
  onConfirm,
  onCancel,
}: ConfirmDeletionModalProps) {
  const [typed, setTyped] = useState('')

  const { loading, error, trigger } = useAsyncAction(onConfirm)

  const confirmed = !confirmationWord || typed.trim().toLowerCase() === confirmationWord

  return (
    <SimpleModal
      title={title}
      cancel={{ onClick: onCancel, disabled: loading }}
      confirm={{
        text: loading ? 'Deleting…' : confirmText,
        variant: 'primary-negative',
        disabled: !confirmed || loading,
        onClick: trigger,
      }}
    >
      <div className={styles.root}>
        {children}
        <p className={styles.warning}>This can’t be undone.</p>
        {confirmationWord && (
          <Field label={`Type “${confirmationWord}” to confirm`}>
            <TextInput
              value={typed}
              autoComplete="off"
              autoFocus
              onChange={(e) => setTyped(e.target.value)}
            />
          </Field>
        )}
        {note && <p className={styles.note}>{note}</p>}
        <ErrorText error={error} />
      </div>
    </SimpleModal>
  )
}
