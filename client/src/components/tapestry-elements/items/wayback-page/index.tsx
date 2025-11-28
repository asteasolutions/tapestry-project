import { CanceledError } from 'axios'
import { intlFormat } from 'date-fns'
import { memo, useEffect, useMemo, useState } from 'react'
import { IconButton } from 'tapestry-core-client/src/components/lib/buttons/index'
import { useObservable } from 'tapestry-core-client/src/components/lib/hooks/use-observable'
import { Icon } from 'tapestry-core-client/src/components/lib/icon/index'
import { LoadingSpinner } from 'tapestry-core-client/src/components/lib/loading-spinner/index'
import { Text } from 'tapestry-core-client/src/components/lib/text/index'
import { WebpageLoader } from 'tapestry-core-client/src/components/tapestry/items/webpage/loader'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { determineWebpageType, WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources'
import { WebpageItemDto } from 'tapestry-shared/src/data-transfer/resources/dtos/item'
import { TapestryItemProps } from '..'
import { config } from '../../../../config'
import { fetchWBMSnapshots, WBMSnapshotWithDate } from '../../../../lib/internet-archive'
import { useDispatch, useTapestryData } from '../../../../pages/tapestry/tapestry-providers'
import { updateItem } from '../../../../pages/tapestry/view-model/store-commands/items'
import { Select } from '../../../select'
import { useItemToolbar } from '../../item-toolbar/use-item-toolbar'
import { TapestryItem } from '../tapestry-item'

interface WBMSnapshotsTrackerState {
  snapshots: WBMSnapshotWithDate[]
  isInitiallyLoaded: boolean
  hasError: boolean
}

class WBMSnapshotsTracker extends Observable<WBMSnapshotsTrackerState> {
  private url: string | undefined
  private limit: number | undefined
  private killSwitch: AbortController | undefined
  private timeout: number | undefined

  constructor() {
    super({ snapshots: [], isInitiallyLoaded: false, hasError: false })
  }

  start(url: string, limit?: number) {
    if (url === this.url && limit === this.limit) {
      return
    }

    this.stop()
    this.url = url
    this.limit = limit
    this.killSwitch ??= new AbortController()

    void this.poll()
  }

  stop() {
    this.killSwitch?.abort()
    window.clearTimeout(this.timeout)
    this.url = undefined
    this.limit = undefined
    this.killSwitch = undefined
    this.timeout = undefined
  }

  private async poll() {
    try {
      const snapshots = await fetchWBMSnapshots(this.url, this.limit, this.killSwitch?.signal)
      this.update((value) => {
        value.snapshots = snapshots
        value.isInitiallyLoaded = true
        value.hasError = false
      })
    } catch (error) {
      console.error('Error while fetching WBM snapshots', error)
      this.update((value) => {
        value.isInitiallyLoaded = true
        value.hasError = !(error instanceof CanceledError)
      })
    } finally {
      if (this.value.snapshots.length === 0 && !this.killSwitch?.signal.aborted) {
        this.timeout = window.setTimeout(() => this.poll(), config.wbmSnapshotPollingPeriod * 1000)
      }
    }
  }
}

function useWBMSnapshots(url: string | null, limit: number) {
  const tracker = useMemo(() => new WBMSnapshotsTracker(), [])
  const trackerState = useObservable(tracker)

  useEffect(() => {
    if (url) {
      tracker.start(url, limit)
    }
    return () => tracker.stop()
  }, [tracker, url, limit])

  return trackerState
}

export const WaybackPageItem = memo(({ id }: TapestryItemProps) => {
  const dto = useTapestryData(`items.${id}.dto`) as WebpageItemDto
  const { source: wbmSource } = dto
  const { source: originalSource, timestamp } = WEB_SOURCE_PARSERS.iaWayback.parse(wbmSource)
  const displayWebpage = useTapestryData(`items.${id}.hasBeenActive`)
  const interactionMode = useTapestryData('interactionMode')
  const dispatch = useDispatch()
  const isEditMode = interactionMode === 'edit'
  const [loading, setLoading] = useState(true)
  const [webpageReloadIndex, setWebpageReloadIndex] = useState(0)

  useEffect(() => setLoading(true), [wbmSource])

  const {
    snapshots,
    isInitiallyLoaded: snapshotsInitiallyLoaded,
    hasError: snapshotsError,
  } = useWBMSnapshots(isEditMode ? originalSource : null, 1000)

  const showSnapshots = snapshots.length > 0
  const snapshotOptions = snapshots.map(({ timestamp, date }) => ({
    value: timestamp,
    label: <Text variant="bodyXs">{intlFormat(date, { dateStyle: 'medium' })}</Text>,
  }))
  const { toolbar, closeSubmenu } = useItemToolbar(id, {
    items: [
      ...(isEditMode
        ? ([
            showSnapshots ? (
              <Select
                options={snapshotOptions}
                onChange={(option) =>
                  dispatch(
                    updateItem(id, {
                      dto: {
                        source: WEB_SOURCE_PARSERS.iaWayback.construct({
                          source: originalSource,
                          timestamp: option!.value,
                        }),
                      },
                    }),
                  )
                }
                onMenuOpen={() => closeSubmenu()}
                value={timestamp ?? undefined}
              />
            ) : !snapshotsInitiallyLoaded ? (
              <LoadingSpinner style={{ alignSelf: 'center' }} size="16px" />
            ) : null,
            (showSnapshots || !snapshotsInitiallyLoaded) && 'separator',
            {
              element: (
                <IconButton
                  icon="globe"
                  aria-label="Switch to original webpage"
                  onClick={async () =>
                    dispatch(
                      updateItem(id, {
                        dto: {
                          source: originalSource,
                          webpageType: await determineWebpageType(originalSource),
                        },
                      }),
                    )
                  }
                />
              ),
              tooltip: { side: 'bottom', children: 'Switch to original webpage' },
            },
            'separator',
          ] as const)
        : []),
      {
        element: (
          <IconButton
            icon="refresh"
            aria-label="Refresh this webpage"
            onClick={() => {
              setLoading(true)
              setWebpageReloadIndex((x) => x + 1)
            }}
          />
        ),
        tooltip: { side: 'bottom', children: 'Refresh this webpage' },
      },
    ],
  })

  const missingSnapshotsMessage =
    snapshotsInitiallyLoaded && snapshots.length === 0
      ? ({
          icon: snapshotsError ? 'error' : 'hourglass_top',
          text: snapshotsError ? (
            <>
              Error while communicating
              <br />
              with the Internet Archive
            </>
          ) : (
            <>Awaiting archive availability...</>
          ),
        } as const)
      : null

  return (
    <TapestryItem id={id} halo={toolbar}>
      {missingSnapshotsMessage && isEditMode ? (
        <div
          style={{
            display: 'grid',
            height: '100%',
            alignContent: 'center',
            gap: 8,
            color: 'var(--theme-text-tertiary)',
            textAlign: 'center',
          }}
        >
          <Icon icon={missingSnapshotsMessage.icon} style={{ fontSize: 48 }} />
          <Text>{missingSnapshotsMessage.text}</Text>
        </div>
      ) : (
        <WebpageLoader displayPage={displayWebpage} item={dto} pageLoading={loading}>
          <iframe
            src={wbmSource}
            onLoad={() => setLoading(false)}
            key={`reload-${webpageReloadIndex}`}
          />
        </WebpageLoader>
      )}
    </TapestryItem>
  )
})
