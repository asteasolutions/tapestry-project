import { isEqual } from 'lodash-es'
import {
  DetailedHTMLProps,
  FC,
  IframeHTMLAttributes,
  Ref,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react'
import { useMediaParams } from 'tapestry-core-client/src/components/tapestry/hooks/use-media-params'
import { Id } from 'tapestry-core/src/data-format/schemas/common'
import { WebpageType } from 'tapestry-core/src/data-format/schemas/item'
import { parseWebSource, WEB_SOURCE_PARSERS } from 'tapestry-core/src/web-sources'
import { WebpageItem } from 'tapestry-core/src/data-format/schemas/item'
import { useTapestryConfig } from '../..'
import { WebpageLoader } from './loader'

const IFRAME_ALLOWED_RESTRICTIONS = [
  'allow-downloads',
  'allow-forms',
  'allow-modals',
  'allow-orientation-lock',
  'allow-pointer-lock',
  'allow-popups',
  'allow-presentation',
  'allow-scripts',
]

export const ALLOWED_ORIGINS = [
  location.origin,
  'https://archive.org',
  'https://youtube.com',
  'https://player.vimeo.com',
]

function sameOriginAllowed(url: string) {
  const { origin } = new URL(url)
  return ALLOWED_ORIGINS.includes(origin)
}

function useSandbox(src: string) {
  return useMemo(() => {
    return sameOriginAllowed(src)
      ? IFRAME_ALLOWED_RESTRICTIONS.concat(['allow-same-origin'])
      : IFRAME_ALLOWED_RESTRICTIONS
  }, [src])
}

export function getPlaybackInterval(params: ReturnType<typeof parseWebSource>) {
  return {
    startTime:
      params.webpageType === 'vimeo' ||
      params.webpageType === 'youtube' ||
      params.webpageType === 'iaAudio' ||
      params.webpageType === 'iaVideo'
        ? params.startTime
        : null,
    stopTime:
      params.webpageType === 'vimeo' || params.webpageType === 'youtube' ? params.stopTime : null,
  }
}

function addAutoplayQueryParam(source: string, webpageType: WebpageType | null | undefined) {
  if (webpageType !== 'youtube' && webpageType !== 'vimeo') return source

  const url = new URL(source)
  url.searchParams.set('autoplay', '1')

  return url.toString()
}

export interface WebpageItemViewerApi {
  reload(): void
}

export interface WebFrameProps extends DetailedHTMLProps<
  IframeHTMLAttributes<HTMLIFrameElement>,
  HTMLIFrameElement
> {
  src: string
  onLoad: () => void
}

export interface WebpageItemViewerProps {
  id: Id
  WebFrame?: 'iframe' | FC<WebFrameProps>
  apiRef?: Ref<WebpageItemViewerApi>
}

export function WebpageItemViewer({ id, apiRef, WebFrame = 'iframe' }: WebpageItemViewerProps) {
  const { useStoreData } = useTapestryConfig()
  const dto = useStoreData(`items.${id}.dto`) as WebpageItem
  const displayWebpage = useStoreData(`items.${id}.hasBeenActive`)
  const [webpageLoaded, setWebpageLoaded] = useState(false)
  const [webpageReloadIndex, setWebpageReloadIndex] = useState(0)
  const webSourceParams = parseWebSource(dto)
  const { startTime, stopTime } = getPlaybackInterval(webSourceParams)
  const [currentPlaybackInterval, setCurrentPlaybackInterval] = useState({ startTime, stopTime })

  const reload = useCallback(() => {
    setWebpageLoaded(false)
    setWebpageReloadIndex((x) => x + 1)
  }, [])

  useImperativeHandle(apiRef, () => ({ reload }))

  if (!isEqual(currentPlaybackInterval, { startTime, stopTime })) {
    setCurrentPlaybackInterval({ startTime, stopTime })
    reload()
  }

  const loading = displayWebpage && !webpageLoaded

  const params = useMediaParams(id)
  const source = dto.webpageType
    ? WEB_SOURCE_PARSERS[dto.webpageType].construct({ source: dto.source, ...params })
    : dto.source

  const src = params.autoplay ? addAutoplayQueryParam(source, dto.webpageType) : source
  const sandbox = useSandbox(src)

  return (
    <WebpageLoader item={dto} displayPage={displayWebpage} pageLoading={!!loading}>
      <WebFrame
        src={src}
        sandbox={sandbox.join(' ')}
        onLoad={() => setWebpageLoaded(true)}
        key={`reload-${webpageReloadIndex}`}
        allowFullScreen
        allow="autoplay"
      />
    </WebpageLoader>
  )
}
