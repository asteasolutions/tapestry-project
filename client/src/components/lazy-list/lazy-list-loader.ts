import { ListResponseDto } from 'tapestry-shared/src/data-transfer/resources/dtos/common'
import { debounce, DebouncedFunc } from 'lodash'
import { Draft } from 'immer'
import { Observable } from 'tapestry-core-client/src/lib/events/observable'
import { CanceledError } from 'axios'

export interface LazyListLoaderConfig {
  /**
   * The number of elements that will typically be visible in the list. The lazy list loader will make sure to
   * load enough elements before and after this window to ensure fewer loading interruptions while scrolling.
   * It is safer to pass a larger number here than the actual number of visible elements. Default is 25.
   */
  windowSize: number
  /** The initial starting position of the "visible" window of elements. Default is 0. */
  initialWindowStart: number
  /**
   * The lazy list loader holds an array of loaded elements and it maintains a moving window of visible elements
   * controlled via the `moveWindow` method. When the moving window approaches the edge (start or end) of the loaded
   * elements, the loader loads more elements to extend the data array. The loadingEdgeProximity parameter is the
   * number elements between the edge of the visible window and the edge of the loaded data array that will trigger
   * additional data loads. Default is 5.
   */
  loadingEdgeProximity: number
  /**
   * Whether the list should be auto-reloaded periodically to fetch new data from the server. If a number is given,
   * it will be interpreted as the number of milliseconds between subsequent automatic reloads. Default is true.
   */
  autoReload: boolean | number
}

export type LazyListRequestItems<T> = (
  skip: number,
  limit: number,
  signal: AbortSignal,
) => Promise<ListResponseDto<T>>

type LoaderState = 'initial-load' | 'load-more' | 'reload' | 'idle' | 'new'

export class LazyListLoader<T> extends Observable<ListResponseDto<T> & { state: LoaderState }> {
  private loadingQueue: Promise<void> | null = null
  private killSwitch: AbortController | null = null
  private windowStart: number
  private readonly windowSize: number
  private readonly loadingEdgeProximity: number
  private readonly debounceReload: DebouncedFunc<(signal: AbortSignal) => Promise<void>> | null

  constructor(
    private requestItems: LazyListRequestItems<T>,
    {
      windowSize = 25,
      initialWindowStart = 0,
      loadingEdgeProximity = 5,
      autoReload = true,
    }: Partial<LazyListLoaderConfig> = {},
  ) {
    super({
      data: [],
      skip: Math.max(initialWindowStart - windowSize, 0),
      total: 0,
      state: 'new',
    })
    this.windowStart = initialWindowStart
    this.windowSize = windowSize
    this.loadingEdgeProximity = loadingEdgeProximity

    this.debounceReload = autoReload
      ? debounce(
          (signal: AbortSignal) => this.enqueueRequest(this.doReload, 'reload', signal),
          typeof autoReload === 'number' ? autoReload : 10_000,
        )
      : null
  }

  moveWindow(windowStart: number) {
    this.windowStart = windowStart

    const loadedRange = {
      start: this.value.skip,
      end: this.value.skip + this.value.data.length,
    }
    const requestedRange = {
      start: this.windowStart,
      end: this.windowStart + this.windowSize,
    }

    if (
      requestedRange.start - loadedRange.start < this.loadingEdgeProximity &&
      loadedRange.start > 0
    ) {
      void this.loadBefore()
    } else if (
      loadedRange.end - requestedRange.end < this.loadingEdgeProximity &&
      loadedRange.end < this.value.total
    ) {
      void this.loadAfter()
    }
  }

  setRequestItems(requestItems: LazyListRequestItems<T>) {
    this.requestItems = requestItems
    this.stop()
    this.killSwitch ??= new AbortController()
    return this.enqueueRequest(this.doReload, 'initial-load')
  }

  reload() {
    this.killSwitch ??= new AbortController()
    return this.enqueueRequest(
      this.doReload,
      this.value.state === 'new' ? 'initial-load' : 'reload',
    )
  }

  stop() {
    this.killSwitch?.abort()

    this.killSwitch = null
    this.loadingQueue = null
  }

  private enqueueRequest(
    request: (signal: AbortSignal) => Promise<void>,
    state: LoaderState,
    signal = this.killSwitch?.signal,
  ) {
    if (!signal || signal.aborted) return

    this.loadingQueue = (this.loadingQueue ?? Promise.resolve()).then(async () => {
      try {
        this.update((value) => {
          value.state = state
        })
        await request(signal)
      } catch (error) {
        if (
          !(error instanceof CanceledError) &&
          !(error instanceof DOMException && error.name === 'AbortError')
        ) {
          console.error('Error while loading lazy list items', error)
        }
      } finally {
        this.update((value) => {
          value.state = 'idle'
        })
      }
    })
    return this.loadingQueue
  }

  private hasRequestedLoadAfter = false
  private async loadAfter() {
    if (this.hasRequestedLoadAfter) return

    this.hasRequestedLoadAfter = true
    await this.enqueueRequest(async (signal) => {
      const { skip, total, data: items } = this.value
      if (skip + items.length === total) return

      const response = await this.requestItems(skip + items.length, this.windowSize, signal)

      // If the list has changed, reload. Currently our only option for verifying if the list has changed
      // is checking its size. In the future we may think of a more reliable modification tracking, if necessary.
      if (this.value.total !== response.total) {
        await this.doReload(signal)
      } else {
        this.update((value) => {
          value.data.push(...(response.data as Draft<T>[]))
        })
      }
    }, 'load-more')
    this.hasRequestedLoadAfter = false
  }

  private hasRequestedLoadBefore = false
  private async loadBefore() {
    if (this.hasRequestedLoadBefore) return

    this.hasRequestedLoadBefore = true
    await this.enqueueRequest(async (signal) => {
      const { skip } = this.value
      if (skip === 0) return

      const response = await this.requestItems(
        Math.max(0, skip - this.windowSize),
        Math.min(skip, this.windowSize),
        signal,
      )

      if (this.value.total !== response.total) {
        await this.doReload(signal)
      } else {
        this.update((value) => {
          value.data.unshift(...(response.data as Draft<T>[]))
          value.skip = response.skip
        })
      }
    }, 'load-more')
    this.hasRequestedLoadBefore = false
  }

  private doReload = async (signal: AbortSignal) => {
    const response = await this.requestItems(
      Math.max(0, this.windowStart - this.windowSize),
      Math.min(this.windowStart, this.windowSize) + 2 * this.windowSize,
      signal,
    )

    this.update((value) => {
      value.data = response.data as Draft<T>[]
      value.skip = response.skip
      value.total = response.total
    })

    void this.debounceReload?.(signal)
  }
}
