import { Location, Navigate, useLocation, useParams } from 'react-router'
import { TapestryLoader } from './tapestry-loader'
import { InteractionMode } from './view-model'
import { SnackbarData } from 'tapestry-core-client/src/view-model'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { resource } from '../../services/rest-resources'
import { dashboardPath, tapestryPath } from '../../utils/paths'
import { useTapestryPathParams } from '../../hooks/use-tapestry-path'
import { LoadingLogo } from '../../components/loading-logo'
import { useRef } from 'react'

interface TapestryIdState {
  tapestryId?: string
}

export function TapestryPage() {
  const { id, edit } = useParams()
  const location = useLocation()
  const mode: InteractionMode = edit === 'edit' ? 'edit' : 'view'

  const { data: tapestry, error } = useAsync(
    async ({ signal }) => {
      return resource('tapestries').read({ id: id ?? '' }, { include: ['owner'] }, { signal })
    },
    [id],
  )

  if (error) {
    return (
      <Navigate
        to={dashboardPath('home')}
        replace
        state={{ text: 'Tapestry not found', variant: 'error' } as SnackbarData}
      />
    )
  }

  if (tapestry) {
    return (
      <Navigate
        to={tapestryPath(tapestry.owner!.username, tapestry.slug, mode, location.search)}
        replace
        state={{ ...location.state, tapestryId: tapestry.id } as TapestryIdState}
      />
    )
  }

  return <LoadingLogo />
}

export function TapestryBySlugPage() {
  const { state } = useLocation() as Location<TapestryIdState | undefined>
  const { username, slug, edit } = useTapestryPathParams()
  const mode: InteractionMode = edit === 'edit' ? 'edit' : 'view'

  const cachedTapestryIdRef = useRef<string | undefined>(state?.tapestryId)

  if (state?.tapestryId && !cachedTapestryIdRef.current) {
    cachedTapestryIdRef.current = state.tapestryId
  }

  const { data: tapestryId, loading } = useAsync(
    async ({ signal }) => {
      if (cachedTapestryIdRef.current) {
        return cachedTapestryIdRef.current
      }

      const tapestry = await resource('tapestries').read(
        { id: `${username}/${slug}` },
        {},
        { signal },
      )

      cachedTapestryIdRef.current = tapestry.id
      return tapestry.id
    },
    [username, slug],
  )

  if (!loading && !(cachedTapestryIdRef.current ?? tapestryId)) {
    return (
      <Navigate
        to={dashboardPath('home')}
        replace
        state={{ text: 'Tapestry not found', variant: 'error' } as SnackbarData}
      />
    )
  }

  return <TapestryLoader id={cachedTapestryIdRef.current ?? tapestryId ?? ''} mode={mode} />
}
