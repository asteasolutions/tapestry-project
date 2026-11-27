import { KNOWN_WEBPAGE_TYPES, WebpageItem, WebpageType } from '../data-format/schemas/item.js'
import { VimeoSourceParser, YoutubeSourceParser } from './video.js'
import { WaybackSourceParser } from './wayback.js'
import { IAMediaSourceParser } from './ia.js'
import { GoogleDriveSourceParser } from './google-drive.js'

export interface BaseWebSourceParams {
  source: string
}

export interface WebSourceParser<
  T extends WebpageType | null = WebpageType | null,
  P extends BaseWebSourceParams = BaseWebSourceParams,
> {
  readonly webpageType: T

  matches(url: string): Promise<boolean>
  parse(url: string): P
  construct(params: P): string
}

class UnknownWebSourceParser implements WebSourceParser<null> {
  readonly webpageType = null

  matches(_url: string) {
    return Promise.resolve(true)
  }
  parse(url: string): BaseWebSourceParams {
    return { source: url }
  }
  construct({ source }: BaseWebSourceParams) {
    return source
  }
}

type ParserName = WebpageType | 'unknown'
type MapParserNameToWebpageType<N extends ParserName> = Exclude<
  'unknown' extends N ? N | null : N,
  'unknown'
>

type ParsersMap = {
  [N in ParserName]: WebSourceParser<MapParserNameToWebpageType<N>>
}

export const WEBPAGE_TYPE_LABELS: Record<WebpageType, string> = {
  youtube: 'YouTube video',
  vimeo: 'Vimeo',
  iaVideo: 'Internet Archive video',
  iaAudio: 'Internet Archive audio',
  iaWayback: 'Wayback Machine page',
  googleDrive: 'Web page (Google Drive)',
  googleDriveVideo: 'Video (Google Drive)',
  googleDriveAudio: 'Audio (Google Drive)',
  googleDriveImage: 'Image (Google Drive)',
  googleDrivePdf: 'PDF (Google Drive)',
  googleDriveBook: 'Book (Google Drive)',
}

export const WEB_SOURCE_PARSERS = {
  youtube: new YoutubeSourceParser(),
  vimeo: new VimeoSourceParser(),
  iaWayback: new WaybackSourceParser(),
  iaAudio: new IAMediaSourceParser('audio', 'iaAudio'),
  iaVideo: new IAMediaSourceParser('movies', 'iaVideo'),
  googleDrive: new GoogleDriveSourceParser('googleDrive'),
  googleDriveVideo: new GoogleDriveSourceParser('googleDriveVideo'),
  googleDriveAudio: new GoogleDriveSourceParser('googleDriveAudio'),
  googleDriveImage: new GoogleDriveSourceParser('googleDriveImage'),
  googleDrivePdf: new GoogleDriveSourceParser('googleDrivePdf'),
  googleDriveBook: new GoogleDriveSourceParser('googleDriveBook'),
  unknown: new UnknownWebSourceParser(),
} satisfies ParsersMap

type WebSourceParams<Parser> =
  Parser extends WebSourceParser<infer W, infer P> ? { webpageType: W } & P : never

export function parseWebSource<T extends WebpageType | 'unknown'>(
  dto: WebpageItem &
    ('unknown' extends T ? { webpageType?: Exclude<T, 'unknown'> | null } : { webpageType: T }),
) {
  const parser = WEB_SOURCE_PARSERS[dto.webpageType ?? 'unknown']
  return {
    webpageType: parser.webpageType,
    ...parser.parse(dto.source),
  } as WebSourceParams<(typeof WEB_SOURCE_PARSERS)[T]>
}

export async function findWebSourceParser(source: string) {
  for (const type of KNOWN_WEBPAGE_TYPES) {
    const parser = WEB_SOURCE_PARSERS[type]
    if (await parser.matches(source)) {
      return parser
    }
  }

  return WEB_SOURCE_PARSERS.unknown
}

export async function determineWebpageType(source: string) {
  return (await findWebSourceParser(source)).webpageType
}
