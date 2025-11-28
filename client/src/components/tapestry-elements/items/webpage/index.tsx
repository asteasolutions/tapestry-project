import { memo, useRef, useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useAsync } from 'tapestry-core-client/src/components/lib/hooks/use-async'
import { usePropRef } from 'tapestry-core-client/src/components/lib/hooks/use-prop-ref'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import { SimpleModal } from 'tapestry-core-client/src/components/lib/modal/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import {
  ALLOWED_ORIGINS,
  getPlaybackInterval,
  WebFrameProps,
  WebpageItemViewer,
  WebpageItemViewerApi,
} from 'tapestry-core-client/src/components/tapestry/items/webpage/viewer'
import { parseWebSource, WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources'
import { WebpageItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { fetchWBMSnapshots } from '../../../../lib/internet-archive'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { resource } from '../../../../services/rest-resources'
import { TimeInput } from '../../../time-input'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'
import styles from './styles.module.css'

const checkedSources = new Map<string, boolean>()

function Webpage({ src, onLoad, ...props }: WebFrameProps) {
  const onLoadRef = usePropRef(onLoad)
  const interactionMode = useTapestryData('interactionMode')
  const checkCanFrame = interactionMode === 'edit'

  const { data: canFrame } = useAsync(
    async ({ signal }) => {
      if (!checkCanFrame || ALLOWED_ORIGINS.includes(new URL(src).origin)) {
        return true
      }

      if (checkedSources.has(src)) {
        return checkedSources.get(src)
      }

      let result: boolean
      try {
        const canFrameResponse = await resource('proxy').create(
          { type: 'can-frame', url: src },
          undefined,
          { signal },
        )
        result = canFrameResponse.result as boolean
      } catch (error) {
        console.warn(`Error when framing "${src}"`, error)
        result = false
      }
      if (!result) {
        onLoadRef.current()
      }
      checkedSources.set(src, result)
      return result
    },
    [checkCanFrame, src, onLoadRef],
  )

  return canFrame ? (
    <iframe src={src} onLoad={onLoad} {...props} />
  ) : canFrame === false ? (
    <div className={styles.error}>
      <Icon icon="sentiment_very_dissatisfied" />
      <Text>{`Cannot frame ${src}`}</Text>
    </div>
  ) : null
}

export const WebpageItem = memo(({ id }: TapestryItemProps) => {
  const apiRef = useRef<WebpageItemViewerApi>(null)
  const dto = useTapestryData(`items.${id}.dto`) as WebpageItemDto
  const interactionMode = useTapestryData('interactionMode')
  const dispatch = useDispatch()
  const isEditMode = interactionMode === 'edit'
  const webSourceParams = parseWebSource(dto)
  const { startTime, stopTime } = getPlaybackInterval(webSourceParams)
  const [showSaveToWBMPrompt, setShowSaveToWBMPrompt] = useState(false)
  const [isLoadingWBMSnapshots, setIsLoadingWBMSnapshots] = useState(false)

  function switchToWBM() {
    dispatch(
      updateItem(id, {
        dto: {
          webpageType: 'iaWayback',
          source: WEB_SOURCE_PARSERS.iaWayback.construct({
            source: webSourceParams.source,
          }),
        },
      }),
    )
  }

  async function trySwitchToWBM() {
    setIsLoadingWBMSnapshots(true)
    try {
      const snapshots = await fetchWBMSnapshots(webSourceParams.source, 1)
      if (snapshots.length > 0) {
        switchToWBM()
      } else {
        setShowSaveToWBMPrompt(true)
      }
    } finally {
      setIsLoadingWBMSnapshots(false)
    }
  }

  const { toolbar } = useItemToolbar(id, {
    items: [
      isEditMode && {
        element: isLoadingWBMSnapshots ? (
          <LoadingSpinner style={{ alignSelf: 'center' }} size="16px" />
        ) : (
          <IconButton
            icon="account_balance"
            aria-label="Switch to Wayback Machine version"
            onClick={trySwitchToWBM}
          />
        ),
        tooltip: { side: 'bottom', children: 'Switch to Wayback Machine version' },
      },
      isEditMode && 'separator',
      {
        element: (
          <IconButton
            icon="refresh"
            aria-label="Refresh this webpage"
            onClick={() => apiRef.current?.reload()}
          />
        ),
        tooltip: { side: 'bottom', children: 'Refresh this webpage' },
      },
    ],
    moreMenuItems:
      webSourceParams.webpageType === 'youtube' || webSourceParams.webpageType === 'vimeo'
        ? [
            <TimeInput
              onChange={(value) => {
                dispatch(
                  updateItem(id, {
                    dto: {
                      source: WEB_SOURCE_PARSERS[webSourceParams.webpageType].construct({
                        ...webSourceParams,
                        startTime: value,
                      }),
                    },
                  }),
                )
              }}
              text="Video start at"
              value={startTime ?? null}
              max={stopTime ?? Infinity}
            />,
            <TimeInput
              onChange={(value) =>
                dispatch(
                  updateItem(id, {
                    dto: {
                      source: WEB_SOURCE_PARSERS[webSourceParams.webpageType].construct({
                        ...webSourceParams,
                        stopTime: value,
                      }),
                    },
                  }),
                )
              }
              text="Video stop at"
              value={stopTime ?? null}
              min={startTime ?? 0}
            />,
          ]
        : webSourceParams.webpageType === 'iaVideo' || webSourceParams.webpageType === 'iaAudio'
          ? [
              <TimeInput
                onChange={(value) =>
                  dispatch(
                    updateItem(id, {
                      dto: {
                        source: WEB_SOURCE_PARSERS[webSourceParams.webpageType].construct({
                          ...webSourceParams,
                          startTime: value,
                        }),
                      },
                    }),
                  )
                }
                text="Playback start at"
                value={startTime ?? null}
              />,
            ]
          : undefined,
  })

  return (
    <>
      <TapestryItem id={id} halo={toolbar}>
        <WebpageItemViewer id={id} WebFrame={Webpage} apiRef={apiRef} />
      </TapestryItem>
      {showSaveToWBMPrompt && (
        <SimpleModal
          title="This page hasn't been archived yet"
          cancel={{ onClick: () => setShowSaveToWBMPrompt(false) }}
          confirm={{
            text: 'Yes, index this page',
            onClick: async () => {
              await resource('proxy').create({
                type: 'create-wbm-snapshot',
                url: webSourceParams.source,
              })
              switchToWBM()
              setShowSaveToWBMPrompt(false)
            },
          }}
        >
          <Text>
            We couldn't find an archived version of this page.
            <br />
            Would you like us to index it so it's available as soon as possible?
          </Text>
        </SimpleModal>
      )}
    </>
  )
})
