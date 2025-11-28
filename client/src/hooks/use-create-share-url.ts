import { MediaParams } from 'tapestry-core-client/src/components/tapestry/hooks/use-media-params'
import { tapestryPath } from '../utils/paths'
import { useTapestryPathParams } from './use-tapestry-path'

export function useCreateShareUrl(itemId: string) {
  const { edit, slug, username } = useTapestryPathParams()
  return ({ autoplay, startTime, stopTime }: MediaParams) => {
    const search = new URLSearchParams({
      focus: itemId,
      autoplay: `${autoplay}`,
      ...(startTime ? { startTime: `${startTime}` } : {}),
      ...(stopTime ? { stopTime: `${stopTime}` } : {}),
    })

    return `${window.origin}${tapestryPath(username, slug, edit === 'edit' ? 'edit' : 'view', `?${search.toString()}`)}`
  }
}
