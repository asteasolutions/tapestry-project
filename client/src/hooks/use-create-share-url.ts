import { tapestryPath } from '../utils/paths'
import { useTapestryPathParams } from './use-tapestry-path'

export function useCreateShareUrl() {
  const { edit, slug, username } = useTapestryPathParams()
  return (params: () => URLSearchParams) => {
    return `${window.origin}${tapestryPath(username, slug, edit === 'edit' ? 'edit' : 'view', `?${params()}`)}`
  }
}
