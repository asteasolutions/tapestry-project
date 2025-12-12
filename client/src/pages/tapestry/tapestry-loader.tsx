import { pick } from 'lodash-es'
import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { TapestryConfig, TapestryConfigContext } from 'tapestry-core-client/src/components/tapestry'
import { createStoreHooks, createUseStoreHook } from 'tapestry-core-client/src/lib/store/provider'
import { SnackbarData } from 'tapestry-core-client/src/view-model'
import { auth } from '../../auth'
import { ItemInfoModal } from '../../components/item-info-modal'
import { LoadingLogo } from '../../components/loading-logo'
import { ActionButtonItem } from '../../components/tapestry-elements/items/action-button'
import { AudioItem } from '../../components/tapestry-elements/items/audio'
import { BookItem } from '../../components/tapestry-elements/items/book'
import { ImageItem } from '../../components/tapestry-elements/items/image'
import { PdfItem } from '../../components/tapestry-elements/items/pdf'
import { TextItem } from '../../components/tapestry-elements/items/text'
import { VideoItem } from '../../components/tapestry-elements/items/video'
import { WaybackPageItem } from '../../components/tapestry-elements/items/wayback-page'
import { WebpageItem } from '../../components/tapestry-elements/items/webpage'
import { Multiselection } from '../../components/tapestry-elements/multiselection'
import { Rel } from '../../components/tapestry-elements/rel'
import { APIError } from '../../errors'
import { useTapestryPath } from '../../hooks/use-tapestry-path'
import { UserAccess, userAccess } from '../../model/data/utils'
import { resource } from '../../services/rest-resources'
import { dashboardPath } from '../../utils/paths'
import { Tapestry } from './tapestry'
import {
  TAPESTRY_DATA_SYNC_COMMANDS,
  TapestryDataSyncCommandsProvider,
  TapestryStoreContext,
} from './tapestry-providers'
import { InteractionMode } from './view-model'
import { TapestryDataSync } from './view-model/tapestry-data-sync'

function getErrorMessage(error: unknown) {
  if (error instanceof APIError) {
    if (error.data.name === 'ForbiddenError') {
      return 'You cannot access this tapestry'
    }
    if (error.data.name === 'NotFoundError') {
      return 'Tapestry not found'
    }
  }
  return 'Error loading tapestry'
}

async function determineUserAccess(
  tapestryId: string,
  userId: string | undefined,
  signal: AbortSignal,
): Promise<UserAccess> {
  const tapestry = await resource('tapestries').read(
    { id: tapestryId },
    { include: ['userAccess'] },
    { signal },
  )

  return userAccess(tapestry, userId)
}

export interface TapestryLoaderProps {
  id: string
  mode: InteractionMode
}

export function TapestryLoader({ id, mode }: TapestryLoaderProps) {
  const navigate = useNavigate()
  const tapestryViewPath = useTapestryPath('view')
  const { user } = useObservable(auth)

  const config = useMemo(
    (): TapestryConfig => ({
      ...createStoreHooks(createUseStoreHook(TapestryStoreContext, 'base')),
      components: {
        ActionButtonItem,
        AudioItem,
        BookItem,
        ImageItem,
        PdfItem,
        TextItem,
        VideoItem,
        WebpageItem: {
          default: WebpageItem,
          iaWayback: WaybackPageItem,
        },
        Rel,
        Multiselection,
        ItemInfoModal,
      },
    }),
    [],
  )

  useEffect(() => {
    if (id && user) {
      void resource('tapestryInteractions').create({
        tapestryId: id,
        lastSeen: new Date(),
      })
    }
  }, [id, user])

  const {
    data: tapestryDataSync,
    loading,
    error,
  } = useAsync(
    async ({ signal }, onCleanup) => {
      if (!id) return

      const userAccess = await determineUserAccess(id, user?.id, signal)

      const canEdit = userAccess === 'edit'

      if (mode === 'edit' && !canEdit) {
        void navigate(tapestryViewPath)
      }

      const dataSync = new TapestryDataSync(id, canEdit ? mode : 'view', userAccess)
      onCleanup(() => dataSync.dispose())

      await dataSync.init(signal)

      return dataSync
    },
    // We want to refetch the tapestry when the session expires (and therefore the user id gets nullified)
    // We do not want to reload the tapestry when the view/edit param changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, user?.id],
  )

  if (error) {
    return (
      <Navigate
        to={dashboardPath('home')}
        replace
        state={{ text: getErrorMessage(error), variant: 'error' } as SnackbarData}
      />
    )
  }

  if (!id || loading) {
    return <LoadingLogo />
  }

  if (!tapestryDataSync) {
    return 'Tapestry not found'
  }

  return (
    <TapestryDataSyncCommandsProvider
      commands={pick(tapestryDataSync, TAPESTRY_DATA_SYNC_COMMANDS)}
    >
      <TapestryStoreContext value={tapestryDataSync.store}>
        <TapestryConfigContext value={config}>
          <Tapestry />
        </TapestryConfigContext>
      </TapestryStoreContext>
    </TapestryDataSyncCommandsProvider>
  )
}
