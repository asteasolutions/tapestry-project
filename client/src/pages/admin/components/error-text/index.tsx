import { Notice } from '../notice'
import { describeError } from '../../../../errors'

/** Shows an error returned by the server, if any. */
export function ErrorText({ error }: { error: unknown }) {
  if (!error) {
    return null
  }
  return <Notice tone="error">{describeError(error)}</Notice>
}
