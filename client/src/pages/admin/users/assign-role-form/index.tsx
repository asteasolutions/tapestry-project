import { FormEvent, useState } from 'react'
import { Button } from 'tapestry-core-client/src/components/lib/buttons/index'
import { UserRole } from 'tapestry-shared/src/data-transfer/resources/dtos/user'
import { resource } from '../../../../services/rest-resources'
import { Panel } from '../../components/panel'
import { Field, Select, TextInput } from '../../components/field'
import { Notice } from '../../components/notice'
import { ErrorText } from '../../components/error-text'
import { ROLE_OPTIONS } from '../role-select'
import styles from './styles.module.css'

/** Assigns a role to an existing user found by username or email. */
export function AssignRoleForm({ onAssigned }: { onAssigned: () => unknown }) {
  const [identifier, setIdentifier] = useState('')
  const [role, setRole] = useState<UserRole>('admin')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<unknown>()
  const [message, setMessage] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    const value = identifier.trim()
    if (!value) return
    setBusy(true)
    setError(undefined)
    setMessage('')
    try {
      const isEmail = value.includes('@')
      const { data } = await resource('adminUsers').list({
        filter: isEmail ? { 'email:istarts': value } : { 'username:eq': value },
        limit: 10,
      })
      const user = data.find((u) =>
        isEmail ? u.email?.toLowerCase() === value.toLowerCase() : u.username === value,
      )

      if (!user) {
        throw new Error(
          isEmail
            ? `Nobody has signed in with the email “${value}”.`
            : `There is no user with the username “${value}”.`,
        )
      }
      await resource('adminUsers').update({ id: user.id }, { role })
      setMessage(`@${user.username} is now ${role === 'admin' ? 'an admin' : 'a regular user'}.`)
      setIdentifier('')
      onAssigned()
    } catch (e) {
      setError(e instanceof Error && !('data' in e) ? e.message : e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Panel title="Assign a role" subtitle="The person must have signed in at least once.">
      <form className={styles.form} onSubmit={submit}>
        <Field label="Username or email" grow={2}>
          <TextInput
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="jane or jane@example.com"
          />
        </Field>
        <Field label="Role">
          <Select<UserRole> value={role} onChange={setRole} options={ROLE_OPTIONS} />
        </Field>
        <Button type="submit" disabled={busy || !identifier.trim()}>
          Assign
        </Button>
      </form>
      {message && (
        <Notice tone="success" onDismiss={() => setMessage('')}>
          {message}
        </Notice>
      )}
      <ErrorText error={error} />
    </Panel>
  )
}
