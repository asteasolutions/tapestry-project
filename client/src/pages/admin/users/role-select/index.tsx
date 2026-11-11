import { useState } from 'react'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { AdminUserDto } from 'tapestry-shared/src/data-transfer/resources/dtos/admin'
import { UserRole } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { resource } from '../../../../services/rest-resources'
import { useSession } from '../../../../layouts/session'
import { auth } from '../../../../auth'
import { Select } from '../../components/field'
import { ErrorText } from '../../components/error-text'
import styles from './styles.module.css'

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: 'user', label: 'Regular user' },
  { value: 'admin', label: 'Admin' },
]

/** Changes a user's role, asking for confirmation before admins remove their own role. */
export function RoleSelect({
  user,
  onUpdated,
}: {
  user: AdminUserDto
  onUpdated: (u: AdminUserDto) => unknown
}) {
  const currentUser = useSession().user
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [confirmingSelfDemotion, setConfirmingSelfDemotion] = useState(false)
  const isSelf = currentUser?.id === user.id

  async function setRole(role: UserRole) {
    setBusy(true)
    setError(undefined)
    try {
      onUpdated(await resource('adminUsers').update({ id: user.id }, { role }))
      if (isSelf) {
        // Reload the session so that the admin panel is hidden right away
        await auth.refresh(true)
      }
    } catch (e) {
      setError(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.root}>
      <Select<UserRole>
        aria-label={`Role of ${user.username}`}
        value={user.role}
        options={ROLE_OPTIONS}
        disabled={busy}
        onChange={(role) => {
          if (isSelf && role !== 'admin') setConfirmingSelfDemotion(true)
          else void setRole(role)
        }}
      />
      <ErrorText error={error} />
      {confirmingSelfDemotion && (
        <SimpleModal
          title="Remove your admin role?"
          cancel={{ onClick: () => setConfirmingSelfDemotion(false) }}
          confirm={{
            text: 'Remove my admin role',
            variant: 'primary-negative',
            onClick: () => {
              setConfirmingSelfDemotion(false)
              void setRole('user')
            },
          }}
        >
          <p className={styles.message}>You will immediately lose access to the admin panel.</p>
        </SimpleModal>
      )}
    </div>
  )
}
