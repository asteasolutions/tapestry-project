import {
  Book,
  Navigation,
  OverlayMetadata,
  Reader,
  createLoader,
} from '@asteasolutions/epub-reader'
import { useRef, useState } from 'react'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { BookItem as BookItemDto } from 'tapestry-core/src/data-format/schemas/item'
import { useTapestryConfig } from '../..'
import { IconButton } from '../../../lib/buttons/index'
import { useAsync } from '../../../lib/hooks/use-async'
import { useResizeObserver } from '../../../lib/hooks/use-resize-observer'
import classes from './styles.module.css'
import { ToCButton } from './toc-button'

interface EPubState {
  reader: Reader
  title: string
  currentChapter: number
  totalChapters: number
  currentPage: number
  totalPages: number
  playing: boolean
  overlayMetadata: OverlayMetadata | null
}

function padZero(num: number) {
  return num > 9 ? `${num}` : `0${num}`
}

function msToHHMMSS(ms: number) {
  let seconds = ms / 1000
  const hours = Math.floor(seconds / 3600)
  seconds = seconds % 3600
  const minutes = Math.floor(seconds / 60)
  seconds = Math.floor(seconds % 60)
  return `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`
}

export interface BookItemViewerProps {
  id: Id
  isZipURL?: boolean
}

export function BookItemViewer({ id, isZipURL }: BookItemViewerProps) {
  const { useStoreData } = useTapestryConfig()
  const { source: epub } = useStoreData(`items.${id}.dto`) as BookItemDto

  const containerRef = useRef<HTMLDivElement>(null)
  const [epubState, setEpubState] = useState<EPubState | undefined>()
  const [cover, setCover] = useState<string>()
  const [showCover, setShowCover] = useState(false)
  const [nav, setNav] = useState<Navigation>()
  const [_selection, setSelection] = useState<Range>()
  const [currentPosition, setCurrentPosition] = useState(0)

  useResizeObserver({
    ref: containerRef,
    callback: () => {
      setEpubState((state) =>
        state
          ? {
              ...state,
              currentPage: state.reader.currentPage,
              totalPages: state.reader.totalPages,
            }
          : undefined,
      )
    },
  })

  useAsync(
    async (_, cleanup) => {
      const loader = await createLoader(epub, { isZipURL })
      let readerAPI: Reader | undefined

      Book.open(loader).subscribe({
        next: (book) => {
          const container = containerRef.current
          if (!container) {
            return
          }
          const reader = new Reader(container, book)
          readerAPI = reader

          book.cover.subscribe(setCover)
          book.nav.subscribe(setNav)

          reader.events.textSelected.subscribe(setSelection)
          reader.mediaOverlayEvents.onGlobalPositionChanged.subscribe(setCurrentPosition)

          reader.loadContent().subscribe(() => {
            setEpubState({
              reader,
              title: book.metadata.title,
              currentChapter: reader.currentChapterIndex,
              totalChapters: reader.totalChapters,
              currentPage: reader.currentPage,
              totalPages: reader.totalPages,
              playing: false,
              overlayMetadata: book.overlayMetadata,
            })
          })

          reader.audioEvents.onPlaybackStateChanged.subscribe((playing) =>
            setEpubState((state) => ({ ...state!, playing })),
          )
          reader.events.pageChange.subscribe(() =>
            setEpubState((state) => ({
              ...state!,
              currentPage: reader.currentPage,
            })),
          )
          reader.events.chapterChange.subscribe(() =>
            setEpubState((state) => ({
              ...state!,
              currentChapter: reader.currentChapterIndex,
              totalPages: reader.totalPages,
            })),
          )
        },
        error: (err) => console.error(`Error loading epub`, err),
      })

      cleanup(() => {
        loader.cancel()
        readerAPI?.destroy()
        setEpubState(undefined)
      })
    },
    [epub, isZipURL],
  )

  return (
    <div className={classes.root}>
      {epubState && (
        <div className="title-bar">
          <div>Chapter {`${epubState.currentChapter + 1} / ${epubState.totalChapters}`}</div>
          <div
            onMouseOver={() => setShowCover(true)}
            onMouseOut={() => setShowCover(false)}
            className="title-container"
          >
            <div>{epubState.title}</div>
          </div>

          <div>Page {`${epubState.currentPage + 1} / ${epubState.totalPages}`}</div>
          {showCover && <img className="cover" src={cover} />}
        </div>
      )}
      <div ref={containerRef} className="epub-container" />
      {epubState && (
        <div>
          <div className="controls-container">
            {nav?.toc && (
              <ToCButton
                onClick={() => {
                  if (epubState.playing) {
                    epubState.reader.togglePlayback()
                  }
                }}
                onSelected={(href) => epubState.reader.goToHref(href).subscribe()}
                toc={nav.toc}
              />
            )}

            <IconButton
              icon="fast_rewind"
              aria-label="Previous chapter"
              onClick={() => epubState.reader.previousChapter()}
            />
            <IconButton
              icon="skip_previous"
              aria-label="Previous page"
              onClick={() => epubState.reader.previousPage()}
            />
            {epubState.overlayMetadata && (
              <IconButton
                icon={epubState.playing ? 'pause_circle' : 'play_circle'}
                aria-label={epubState.playing ? 'Pause' : 'Play'}
                onClick={() => epubState.reader.togglePlayback()}
              />
            )}
            <IconButton
              icon="skip_next"
              aria-label="Next page"
              onClick={() => epubState.reader.nextPage()}
            />
            <IconButton
              icon="fast_forward"
              aria-label="Next chapter"
              onClick={() => epubState.reader.nextChapter()}
            />
          </div>
          {epubState.overlayMetadata && (
            <div className="progress-bar-container">
              <input
                type="range"
                style={{ display: 'block', width: '100%' }}
                min={0}
                max={epubState.overlayMetadata.totalDuration}
                value={currentPosition}
                onChange={(e) => {
                  epubState.reader.goToTime(Number.parseInt(e.target.value))
                }}
              />
              <div>
                {msToHHMMSS(currentPosition)}/{msToHHMMSS(epubState.overlayMetadata.totalDuration)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
