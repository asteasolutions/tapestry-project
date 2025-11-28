import { useParams } from 'react-router'
import { InteractionMode } from '../pages/tapestry/view-model'
import { tapestryPath } from '../utils/paths'

export interface TapestryPathParams {
  username: string
  slug: string
  edit: string
}

export function useTapestryPathParams(): TapestryPathParams {
  const { username, slug, edit } = useParams()

  return {
    username: username ?? '',
    slug: slug ?? '',
    edit: edit ?? '',
  }
}

export function useTapestryPath(mode: InteractionMode, query?: string): string {
  const { username, slug } = useTapestryPathParams()
  return tapestryPath(username, slug, mode, query)
}

export function useGenerateItemLink() {
  const { username, slug } = useTapestryPathParams()
  return (id: string) => {
    return `${window.origin}${tapestryPath(username, slug, 'view', `?focus=${id}`)}`
  }
}
